import { computed, markRaw, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import type { DesignTokens, LayoutMode, Platform, Project } from '@/types/project'
import type { RequirementAnalysis } from '@/types/analysis'
import type { Page } from '@/types/page'
import type { ParsedDocument } from '@/types/parsing'
import { getStylePreset, stylePresets } from '@/data/stylePresets'
import { mergeDocuments, parseFile } from '@/services/parsing'
import {
  analyzeRequirements,
  MAX_ANALYSIS_IMAGES,
} from '@/services/generation/analyzeRequirements'
import { db, type SourceDoc, type StoredAsset } from '@/services/storage/db'
import { assetRepo, docRepo, pageRepo, projectRepo } from '@/services/storage/repositories'
import { estimateTokens, truncateStructured } from '@/utils/tokenBudget'
import { useSettingsStore } from './settings'

export interface WizardFile {
  id: string
  file: File
  status: 'parsing' | 'done' | 'error'
  error?: string
  doc?: ParsedDocument
}

export const useCreateWizardStore = defineStore('createWizard', () => {
  const settings = useSettingsStore()

  const step = ref(1)
  const projectName = ref('')
  const platform = ref<Platform>('pc')
  const presetId = ref(stylePresets[0]!.id)
  const tokens = ref<DesignTokens>({ ...stylePresets[0]!.tokens })
  const customNotes = ref('')
  const layout = ref<LayoutMode>('auto')
  const layoutNotes = ref('')
  const customStyleText = ref('')

  const files = ref<WizardFile[]>([])
  const selectedImageIds = ref<string[]>([])

  const analyzing = ref(false)
  const streamText = ref('')
  const reasoningText = ref('')
  const analysisError = ref('')
  const analysis = ref<RequirementAnalysis | null>(null)
  let abortCtl: AbortController | null = null

  const availablePresets = computed(() =>
    stylePresets.filter((p) => p.platforms.includes(platform.value)),
  )

  function applyPreset(id: string) {
    if (id === 'custom') {
      presetId.value = 'custom'
      return
    }
    const preset = getStylePreset(id)
    if (!preset) return
    presetId.value = id
    tokens.value = { ...preset.tokens }
  }

  watch(platform, () => {
    layout.value = 'auto'
    if (
      presetId.value !== 'custom' &&
      !availablePresets.value.some((p) => p.id === presetId.value)
    ) {
      applyPreset(availablePresets.value[0]!.id)
    }
  })

  const parsedDocs = computed(() =>
    files.value.filter((f) => f.status === 'done' && f.doc).map((f) => f.doc!),
  )
  const allImages = computed(() => parsedDocs.value.flatMap((d) => d.images))
  const selectedImages = computed(() =>
    allImages.value.filter((img) => selectedImageIds.value.includes(img.id)),
  )
  const mergedText = computed(() =>
    parsedDocs.value.length ? mergeDocuments(parsedDocs.value).text : '',
  )
  const totalTokens = computed(() => estimateTokens(mergedText.value))
  const overBudget = computed(() => totalTokens.value > settings.genParams.analysisInputBudget)
  const canAnalyze = computed(
    () =>
      parsedDocs.value.length > 0 &&
      (mergedText.value.trim().length > 0 || selectedImages.value.length > 0),
  )

  async function addFiles(list: File[]) {
    for (const file of list) {
      if (files.value.some((f) => f.file.name === file.name && f.file.size === file.size)) continue
      const wf = reactive<WizardFile>({ id: nanoid(), file: markRaw(file), status: 'parsing' })
      files.value.push(wf)
      try {
        const doc = await parseFile(file)
        wf.doc = markRaw(doc)
        wf.status = 'done'
        for (const img of doc.images) {
          if (selectedImageIds.value.length >= MAX_ANALYSIS_IMAGES) break
          selectedImageIds.value.push(img.id)
        }
      } catch (e) {
        wf.status = 'error'
        wf.error = (e as Error).message
      }
    }
  }

  function removeFile(id: string) {
    const wf = files.value.find((f) => f.id === id)
    if (!wf) return
    const removed = new Set((wf.doc?.images ?? []).map((i) => i.id))
    selectedImageIds.value = selectedImageIds.value.filter((i) => !removed.has(i))
    files.value = files.value.filter((f) => f.id !== id)
  }

  function toggleImage(id: string) {
    const idx = selectedImageIds.value.indexOf(id)
    if (idx >= 0) selectedImageIds.value.splice(idx, 1)
    else if (selectedImageIds.value.length < MAX_ANALYSIS_IMAGES) selectedImageIds.value.push(id)
  }

  async function runAnalysis() {
    const resolved = settings.resolveModel('analysis')
    if (!resolved) {
      analysisError.value = '尚未配置「需求理解模型」，请先到设置页完成配置'
      return
    }
    analyzing.value = true
    analysisError.value = ''
    streamText.value = ''
    reasoningText.value = ''
    abortCtl = new AbortController()
    try {
      const { text } = truncateStructured(
        mergedText.value,
        settings.genParams.analysisInputBudget,
      )
      const result = await analyzeRequirements({
        provider: resolved.provider,
        model: resolved.model,
        platform: platform.value,
        docText: text,
        images: selectedImages.value,
        signal: abortCtl.signal,
        onDelta: (t) => {
          streamText.value += t
        },
        onReasoningDelta: (t) => {
          reasoningText.value += t
        },
      })
      analysis.value = result
      if (!projectName.value.trim()) projectName.value = result.productName
      step.value = 5
    } catch (e) {
      analysisError.value = (e as Error).message
    } finally {
      analyzing.value = false
      abortCtl = null
    }
  }

  function cancelAnalysis() {
    abortCtl?.abort()
  }

  async function createProject(): Promise<string> {
    if (!analysis.value) throw new Error('需求理解结果为空')
    const a = JSON.parse(JSON.stringify(analysis.value)) as RequirementAnalysis
    const projectId = nanoid()
    const now = Date.now()
    const project: Project = {
      id: projectId,
      name: projectName.value.trim() || a.productName,
      platform: platform.value,
      styleSpec: {
        presetId: presetId.value,
        tokens: { ...tokens.value },
        layout: layout.value,
        layoutNotes: layoutNotes.value.trim() || undefined,
        customStyleText:
          presetId.value === 'custom' ? customStyleText.value.trim() || undefined : undefined,
        customNotes: customNotes.value.trim() || undefined,
      },
      analysis: a,
      createdAt: now,
      updatedAt: now,
    }
    const pages: Page[] = a.pages.map((spec, i) => ({
      id: nanoid(),
      projectId,
      spec,
      sortOrder: i,
      genStatus: 'idle',
      updatedAt: now,
    }))
    const docs: SourceDoc[] = []
    const assets: StoredAsset[] = []
    for (const f of files.value) {
      if (f.status !== 'done' || !f.doc) continue
      const docId = nanoid()
      docs.push({
        id: docId,
        projectId,
        fileName: f.doc.fileName,
        fileType: f.doc.fileType,
        text: f.doc.text,
        meta: f.doc.meta,
      })
      for (const img of f.doc.images) {
        assets.push({
          id: img.id,
          projectId,
          docId,
          mimeType: img.mimeType,
          blob: img.blob,
          origin: img.origin,
        })
      }
    }
    await db.transaction('rw', [db.projects, db.pages, db.sourceDocs, db.assets], async () => {
      await projectRepo.create(project)
      await pageRepo.bulkCreate(pages)
      if (docs.length) await docRepo.bulkCreate(docs)
      if (assets.length) await assetRepo.bulkCreate(assets)
    })
    return projectId
  }

  function reset() {
    step.value = 1
    projectName.value = ''
    platform.value = 'pc'
    applyPreset(stylePresets[0]!.id)
    customNotes.value = ''
    layout.value = 'auto'
    layoutNotes.value = ''
    customStyleText.value = ''
    files.value = []
    selectedImageIds.value = []
    analyzing.value = false
    streamText.value = ''
    reasoningText.value = ''
    analysisError.value = ''
    analysis.value = null
  }

  return {
    step,
    projectName,
    platform,
    presetId,
    tokens,
    customNotes,
    layout,
    layoutNotes,
    customStyleText,
    files,
    selectedImageIds,
    availablePresets,
    parsedDocs,
    allImages,
    selectedImages,
    mergedText,
    totalTokens,
    overBudget,
    canAnalyze,
    analyzing,
    streamText,
    reasoningText,
    analysisError,
    analysis,
    applyPreset,
    addFiles,
    removeFile,
    toggleImage,
    runAnalysis,
    cancelAnalysis,
    createProject,
    reset,
  }
})
