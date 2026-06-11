import type { CorsHint, ProviderProtocol } from '@/types/provider'

export interface ProviderPresetLinks {
  official?: string
  docs?: string
  apiKey?: string
  models?: string
}

export interface ProviderPreset {
  id: string
  name: string
  protocol: ProviderProtocol
  baseUrl: string
  endpoints?: Partial<Record<ProviderProtocol, string>>
  corsHint: CorsHint
  defaultUseProxy?: boolean
  suggestedModels: string[]
  notes?: string
  connectionNotes?: string
  links?: ProviderPresetLinks
}

export const providerProtocolLabels: Record<ProviderProtocol, string> = {
  openai: 'OpenAI 兼容',
  anthropic: 'Anthropic',
}

const PROXY_RECOMMENDED = '多数浏览器环境可能被 CORS 拦截，建议优先使用本地代理'
const DIRECT_OR_PROXY = '可先尝试浏览器直连；若测试连接出现 CORS 报错，切换为本地代理'
const LOCAL_PROXY_RECOMMENDED = '本地模型服务建议使用本地代理；API Key 可填写任意非空值'

export function getPresetEndpoint(
  preset: ProviderPreset,
  protocol: ProviderProtocol,
): string | undefined {
  return preset.endpoints?.[protocol] ?? (preset.protocol === protocol ? preset.baseUrl : undefined)
}

export function getPresetProtocols(preset: ProviderPreset): ProviderProtocol[] {
  const protocols = new Set<ProviderProtocol>([preset.protocol])
  for (const protocol of Object.keys(preset.endpoints ?? {}) as ProviderProtocol[]) {
    protocols.add(protocol)
  }
  return [...protocols]
}

