import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import type { PageSpec } from '@/types/analysis'
import type { Page, PageVersion } from '@/types/page'
import type { ExtractedImage } from '@/types/parsing'
import type { Project } from '@/types/project'
import { LLMError } from '@/services/llm/errors'
import { generatePageHtml } from '@/services/generation/generatePage'
import { refinePageHtml } from '@/services/generation/refinePage'
import { GenerationScheduler } from '@/services/generation/scheduler'
import {
  loadWorkbench,
  pageRepo,
  projectRepo,
  versionRepo,
} from '@/services/storage/repositories'
import { useSettingsStore } from './settings'

export interface StreamState {
  text: string
  reasoning: string
}

export interface RefineChatEntry {
  id: string
  role: 'user' | 'assistant'
  text: string
  failed?: boolean
}

function plainClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const useWorkbenchStore = defineStore('workbench', () => {
  const settings = useSettingsStore()

  const project = ref<Project | null>(null)
  const pages = ref<Page[]>([])
  const htmlByPage = reactive(new Map<string, string>())
  const streams = reactive(new Map<string, StreamState>())
  const selectedPageId = ref<string | null>(null)
  const versions = ref<PageVersion[]>([])
  const loading = ref(false)
  const loadError = ref('')

  const refining = ref(false)
  const refineStream = reactive<StreamState>({ text: '', reasoning: '' })
  const refineChats = reactive(new Map<string, RefineChatEntry[]>())
  let refineAbort: AbortController | null = null

  let scheduler: GenerationScheduler | null = null

  const selectedPage = computed(
    () => pages.value.find((p) => p.id === selectedPageId.value) ?? null,
  )
  const selectedHtml = computed(() =>
    selectedPageId.value ? (htmlByPage.get(selectedPageId.value) ?? '') : '',
  )
  const selectedStream = computed(() =>
    selectedPageId.value ? (streams.get(selectedPageId.value) ?? null) : null,
  )
  const selectedChat = computed(() => {
    if (!selectedPageId.value) return []
    let chat = refineChats.get(selectedPageId.value)
    if (!chat) {
      chat = []
      refineChats.set(selectedPageId.value, chat)
    }
    return chat
  })

  const progress = computed(() => {
    const real = pages.value.filter((p) => !p.spec.groupOnly)
    const total = real.length
    const done = real.filter((p) => p.genStatus === 'done').length
    const active = real.filter(
      (p) => p.genStatus === 'generating' || p.genStatus === 'queued',
    ).length
    const failed = real.filter((p) => p.genStatus === 'failed').length
    return { total, done, active, failed }
  })

  /** 两级菜单树：一级（含纯分组）+ 其二级页面；父级丢失的孤儿按一级展示 */
  const menuGroups = computed(() => {
    const tops = pages.value.filter((p) => !p.spec.parentId)
    const topSpecIds = new Set(tops.map((t) => t.spec.id))
    const groups = tops.map((top) => ({
      top,
      children: pages.value.filter((p) => p.spec.parentId === top.spec.id),
    }))
    for (const orphan of pages.value.filter(
      (p) => p.spec.parentId && !topSpecIds.has(p.spec.parentId),
    )) {
      groups.push({ top: orphan, children: [] })
    }
    return groups
  })

  function buildMenuTreeText(): string {
    const lines: string[] = []
    for (const { top, children } of menuGroups.value) {
      lines.push(`- ${top.spec.name}${top.spec.groupOnly ? '（分组，无独立页面）' : ''}`)
      for (const child of children) lines.push(`  - ${child.spec.name}`)
    }
    return lines.join('\n')
  }

  function pageOf(pageId: string): Page | undefined {
    return pages.value.find((p) => p.id === pageId)
  }

  function setPageStatus(
    pageId: string,
    status: 'queued' | 'generating' | 'failed',
    error?: string,
  ): void {
    const page = pageOf(pageId)
    if (!page) return
    if (status === 'failed' && error === '已取消') {
      page.genStatus = htmlByPage.has(pageId) ? 'done' : 'idle'
      page.errorMessage = undefined
      streams.delete(pageId)
      void pageRepo.update(pageId, { genStatus: page.genStatus, errorMessage: undefined })
      return
    }
    page.genStatus = status
    page.errorMessage = error
    if (status === 'generating') streams.set(pageId, { text: '', reasoning: '' })
    if (status === 'failed') {
      streams.delete(pageId)
      void pageRepo.update(pageId, { genStatus: 'failed', errorMessage: error })
    }
  }

  function resolveGenerationModel() {
    const resolved = settings.resolveModel('generation', project.value?.modelOverride ?? undefined)
    if (!resolved) {
      throw new LLMError('bad_request', '未配置「页面生成模型」，请先到设置页配置')
    }
    return resolved
  }

  function makeScheduler(): GenerationScheduler {
    return new GenerationScheduler({
      concurrency: () => settings.genParams.concurrency,
      generate: (page, signal, onDelta, onReasoningDelta) => {
        const resolved = resolveGenerationModel()
        const proj = project.value!
        const analysis = proj.analysis
        return generatePageHtml({
          provider: resolved.provider,
          model: resolved.model,
          platform: proj.platform,
          styleSpec: proj.styleSpec,
          page: plainClone(page.spec),
          context: {
            productName: analysis?.productName ?? proj.name,
            overview: analysis?.overview ?? '',
            targetUsers: analysis?.targetUsers,
            menuTree: buildMenuTreeText(),
            parentName: page.spec.parentId
              ? pages.value.find((p) => p.spec.id === page.spec.parentId)?.spec.name
              : undefined,
          },
          maxTokens: settings.genParams.maxTokens,
          temperature: settings.genParams.temperature,
          tailwindCdnUrl: settings.genParams.tailwindCdnUrl,
          signal,
          onDelta,
          onReasoningDelta,
        })
      },
      callbacks: {
        onStatus: setPageStatus,
        onDelta: (pageId, t) => {
          const s = streams.get(pageId)
          if (s) s.text += t
        },
        onReasoningDelta: (pageId, t) => {
          const s = streams.get(pageId)
          if (s) s.reasoning += t
        },
        onSuccess: async (pageId, html) => {
          const version = await versionRepo.add(pageId, html, 'generate')
          htmlByPage.set(pageId, html)
          const page = pageOf(pageId)
          if (page) {
            page.genStatus = 'done'
            page.errorMessage = undefined
            page.currentVersionId = version.id
          }
          streams.delete(pageId)
          if (selectedPageId.value === pageId) void loadVersions()
        },
      },
    })
  }

  async function load(projectId: string, autostart = false): Promise<void> {
    loading.value = true
    loadError.value = ''
    try {
      scheduler?.cancelAll()
      const data = await loadWorkbench(projectId)
      if (!data) {
        loadError.value = '项目不存在或已被删除'
        project.value = null
        pages.value = []
        return
      }
      project.value = data.project
      pages.value = data.pages
      htmlByPage.clear()
      for (const [k, v] of data.htmlByPage) htmlByPage.set(k, v)
      streams.clear()
      refineChats.clear()
      scheduler = makeScheduler()
      selectedPageId.value =
        data.pages.find((p) => !p.spec.groupOnly)?.id ?? data.pages[0]?.id ?? null
      await loadVersions()
      if (autostart) {
        generatePages(pages.value.filter((p) => p.genStatus !== 'done').map((p) => p.id))
      }
    } finally {
      loading.value = false
    }
  }

  function generatePages(pageIds: string[]): void {
    if (!scheduler) return
    const targets = pageIds
      .map((id) => pageOf(id))
      .filter((p): p is Page => !!p && !p.spec.groupOnly && !scheduler!.isActive(p.id))
    if (targets.length) scheduler.enqueue(targets)
  }

  function regenerateSelected(): void {
    if (selectedPageId.value) generatePages([selectedPageId.value])
  }

  function retryFailed(): void {
    generatePages(pages.value.filter((p) => p.genStatus === 'failed').map((p) => p.id))
  }

  function cancelPage(pageId: string): void {
    scheduler?.cancel(pageId)
  }

  function cancelAll(): void {
    scheduler?.cancelAll()
  }

  function selectPage(pageId: string): void {
    selectedPageId.value = pageId
    void loadVersions()
  }

  async function loadVersions(): Promise<void> {
    versions.value = selectedPageId.value
      ? await versionRepo.listByPage(selectedPageId.value)
      : []
  }

  async function refineSelected(feedback: string, images?: ExtractedImage[]): Promise<void> {
    const page = selectedPage.value
    const currentHtml = selectedHtml.value
    if (!page || !currentHtml || refining.value) return
    const chat = selectedChat.value
    const imageNote = images?.length ? `（附 ${images.length} 张参考图）` : ''
    chat.push({ id: nanoid(), role: 'user', text: feedback + imageNote })
    refining.value = true
    refineStream.text = ''
    refineStream.reasoning = ''
    refineAbort = new AbortController()
    try {
      const resolved = resolveGenerationModel()
      const proj = project.value!
      const html = await refinePageHtml({
        provider: resolved.provider,
        model: resolved.model,
        platform: proj.platform,
        styleSpec: proj.styleSpec,
        currentHtml,
        feedback,
        images,
        maxTokens: settings.genParams.maxTokens,
        temperature: settings.genParams.temperature,
        tailwindCdnUrl: settings.genParams.tailwindCdnUrl,
        signal: refineAbort.signal,
        onDelta: (t) => {
          refineStream.text += t
        },
        onReasoningDelta: (t) => {
          refineStream.reasoning += t
        },
      })
      const version = await versionRepo.add(page.id, html, 'refine', feedback)
      htmlByPage.set(page.id, html)
      page.currentVersionId = version.id
      page.genStatus = 'done'
      page.errorMessage = undefined
      await loadVersions()
      chat.push({ id: nanoid(), role: 'assistant', text: `已更新到 v${version.versionNumber}` })
    } catch (e) {
      const isAbort =
        (e instanceof LLMError && e.kind === 'abort') ||
        (e instanceof DOMException && e.name === 'AbortError')
      chat.push({
        id: nanoid(),
        role: 'assistant',
        text: isAbort ? '已取消' : `修改失败：${(e as Error).message}`,
        failed: !isAbort,
      })
    } finally {
      refining.value = false
      refineAbort = null
      refineStream.text = ''
      refineStream.reasoning = ''
    }
  }

  function cancelRefine(): void {
    refineAbort?.abort()
  }

  async function rollbackTo(version: PageVersion): Promise<void> {
    const restored = await versionRepo.add(version.pageId, version.html, 'rollback')
    htmlByPage.set(version.pageId, version.html)
    const page = pageOf(version.pageId)
    if (page) {
      page.currentVersionId = restored.id
      page.genStatus = 'done'
    }
    await loadVersions()
  }

  async function updateSelectedSpec(spec: PageSpec): Promise<void> {
    const page = selectedPage.value
    if (!page) return
    page.spec = plainClone(spec)
    await pageRepo.update(page.id, { spec: page.spec })
  }

  /** 新增页面：parentSpecId 为空 = 一级菜单；groupOnly = 仅分组 */
  async function addPage(
    name: string,
    parentSpecId?: string,
    groupOnly = false,
  ): Promise<void> {
    const proj = project.value
    if (!proj) return
    const specId = nanoid()
    const page: Page = {
      id: specId,
      projectId: proj.id,
      spec: {
        id: specId,
        name,
        parentId: parentSpecId || undefined,
        groupOnly: groupOnly || undefined,
        description: '',
        blocks: [],
      },
      sortOrder: (pages.value.at(-1)?.sortOrder ?? 0) + 1,
      genStatus: 'idle',
      updatedAt: Date.now(),
    }
    await pageRepo.create(plainClone(page))
    pages.value.push(page)
    if (!groupOnly) selectPage(page.id)
  }

  async function removePage(pageId: string): Promise<void> {
    scheduler?.cancel(pageId)
    await pageRepo.remove(pageId)
    pages.value = pages.value.filter((p) => p.id !== pageId)
    htmlByPage.delete(pageId)
    streams.delete(pageId)
    refineChats.delete(pageId)
    if (selectedPageId.value === pageId) {
      selectedPageId.value = pages.value[0]?.id ?? null
      await loadVersions()
    }
  }

  async function renameProject(name: string): Promise<void> {
    if (!project.value) return
    project.value.name = name
    await projectRepo.update(project.value.id, { name })
  }

  return {
    project,
    pages,
    htmlByPage,
    streams,
    selectedPageId,
    selectedPage,
    selectedHtml,
    selectedStream,
    selectedChat,
    versions,
    loading,
    loadError,
    refining,
    refineStream,
    progress,
    menuGroups,
    load,
    generatePages,
    regenerateSelected,
    retryFailed,
    cancelPage,
    cancelAll,
    selectPage,
    refineSelected,
    cancelRefine,
    rollbackTo,
    updateSelectedSpec,
    addPage,
    removePage,
    renameProject,
  }
})
