export type ProviderProtocol = 'openai' | 'anthropic'

/** 浏览器直连 CORS 支持程度：official=官方支持 works=社区实测可用 unknown=未验证 */
export type CorsHint = 'official' | 'works' | 'unknown'

export interface ProviderConfig {
  id: string
  name: string
  protocol: ProviderProtocol
  baseUrl: string
  apiKey: string
  models: string[]
  presetId?: string
  corsHint: CorsHint
  /** 经本地开发服务器转发（绕过 CORS，仅 dev/preview 可用） */
  useProxy?: boolean
}

export interface ModelRef {
  providerId: string
  model: string
}

export interface ModelSelection {
  analysis: ModelRef | null
  generation: ModelRef | null
}
