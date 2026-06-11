import type { ChatRequest, ChatResult } from '@/types/llm'
import type { ProviderConfig } from '@/types/provider'

export interface ChatOptions {
  signal?: AbortSignal
  onDelta?: (text: string) => void
  /** 推理模型的思考过程，仅用于展示，不计入结果 */
  onReasoningDelta?: (text: string) => void
}

export interface LLMClient {
  chat(req: ChatRequest, opts?: ChatOptions): Promise<ChatResult>
  listModels(): Promise<string[]>
}

export const IDLE_TIMEOUT_MS = 120_000

export function joinUrl(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/+$/, '') + path
}

/** 计算请求地址：直连用 baseUrl；本地代理改走 /llm-proxy 并以 x-qp-target 携带目标源 */
export function buildEndpoint(
  provider: ProviderConfig,
  path: string,
): { url: string; headers: Record<string, string> } {
  if (!provider.useProxy) {
    return { url: joinUrl(provider.baseUrl, path), headers: {} }
  }
  const u = new URL(provider.baseUrl)
  const basePath = u.pathname.replace(/\/+$/, '')
  return { url: `/llm-proxy${basePath}${path}`, headers: { 'x-qp-target': u.origin } }
}
