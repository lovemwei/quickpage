import type { ChatRequest, ChatResult, ContentPart, FinishReason } from '@/types/llm'
import type { ProviderConfig } from '@/types/provider'
import { classifyFetchError, errorFromResponse, LLMError } from './errors'
import { parseSSE } from './sse'
import { buildEndpoint, IDLE_TIMEOUT_MS, type ChatOptions, type LLMClient } from './types'

function toAnthropicContent(content: string | ContentPart[]): unknown {
  if (typeof content === 'string') return content
  return content.map((part) =>
    part.type === 'text'
      ? { type: 'text', text: part.text }
      : {
          type: 'image',
          source: { type: 'base64', media_type: part.mimeType, data: part.base64 },
        },
  )
}

interface AnthropicStreamEvent {
  type?: string
  delta?: { type?: string; text?: string; thinking?: string; stop_reason?: string }
  usage?: { output_tokens?: number }
  message?: { usage?: { input_tokens?: number } }
  error?: { type?: string; message?: string }
}

export class AnthropicClient implements LLMClient {
  constructor(private provider: ProviderConfig) {}

  private headers(): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-api-key': this.provider.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }
  }

  async chat(req: ChatRequest, opts: ChatOptions = {}): Promise<ChatResult> {
    const body = {
      model: req.model,
      max_tokens: req.maxTokens,
      // Anthropic 协议 temperature 上限为 1
      temperature: req.temperature === undefined ? undefined : Math.min(1, req.temperature),
      system: req.system,
      messages: req.messages.map((m) => ({ role: m.role, content: toAnthropicContent(m.content) })),
      stream: true,
    }

    const timeoutCtl = new AbortController()
    const signal = opts.signal ? AbortSignal.any([opts.signal, timeoutCtl.signal]) : timeoutCtl.signal

    const endpoint = buildEndpoint(this.provider, '/v1/messages')
    let resp: Response
    try {
      resp = await fetch(endpoint.url, {
        method: 'POST',
        headers: { ...this.headers(), ...endpoint.headers },
        body: JSON.stringify(body),
        signal,
      })
    } catch (e) {
      throw classifyFetchError(e)
    }
    if (!resp.ok) throw await errorFromResponse(resp)

    let text = ''
    let finishReason: FinishReason = 'other'
    let inputTokens = 0
    let outputTokens = 0
    let streamError: LLMError | null = null
    try {
      await parseSSE(
        resp,
        (ev) => {
          let event: AnthropicStreamEvent
          try {
            event = JSON.parse(ev.data) as AnthropicStreamEvent
          } catch {
            return
          }
          switch (event.type) {
            case 'message_start':
              inputTokens = event.message?.usage?.input_tokens ?? 0
              break
            case 'content_block_delta':
              if (event.delta?.type === 'text_delta' && event.delta.text) {
                text += event.delta.text
                opts.onDelta?.(event.delta.text)
              } else if (event.delta?.type === 'thinking_delta' && event.delta.thinking) {
                opts.onReasoningDelta?.(event.delta.thinking)
              }
              break
            case 'message_delta':
              if (event.delta?.stop_reason) {
                finishReason =
                  event.delta.stop_reason === 'end_turn'
                    ? 'stop'
                    : event.delta.stop_reason === 'max_tokens'
                      ? 'length'
                      : 'other'
              }
              if (event.usage?.output_tokens) outputTokens = event.usage.output_tokens
              break
            case 'error':
              streamError = new LLMError('server', event.error?.message ?? '流式响应出错')
              break
          }
        },
        { idleTimeoutMs: IDLE_TIMEOUT_MS },
      )
    } catch (e) {
      throw classifyFetchError(e)
    }
    if (streamError) throw streamError
    return { text, finishReason, usage: { input: inputTokens, output: outputTokens } }
  }

  async listModels(): Promise<string[]> {
    const endpoint = buildEndpoint(this.provider, '/v1/models')
    let resp: Response
    try {
      resp = await fetch(endpoint.url, {
        headers: { ...this.headers(), ...endpoint.headers },
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