export const providerPresets: ProviderPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com',
    endpoints: {
      openai: 'https://api.deepseek.com',
      anthropic: 'https://api.deepseek.com/anthropic',
    },
    corsHint: 'works',
    defaultUseProxy: false,
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    notes: '不支持图片输入；同时提供 Anthropic 兼容 endpoint',
    connectionNotes: DIRECT_OR_PROXY,
    links: {
      official: 'https://deepseek.com/',
      docs: 'https://platform.deepseek.com/api-docs/',
      apiKey: 'https://platform.deepseek.com/api_keys',
      models: 'https://platform.deepseek.com/api-docs/',
    },
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    endpoints: {
      openai: 'https://openrouter.ai/api/v1',
      anthropic: 'https://openrouter.ai/api',
    },
    corsHint: 'official',
    defaultUseProxy: false,
    suggestedModels: ['anthropic/claude-sonnet-4.6', 'google/gemini-2.5-pro', 'openai/gpt-5.1'],
    notes: '聚合各家模型，国内服务商直连不通时的推荐替代；同时提供 Anthropic 兼容 endpoint',
    connectionNotes: DIRECT_OR_PROXY,
    links: {
      official: 'https://openrouter.ai/',
      docs: 'https://openrouter.ai/docs/quick-start',
      apiKey: 'https://openrouter.ai/settings/keys',
      models: 'https://openrouter.ai/models',
    },
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    endpoints: {
      anthropic: 'https://api.anthropic.com',
    },
    corsHint: 'official',
    defaultUseProxy: false,
    suggestedModels: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    connectionNotes: DIRECT_OR_PROXY,
    links: {
      official: 'https://anthropic.com/',
      docs: 'https://docs.anthropic.com/en/docs',
      apiKey: 'https://console.anthropic.com/settings/keys',
      models: 'https://docs.anthropic.com/en/docs/about-claude/models',
    },
  },
  {
    id: 'openai',
    name: 'OpenAI',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    endpoints: {
      openai: 'https://api.openai.com/v1',
    },
    corsHint: 'official',
    defaultUseProxy: false,
    suggestedModels: ['gpt-5.1', 'gpt-5-mini'],
    connectionNotes: DIRECT_OR_PROXY,
    links: {
      official: 'https://openai.com/',
      docs: 'https://platform.openai.com/docs',
      apiKey: 'https://platform.openai.com/api-keys',
      models: 'https://platform.openai.com/docs/models',
    },
  },
  {
    id: 'siliconflow',
    name: '硅基流动 SiliconFlow',
    protocol: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    endpoints: {
      openai: 'https://api.siliconflow.cn/v1',
      anthropic: 'https://api.siliconflow.cn',
    },
    corsHint: 'works',
    defaultUseProxy: false,
    suggestedModels: [],
    notes: '聚合多家开源模型，可用「测试连接」拉取模型列表；部分模型支持 Anthropic 兼容 endpoint',
    connectionNotes: DIRECT_OR_PROXY,
    links: {
      official: 'https://www.siliconflow.cn',
      docs: 'https://docs.siliconflow.cn/',
      apiKey: 'https://cloud.siliconflow.cn/',
      models: 'https://cloud.siliconflow.cn/models',
    },
  },
  {
    id: 'moonshot',
    name: '月之暗面 Kimi',
    protocol: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    endpoints: {
      openai: 'https://api.moonshot.cn/v1',
      anthropic: 'https://api.moonshot.cn/anthropic',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['kimi-latest', 'kimi-k2-0711-preview', 'moonshot-v1-128k'],
    notes: '同时提供 Anthropic 兼容 endpoint',
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://www.moonshot.cn/',
      docs: 'https://platform.moonshot.cn/docs',
      apiKey: 'https://platform.moonshot.cn/console/api-keys',
      models: 'https://platform.moonshot.cn/docs/guide/choosing-a-model',
    },
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    protocol: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    endpoints: {
      openai: 'https://open.bigmodel.cn/api/paas/v4',
      anthropic: 'https://open.bigmodel.cn/api/anthropic',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['glm-4.6', 'glm-4.5', 'glm-z1-air'],
    notes: '同时提供 Anthropic 兼容 endpoint',
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://open.bigmodel.cn/',
      docs: 'https://docs.bigmodel.cn/',
      apiKey: 'https://open.bigmodel.cn/apikey/platform',
      models: 'https://open.bigmodel.cn/modelcenter/square',
    },
  },
  {
    id: 'dashscope',
    name: '阿里云通义（DashScope）',
    protocol: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    endpoints: {
      openai: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      anthropic: 'https://dashscope.aliyuncs.com/apps/anthropic',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['qwen-max', 'qwen-plus', 'qwen-vl-max', 'qwen3-coder-plus'],
    notes: 'OpenAI 兼容接口用于通义千问；Anthropic 兼容接口用于 Claude Code 代理能力',
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://bailian.console.aliyun.com/',
      docs: 'https://help.aliyun.com/zh/model-studio/',
      apiKey: 'https://bailian.console.aliyun.com/?apiKey=1#/api-key',
      models: 'https://help.aliyun.com/zh/model-studio/getting-started/models',
    },
  },
  {
    id: 'modelscope',
    name: '魔搭 ModelScope',
    protocol: 'openai',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    endpoints: {
      openai: 'https://api-inference.modelscope.cn/v1',
      anthropic: 'https://api-inference.modelscope.cn',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: [
      'Qwen/Qwen3-Coder-480B-A35B-Instruct',
      'deepseek-ai/DeepSeek-V3.1',
      'ZhipuAI/GLM-4.5',
    ],
    notes: '模型名通常使用「组织/模型」格式；同时提供 Anthropic 兼容 endpoint',
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://modelscope.cn',
      docs: 'https://modelscope.cn/docs/model-service/API-Inference/intro',
      apiKey: 'https://modelscope.cn/my/myaccesstoken',
      models: 'https://modelscope.cn/models',
    },
  },
  {
    id: 'doubao',
    name: '火山方舟 Doubao',
    protocol: 'openai',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    endpoints: {
      openai: 'https://ark.cn-beijing.volces.com/api/v3',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['doubao-seed-1-6-250615', 'doubao-1-5-pro-32k-250115'],
    notes: '部分账号需在模型字段填写方舟推理接入点 ID',
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://console.volcengine.com/ark/',
      docs: 'https://www.volcengine.com/docs/82379/1182403',
      apiKey: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
      models: 'https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint',
    },
  },
  {
    id: 'hunyuan',
    name: '腾讯混元 Hunyuan',
    protocol: 'openai',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    endpoints: {
      openai: 'https://api.hunyuan.cloud.tencent.com/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['hunyuan-turbos-latest', 'hunyuan-large', 'hunyuan-standard'],
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://cloud.tencent.com/product/hunyuan',
      docs: 'https://cloud.tencent.com/document/product/1729/111007',
      apiKey: 'https://console.cloud.tencent.com/hunyuan/api-key',
      models: 'https://cloud.tencent.com/document/product/1729/104753',
    },
  },
  {
    id: 'qianfan',
    name: '百度千帆 Qianfan',
    protocol: 'openai',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    endpoints: {
      openai: 'https://qianfan.baidubce.com/v2',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['ernie-4.5-turbo-128k', 'ernie-x1-turbo-32k', 'deepseek-v3'],
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://cloud.baidu.com/',
      docs: 'https://cloud.baidu.com/doc/index.html',
      apiKey: 'https://console.bce.baidu.com/iam/#/iam/apikey/list',
      models: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Fm2vrveyu',
    },
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    protocol: 'openai',
    baseUrl: 'https://api.minimaxi.com/v1',
    endpoints: {
      openai: 'https://api.minimaxi.com/v1',
      anthropic: 'https://api.minimaxi.com/anthropic',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['MiniMax-M1', 'abab6.5s-chat', 'abab6.5g-chat'],
    notes: '同时提供 Anthropic 兼容 endpoint',
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://platform.minimaxi.com/',
      docs: 'https://platform.minimaxi.com/docs/api-reference/text-openai-api',
      apiKey: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
      models: 'https://platform.minimaxi.com/document/Models',
    },
  },
  {
    id: 'stepfun',
    name: '阶跃星辰 StepFun',
    protocol: 'openai',
    baseUrl: 'https://api.stepfun.com/v1',
    endpoints: {
      openai: 'https://api.stepfun.com/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['step-2-mini', 'step-1-8k', 'step-1-32k'],
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://platform.stepfun.com/',
      docs: 'https://platform.stepfun.com/docs/overview/concept',
      apiKey: 'https://platform.stepfun.com/interface-key',
      models: 'https://platform.stepfun.com/docs/llm/text',
    },
  },
  {
    id: 'github-models',
    name: 'GitHub Models',
    protocol: 'openai',
    baseUrl: 'https://models.github.ai/inference',
    endpoints: {
      openai: 'https://models.github.ai/inference',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['openai/gpt-4.1', 'openai/gpt-4o', 'mistral-ai/mistral-large-2411'],
    notes: 'API Key 使用具备 Models 权限的 GitHub token',
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://github.com/marketplace/models',
      docs: 'https://docs.github.com/en/github-models',
      apiKey: 'https://github.com/settings/tokens',
      models: 'https://github.com/marketplace/models',
    },
  },
  {
    id: 'gemini-openai',
    name: 'Google Gemini（OpenAI 兼容）',
    protocol: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    endpoints: {
      openai: 'https://generativelanguage.googleapis.com/v1beta/openai',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    notes: '仅配置 Gemini 的 OpenAI 兼容接口；非 Gemini 原生协议',
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://ai.google.dev/',
      docs: 'https://ai.google.dev/gemini-api/docs/openai',
      apiKey: 'https://aistudio.google.com/app/apikey',
      models: 'https://ai.google.dev/gemini-api/docs/models/gemini',
    },
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    protocol: 'openai',
    baseUrl: 'https://api.x.ai/v1',
    endpoints: {
      openai: 'https://api.x.ai/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['grok-4', 'grok-3', 'grok-3-mini'],
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://x.ai/',
      docs: 'https://docs.x.ai/',
      apiKey: 'https://console.x.ai/',
      models: 'https://docs.x.ai/docs/models',
    },
  },
  {
    id: 'groq',
    name: 'Groq',
    protocol: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    endpoints: {
      openai: 'https://api.groq.com/openai/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: [
      'openai/gpt-oss-120b',
      'llama-3.3-70b-versatile',
      'meta-llama/llama-4-maverick-17b-128e-instruct',
    ],
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://groq.com/',
      docs: 'https://console.groq.com/docs/quickstart',
      apiKey: 'https://console.groq.com/keys',
      models: 'https://console.groq.com/docs/models',
    },
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    protocol: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    endpoints: {
      openai: 'https://api.mistral.ai/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['mistral-large-latest', 'pixtral-large-latest', 'ministral-8b-latest'],
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://mistral.ai',
      docs: 'https://docs.mistral.ai',
      apiKey: 'https://console.mistral.ai/api-keys/',
      models: 'https://docs.mistral.ai/getting-started/models/models_overview',
    },
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    protocol: 'openai',
    baseUrl: 'https://api.perplexity.ai',
    endpoints: {
      openai: 'https://api.perplexity.ai',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['sonar-pro', 'sonar', 'sonar-reasoning-pro'],
    notes: '模型列表接口可能不可用，可直接使用预设模型名测试',
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://perplexity.ai/',
      docs: 'https://docs.perplexity.ai/home',
      apiKey: 'https://www.perplexity.ai/settings/api',
      models: 'https://docs.perplexity.ai/guides/model-cards',
    },
  },
  {
    id: 'together',
    name: 'Together AI',
    protocol: 'openai',
    baseUrl: 'https://api.together.xyz/v1',
    endpoints: {
      openai: 'https://api.together.xyz/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-V3',
      'Qwen/Qwen3-235B-A22B-fp8-tput',
    ],
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://www.together.ai/',
      docs: 'https://docs.together.ai/docs/introduction',
      apiKey: 'https://api.together.ai/settings/api-keys',
      models: 'https://docs.together.ai/docs/serverless-models',
    },
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    protocol: 'openai',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    endpoints: {
      openai: 'https://api.fireworks.ai/inference/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: [
      'accounts/fireworks/models/deepseek-v3',
      'accounts/fireworks/models/llama-v3p1-70b-instruct',
    ],
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://fireworks.ai/',
      docs: 'https://docs.fireworks.ai/getting-started/introduction',
      apiKey: 'https://fireworks.ai/account/api-keys',
      models: 'https://fireworks.ai/dashboard/models',
    },
  },
  {
    id: 'cerebras',
    name: 'Cerebras AI',
    protocol: 'openai',
    baseUrl: 'https://api.cerebras.ai/v1',
    endpoints: {
      openai: 'https://api.cerebras.ai/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['llama-4-scout-17b-16e-instruct', 'qwen-3-32b', 'gpt-oss-120b'],
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://www.cerebras.ai',
      docs: 'https://inference-docs.cerebras.ai/introduction',
      apiKey: 'https://cloud.cerebras.ai',
      models: 'https://inference-docs.cerebras.ai/models/overview',
    },
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Router',
    protocol: 'openai',
    baseUrl: 'https://router.huggingface.co/v1',
    endpoints: {
      openai: 'https://router.huggingface.co/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: [
      'openai/gpt-oss-120b',
      'Qwen/Qwen3-235B-A22B',
      'meta-llama/Llama-3.1-8B-Instruct',
    ],
    connectionNotes: PROXY_RECOMMENDED,
    links: {
      official: 'https://huggingface.co/',
      docs: 'https://huggingface.co/docs',
      apiKey: 'https://huggingface.co/settings/tokens',
      models: 'https://huggingface.co/models',
    },
  },
  {
    id: 'lmstudio',
    name: 'LM Studio（本地）',
    protocol: 'openai',
    baseUrl: 'http://localhost:1234/v1',
    endpoints: {
      openai: 'http://localhost:1234/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: [],
    notes: '需先在 LM Studio 启动本地 server',
    connectionNotes: LOCAL_PROXY_RECOMMENDED,
    links: {
      official: 'https://lmstudio.ai/',
      docs: 'https://lmstudio.ai/docs',
      models: 'https://lmstudio.ai/models',
    },
  },
  {
    id: 'ollama',
    name: 'Ollama（本地）',
    protocol: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    endpoints: {
      openai: 'http://localhost:11434/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: ['llama3.1', 'qwen2.5', 'deepseek-r1'],
    notes: '需先启动 Ollama；模型名取决于本机已 pull 的模型',
    connectionNotes: LOCAL_PROXY_RECOMMENDED,
    links: {
      official: 'https://ollama.com/',
      docs: 'https://github.com/ollama/ollama/tree/main/docs',
      models: 'https://ollama.com/library',
    },
  },
  {
    id: 'new-api',
    name: 'New API / One API（自托管）',
    protocol: 'openai',
    baseUrl: 'http://localhost:3000/v1',
    endpoints: {
      openai: 'http://localhost:3000/v1',
    },
    corsHint: 'unknown',
    defaultUseProxy: true,
    suggestedModels: [],
    notes: '按你的自托管地址调整 Base URL',
    connectionNotes: LOCAL_PROXY_RECOMMENDED,
    links: {
      official: 'https://docs.newapi.pro/',
      docs: 'https://docs.newapi.pro/',
    },
  },
]

export const corsHintLabels: Record<
  CorsHint,
  { label: string; type: 'success' | 'info' | 'warning' }
> = {
  official: { label: '官方支持直连', type: 'success' },
  works: { label: '实测可直连', type: 'info' },
  unknown: { label: '直连未验证', type: 'warning' },
}
