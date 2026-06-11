export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; base64: string }

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface ChatRequest {
  model: string
  system?: string
  messages: ChatMessage[]
  maxTokens: number
  temperature?: number
  jsonMode?: boolean
}

export type FinishReason = 'stop' | 'length' | 'other'

export interface ChatUsage {
  input: number
  output: number
}

export interface ChatResult {
  text: string
  finishReason: FinishReason
  usage?: ChatUsage
}
