import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { ChatMessage, ContentPart } from '@/types/llm'
import type { Platform } from '@/types/project'
import type { PageSpec, RequirementAnalysis } from '@/types/analysis'
import type { ExtractedImage } from '@/types/parsing'
import type { ProviderConfig } from '@/types/provider'
import { blobToBase64 } from '@/utils/blob'
import { buildRepairPrompt } from '@/prompts/common'
import { buildAnalysisSystemPrompt, buildAnalysisUserText } from '@/prompts/requirementAnalysis'
import { LLMError } from '../llm/errors'
import { createClient } from '../llm/factory'
import { parseJsonLoose } from '../llm/jsonExtract'
import type { ChatOptions } from '../llm/types'

export const MAX_ANALYSIS_IMAGES = 8

const rawSchema = z.object({
  productName: z.string().catch('未命名产品'),
  overview: z.string().catch(''),
  targetUsers: z.string().optional().catch(undefined),
  pages: z
    .array(
      z.object({
        name: z.string(),
        parent: z.string().catch(''),
        description: z.string().catch(''),
        blocks: z.array(z.string()).catch([]),
      }),
    )
    .min(1, '页面清单为空'),
})

function normalize(raw: z.infer<typeof rawSchema>): RequirementAnalysis {
  const cleaned = raw.pages.map((p) => ({
    name: p.name.trim() || '未命名页面',
    parent: p.parent.trim(),
    description: p.description.trim(),
    blocks: p.blocks.map((b) => b.trim()).filter(Boolean).slice(0, 12),
  }))

  const pages: PageSpec[] = []
  const topByName = new Map<string, PageSpec>()

  for (const p of cleaned) {
    if (p.parent && p.parent !== p.name) continue
    const spec: PageSpec = {
      id: nanoid(),
      name: p.name,
      description: p.description,
      blocks: p.blocks,
    }
    pages.push(spec)
    if (!topByName.has(spec.name)) topByName.set(spec.name, spec)
  }

  for (const p of cleaned) {
    if (!p.parent || p.parent === p.name) continue
    let parent = topByName.get(p.parent)
    if (!parent) {
      // LLM 只在 parent 中引用、未单独列出的一级菜单 → 自动创建为纯分组
      parent = {
        id: nanoid(),
        name: p.parent,
        groupOnly: true,
        description: '',
        blocks: [],
      }
      pages.push(parent)
      topByName.set(parent.name, parent)
    }
    pages.push({
      id: nanoid(),
      name: p.name,
      parentId: parent.id,
      description: p.description,
      blocks: p.blocks,
    })
  }

  // 重排：每个一级菜单后紧跟其二级页面
  const ordered: PageSpec[] = []
  for (const top of pages.filter((p) => !p.parentId)) {
    ordered.push(top)
    for (const child of pages.filter((p) => p.parentId === top.id)) ordered.push(child)
  }

  return {
    productName: raw.productName.trim() || '未命名产品',
    overview: raw.overview.trim(),
    targetUsers: raw.targetUsers?.trim() || undefined,
    pages: ordered,
  }
}

function parseAnalysis(text: string): RequirementAnalysis {
  const json = parseJsonLoose(text)
  const parsed = rawSchema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new LLMError('parse', `JSON 结构不符合要求：${issue?.path.join('.')} ${issue?.message}`)
  }
  return normalize(parsed.data)
}

export interface AnalyzeInput {
  provider: ProviderConfig
  model: string
  platform: Platform
  docText: string
  images: ExtractedImage[]
  signal?: AbortSignal
  onDelta?: ChatOptions['onDelta']
  onReasoningDelta?: ChatOptions['onReasoningDelta']
}

export async function analyzeRequirements(input: AnalyzeInput): Promise<RequirementAnalysis> {
  const client = createClient(input.provider)
  const images = input.images.slice(0, MAX_ANALYSIS_IMAGES)
  const userText = buildAnalysisUserText(input.docText, images.length)

  let content: ChatMessage['content'] = userText
  if (images.length > 0) {
    const parts: ContentPart[] = [{ type: 'text', text: userText }]
    for (const img of images) {
      parts.push({ type: 'image', mimeType: img.mimeType, base64: await blobToBase64(img.blob) })
    }
    content = parts
  }

  const baseMessages: ChatMessage[] = [{ role: 'user', content }]
  const callbacks: ChatOptions = {
    signal: input.signal,
    onDelta: input.onDelta,
    onReasoningDelta: input.onReasoningDelta,
  }
  const request = {
    model: input.model,
    system: buildAnalysisSystemPrompt(input.platform),
    maxTokens: 8000,
    temperature: 0.3,
    jsonMode: true,
  }

  let firstRaw = ''
  try {
    const result = await client.chat({ ...request, messages: baseMessages }, callbacks)
    firstRaw = result.text
    return parseAnalysis(firstRaw)
  } catch (e) {
    if (!(e instanceof LLMError) || e.kind !== 'parse' || input.signal?.aborted) throw e
    input.onDelta?.('\n\n[输出解析失败，正在请求模型修正…]\n\n')
    const repair = await client.chat(
      {
        ...request,
        messages: [
          ...baseMessages,
          { role: 'assistant', content: firstRaw.slice(-2000) || '（空输出）' },
          { role: 'user', content: buildRepairPrompt(e.message) },
        ],
      },
      callbacks,
    )
    return parseAnalysis(repair.text)
  }
}
