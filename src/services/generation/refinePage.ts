import type { ChatMessage, ContentPart } from '@/types/llm'
import type { ExtractedImage } from '@/types/parsing'
import type { Platform, StyleSpec } from '@/types/project'
import type { ProviderConfig } from '@/types/provider'
import { blobToBase64 } from '@/utils/blob'
import { buildRefineSystemPrompt, buildRefineUserPrompt } from '@/prompts/pageRefine'
import { buildStyleFragment } from '@/prompts/stylePrompt'
import { createClient } from '../llm/factory'
import type { ChatOptions } from '../llm/types'
import { chatForHtml } from './generatePage'
import { normalizeHtml } from './normalizeHtml'

export interface RefinePageInput {
  provider: ProviderConfig
  model: string
  platform: Platform
  styleSpec: StyleSpec
  currentHtml: string
  feedback: string
  /** 参考图（需视觉模型） */
  images?: ExtractedImage[]
  maxTokens: number
  temperature: number
  tailwindCdnUrl: string
  signal?: AbortSignal
  onDelta?: ChatOptions['onDelta']
  onReasoningDelta?: ChatOptions['onReasoningDelta']
}

export async function refinePageHtml(input: RefinePageInput): Promise<string> {
  const client = createClient(input.provider)
  const styleFragment = buildStyleFragment(input.styleSpec, input.platform)
  const images = input.images ?? []
  const userText = buildRefineUserPrompt(input.currentHtml, input.feedback, images.length)

  let content: ChatMessage['content'] = userText
  if (images.length > 0) {
    const parts: ContentPart[] = [{ type: 'text', text: userText }]
    for (const img of images) {
      parts.push({ type: 'image', mimeType: img.mimeType, base64: await blobToBase64(img.blob) })
    }
    content = parts
  }

  const html = await chatForHtml(
    client,
    {
      model: input.model,
      system: buildRefineSystemPrompt(styleFragment, input.platform),
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    },
    [{ role: 'user', content }],
    {
      signal: input.signal,
      onDelta: input.onDelta,
      onReasoningDelta: input.onReasoningDelta,
    },
  )
  return normalizeHtml(html, {
    tokens: input.styleSpec.tokens,
    platform: input.platform,
    tailwindCdnUrl: input.tailwindCdnUrl,
  })
}
