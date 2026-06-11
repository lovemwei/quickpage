import { LLMError } from './errors'

export interface SSEEvent {
  event?: string
  data: string
}

/** 解析 fetch 返回的 SSE 流；idleTimeoutMs 内无新字节则按超时中止 */
export async function parseSSE(
  resp: Response,
  onEvent: (ev: SSEEvent) => void,
  opts: { idleTimeoutMs?: number } = {},
): Promise<void> {
  if (!resp.body) throw new LLMError('server', '响应不包含数据流')
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()

  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const resetTimer = () => {
    if (!opts.idleTimeoutMs) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      timedOut = true
      reader.cancel().catch(() => {})
    }, opts.idleTimeoutMs)
  }

  let buf = ''
  let eventName: string | undefined
  let dataLines: string[] = []
  const dispatch = () => {
    if (dataLines.length > 0) {
      onEvent({ event: eventName, data: dataLines.join('\n') })
    }
    eventName = undefined
    dataLines = []
  }

  try {
    for (;;) {
      resetTimer()
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf('\n')) >= 0) {
        let line = buf.slice(0, idx)
        buf = buf.slice(idx + 1)
        if (line.endsWith('\r')) line = line.slice(0, -1)
        if (line === '') {
          dispatch()
          continue
        }
        if (line.startsWith(':')) continue
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        let val = colon === -1 ? '' : line.slice(colon + 1)
        if (val.startsWith(' ')) val = val.slice(1)
        if (field === 'event') eventName = val
        else if (field === 'data') dataLines.push(val)
      }
    }
  } finally {
    clearTimeout(timer)
  }
  if (timedOut) throw new LLMError('timeout', '响应超时：长时间未收到数据')
  dispatch()
}
