import type { ChatMessage, ChatRequest } from '@/types/llm'
import type { PageSpec } from '@/types/analysis'
import type { Platform, StyleSpec } from '@/types/project'
import type { ProviderConfig } from '@/types/provider'
import { buildRepairPrompt } from '@/prompts/common'
import {
  buildPageSystemPrompt,
  buildPageUserPrompt,
  type PagePromptContext,
} from '@/prompts/pageGeneration'
import { buildStyleFragment } from '@/prompts/stylePrompt'
import { LLMError } from '../llm/errors'
import { createClient } from '../llm/factory'
import { extractHtml } from '../llm/htmlExtract'
import type { ChatOptions, LLMClient } from '../llm/types'
import { normalizeHtml } from './normalizeHtml'

const MAX_TOKENS_CEILING = 32000

/** 共享的「对话 → 截断重试 → 解析失败自修复」HTML 生成流程 */
export async function chatForHtml(
  client: LLMClient,
  request: Omit<ChatRequest, 'messages'>,
  messages: ChatMessage[],
  callbacks: ChatOptions,
): Promise<string> {
  let result = await client.chat({ ...request, messages }, callbacks)
  if (result.finishReason === 'length') {
    callbacks.onDelta?.('\n\n[输出被截断，正在以更大的 maxTokens 重试…]\n\n')
    const bumped = Math.min(MAX_TOKENS_CEILING, Math.round(request.maxTokens * 1.5))
    result = await client.chat({ ...request, maxTokens: bumped, messages }, callbacks)
    if (result.finishReason === 'length') {
      throw new LLMError(
        'bad_request',
        '页面 HTML 超出 maxTokens 被截断，请在设置中调大「生成 maxTokens」后重试',
      )
    }
  }
  try {
    return extractHtml(result.text)
  } catch (e) {
    if (!(e instanceof LLMError) || callbacks.signal?.aborted) throw e
    callbacks.onDelta?.('\n\n[输出无法解析，正在请求模型修正…]\n\n')
    const repair = await client.chat(
      {
        ...request,
        messages: [
          ...messages,
          { role: 'assistant', content: result.text.slice(-1500) || '（空输出）' },
          { role: 'user', content: buildRepairPrompt(e.message) },
        ],
      },
      callbacks,
    )
    return extractHtml(repair.text)
  }
}

export interface GeneratePageInput {
  provider: ProviderConfig
  model: string
  platform: Platform
  styleSpec: StyleSpec
  page: PageSpec
  context: PagePromptContext
  maxTokens: number
  temperature: number
  tailwindCdnUrl: string
  signal?: AbortSignal
  onDelta?: ChatOptions['onDelta']
  onReasoningDelta?: ChatOptions['onReasoningDelta']
}

export async function generatePageHtml(input: GeneratePageInput): Promise<string> {
  const client = createClient(input.provider)
  const styleFragment = buildStyleFragment(input.styleSpec, input.platform)
  const callbacks: ChatOptions = {
    signal: input.signal,
    onDelta: input.onDelta,
    onReasoningDelta: input.onReasoningDelta,
  }
  const html = await chatForHtml(
    client,
    {
      model: input.model,
      system: buildPageSystemPrompt(styleFragment, input.platform),
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    },
    [{ role: 'user', content: buildPageUserPrompt(input.page, input.context) }],
    callbacks,
  )
  return normalizeHtml(html, {
    tokens: input.styleSpec.tokens,
    platform: input.platform,
    tailwindCdnUrl: input.tailwindCdnUrl,
  })
}
