import { LLMError } from './errors'

/** 从 LLM 回复中剥出完整 HTML 文档 */
export function extractHtml(raw: string): string {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  const fenced = [...cleaned.matchAll(/```(?:html)?\s*\n?([\s\S]*?)```/g)]
    .map((m) => m[1]!.trim())
    .filter((s) => /^<!doctype|^<html|^</i.test(s))
  if (fenced.length > 0) {
    const best = fenced.reduce((a, b) => (b.length > a.length ? b : a))
    if (best.length > 100) return best
  }

  const docMatch = cleaned.match(/<!doctype[\s\S]*<\/html>/i) ?? cleaned.match(/<html[\s\S]*<\/html>/i)
  if (docMatch) return docMatch[0]

  // 截断的文档：有开头无结尾，取到末尾交给 normalize 兜底
  const openMatch = cleaned.match(/<!doctype[\s\S]*/i) ?? cleaned.match(/<html[\s\S]*/i)
  if (openMatch) return openMatch[0]

  if (cleaned.startsWith('<')) return cleaned

  throw new LLMError('parse', '模型输出中没有可识别的 HTML 文档')
}
