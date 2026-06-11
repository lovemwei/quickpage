import type { ProviderConfig } from '@/types/provider'
import { LLMError } from './errors'
import { AnthropicClient } from './anthropicClient'
import { OpenAIClient } from './openaiClient'
import type { LLMClient } from './types'

export function createClient(provider: ProviderConfig): LLMClient {
  return provider.protocol === 'anthropic'
    ? new AnthropicClient(provider)
    : new OpenAIClient(provider)
}

/** 连通性测试：优先拉取模型列表；未实现该接口的服务商退化为最小对话请求 */
export async function testProvider(provider: ProviderConfig): Promise<{ models: string[] }> {
  const client = createClient(provider)
  try {
    return { models: await client.listModels() }
  } catch (e) {
    if (!(e instanceof LLMError) || e.kind !== 'bad_request') throw e
  }
  const model = provider.models[0]
  if (!model) {
    throw new LLMError('bad_request', '该服务商未提供模型列表接口，请先手动填写一个模型名再测试')
  }
  await client.chat({ model, messages: [{ role: 'user', content: 'ping' }], maxTokens: 8 })
  return { models: [] }
}
