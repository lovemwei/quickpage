import { jsonrepair } from 'jsonrepair'
import { LLMError } from './errors'

function stripThinking(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

function candidates(raw: string): string[] {
  const list: string[] = []
  const fenced = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)]
    .map((m) => m[1]!.trim())
    .filter((s) => s.startsWith('{') || s.startsWith('['))
  list.push(...fenced)
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first >= 0 && last > first) list.push(raw.slice(first, last + 1))
  if (first >= 0) list.push(raw.slice(first))
  return list
}

/** 从 LLM 回复中容错提取 JSON：剥思考标签 → 围栏/配平截取 → JSON.parse → jsonrepair */
export function parseJsonLoose<T = unknown>(raw: string): T {
  const cleaned = stripThinking(raw)
  let lastError: unknown
  for (const candidate of candidates(cleaned)) {
    try {
      return JSON.parse(candidate) as T
    } catch (e) {
      lastError = e
    }
    try {
      return JSON.parse(jsonrepair(candidate)) as T
    } catch (e) {
      lastError = e
    }
  }
  throw new LLMError('parse', `无法从模型输出中解析 JSON：${String(lastError ?? '输出中没有 JSON 内容')}`)
}
