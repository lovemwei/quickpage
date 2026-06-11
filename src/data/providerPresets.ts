import type { CorsHint, ProviderProtocol } from '@/types/provider'

export interface ProviderPreset {
  id: string
  name: string
  protocol: ProviderProtocol
  baseUrl: string
  corsHint: CorsHint
  suggestedModels: string[]
  notes?: string
}

export const providerPresets: ProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com',
    corsHint: 'works',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    notes: '不支持图片输入',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    corsHint: 'official',
    suggestedModels: ['anthropic/claude-sonnet-4.6', 'google/gemini-2.5-pro', 'openai/gpt-5.1'],
    notes: '聚合各家模型，国内服务商直连不通时的推荐替代',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    corsHint: 'official',
    suggestedModels: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    corsHint: 'official',
    suggestedModels: ['gpt-5.1', 'gpt-5-mini'],
  },
  {
    id: 'siliconflow',
    name: '硅基流动 SiliconFlow',
    protocol: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    corsHint: 'works',
    suggestedModels: [],
    notes: '聚合多家开源模型，可用「测试连接」拉取模型列表',
  },
  {
    id: 'moonshot',
    name: '月之暗面 Kimi',
    protocol: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    corsHint: 'unknown',
    suggestedModels: ['kimi-latest'],
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    protocol: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    corsHint: 'unknown',
    suggestedModels: ['glm-4.6'],
  },
  {
    id: 'dashscope',
    name: '阿里云通义（DashScope）',
    protocol: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    corsHint: 'unknown',
    suggestedModels: ['qwen-max', 'qwen-plus', 'qwen-vl-max'],
  },
]

export const corsHintLabels: Record<CorsHint, { label: string; type: 'success' | 'info' | 'warning' }> = {
  official: { label: '官方支持直连', type: 'success' },
  works: { label: '实测可直连', type: 'info' },
  unknown: { label: '直连未验证', type: 'warning' },
}
