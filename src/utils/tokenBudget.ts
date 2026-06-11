const CJK_RE = /[⺀-鿿豈-﫿＀-￯]/g

/** 启发式 token 估算：CJK 1 字 ≈ 1 token，其余 4 字符 ≈ 1 token */
export function estimateTokens(text: string): number {
  const cjk = text.match(CJK_RE)?.length ?? 0
  return cjk + Math.ceil((text.length - cjk) / 4)
}

export interface TruncateResult {
  text: string
  truncated: boolean
}

/** 结构感知截断：保留全部标题行，各节正文按比例截取 */
export function truncateStructured(text: string, budgetTokens: number): TruncateResult {
  const total = estimateTokens(text)
  if (total <= budgetTokens) return { text, truncated: false }

  const ratio = (budgetTokens / total) * 0.95
  const isHeading = (line: string) => /^#{1,6}\s/.test(line) || /^=====/.test(line)

  const sections: { heading: string | null; body: string[] }[] = []
  let current: { heading: string | null; body: string[] } = { heading: null, body: [] }
  sections.push(current)
  for (const line of text.split('\n')) {
    if (isHeading(line)) {
      current = { heading: line, body: [] }
      sections.push(current)
    } else {
      current.body.push(line)
    }
  }

  const out: string[] = []
  for (const section of sections) {
    if (section.heading !== null) out.push(section.heading)
    const body = section.body.join('\n')
    const keep = Math.floor(body.length * ratio)
    if (keep >= body.length) {
      if (body) out.push(body)
    } else {
      out.push(body.slice(0, keep) + '\n[…本节过长已截断]')
    }
  }
  out.push('\n[注：文档过长，以上为按章节比例截取的节选]')
  return { text: out.join('\n'), truncated: true }
}
