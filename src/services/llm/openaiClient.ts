import type { ChatRequest, ChatResult, ContentPart, FinishReason } from '@/types/llm'
import type { ProviderConfig } from '@/types/provider'
import { classifyFetchError, errorFromResponse, LLMError } from './errors'
import { parseSSE } from './sse'
import { buildEndpoint, IDLE_TIMEOUT_MS, type ChatOptions, type LLMClient } from './types'

function toOpenAIContent(content: string | ContentPart[]): unknown {
  if (typeof content === 'string') return content
  return content.map((part) =>
    part.type === 'text'
      ? { type: 'text', text: part.text }
      : {
          type: 'image_url',
          image_url: { url: `data:${part.mimeType};base64,${part.base64}` },
        },
  )
}

interface StreamChunk {
  choices?: {
    delta?: { content?: string; reasoning_content?: string }
    finish_reason?: string | null
  }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null
}

function mapFinishReason(reason: string | null | undefined): FinishReason | null {
  if (!reason) return null
  if (reason === 'stop') return 'stop'
  if (reason === 'length') return 'length'
  return 'other'
}

export class OpenAIClient implements LLMClient {
  constructor(private provider: ProviderConfig) {}

  async chat(req: ChatRequest, opts: ChatOptions = {}): Promise<ChatResult> {
    try {
      return await this.doChat(req, !!req.jsonMode, opts)
    } catch (e) {
      // 部分兼容服务商不支持 response_format，去掉后重试一次
      if (req.jsonMode && e instanceof LLMError && e.kind === 'bad_request') {
        return this.doChat(req, false, opts)
      }
      throw e
    }
  }

  private async doChat(req: ChatRequest, jsonMode: boolean, opts: ChatOptions): Promise<ChatResult> {
    const messages: unknown[] = []
    if (req.system) messages.push({ role: 'system', content: req.system })
    for (const m of req.messages) {
      messages.push({ role: m.role, content: toOpenAIContent(m.content) })
    }
    const body = {
      model: req.model,
      messages,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      stream: true,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }

    const timeoutCtl = new AbortController()
    const signal = opts.signal ? AbortSignal.any([opts.signal, timeoutCtl.signal]) : timeoutCtl.signal

    const endpoint = buildEndpoint(this.provider, '/chat/completions')
    let resp: Response
    try {
      resp = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.provider.apiKey}`,
          ...endpoint.headers,
        },
        body: JSON.stringify(body),
        signal,
      })
    } catch (e) {
      throw classifyFetchError(e)
    }
    if (!resp.ok) throw await errorFromResponse(resp)

    let text = ''
    let finishReason: FinishReason = 'other'
    let usage: ChatResult['usage']
    try {
      await parseSSE(
        resp,
        (ev) => {
          if (ev.data === '[DONE]') return
          let chunk: StreamChunk
          try {
            chunk = JSON.parse(ev.data) as StreamChunk
          } catch {
            return
          }
          const choice = chunk.choices?.[0]
          if (choice?.delta?.content) {
            text += choice.delta.content
            opts.onDelta?.(choice.delta.content)
          }
          if (choice?.delta?.reasoning_content) {
            opts.onReasoningDelta?.(choice.delta.reasoning_content)
          }
          const mapped = mapFinishReason(choice?.finish_reason)
          if (mapped) finishReason = mapped
          if (chunk.usage) {
            usage = {
              input: chunk.usage.prompt_tokens ?? 0,
              output: chunk.usage.completion_tokens ?? 0,
            }
          }
        },
        { idleTimeoutMs: IDLE_TIMEOUT_MS },
      )
    } catch (e) {
      throw classifyFetchError(e)
    }
    return { text, finishReason, usage }
  }

  async listModels(): Promise<string[]> {
    const endpoint = buildEndpoint(this.provider, '/models')
    let resp: Response
    try {
      resp = await fetch(endpoint.url, {
        headers: { authorization: `Bearer ${this.provider.apiKey}`, ...endpoint.headers },
      })
    } catch (e) {
      throw classifyFetchError(e)
    }
    if (!resp.ok) throw await errorFromResponse(resp)
    const json = (await resp.json()) as { data?: { id?: string }[] }
    return (json.data ?? [])
      .map((m) => m.id ?? '')
      .filter(Boolean)
      .sort()
  }
}
