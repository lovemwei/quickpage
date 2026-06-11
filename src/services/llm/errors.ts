export type LLMErrorKind =
  | 'cors'
  | 'auth'
  | 'rate_limit'
  | 'server'
  | 'timeout'
  | 'abort'
  | 'bad_request'
  | 'parse'

export class LLMError extends Error {
  readonly kind: LLMErrorKind
  readonly status?: number
  readonly retryAfterMs?: number

  constructor(
    kind: LLMErrorKind,
    message: string,
    opts: { status?: number; retryAfterMs?: number; cause?: unknown } = {},
  ) {
    super(message)
    this.name = 'LLMError'
    this.kind = kind
    this.status = opts.status
    this.retryAfterMs = opts.retryAfterMs
    if (opts.cause !== undefined) this.cause = opts.cause
  }
}

export function isRetryable(e: unknown): boolean {
  return (
    e instanceof LLMError &&
    (e.kind === 'server' || e.kind === 'timeout' || e.kind === 'rate_limit' || e.kind === 'parse')
  )
}

function extractApiErrorMessage(body: string): string {
  try {
    const json = JSON.parse(body) as {
      error?: { message?: string } | string
      message?: string
    }
    if (typeof json.error === 'string') return json.error
    return json.error?.message ?? json.message ?? ''
  } catch {
    return body.slice(0, 300)
  }
}

export async function errorFromResponse(resp: Response): Promise<LLMError> {
  let detail = ''
  try {
    detail = extractApiErrorMessage(await resp.text())
  } catch {
    /* body 不可读时仅按状态码分类 */
  }
  const status = resp.status
  const msg = detail || `HTTP ${status}`
  if (status === 401 || status === 403) return new LLMError('auth', `鉴权失败：${msg}`, { status })
  if (status === 429) {
    const ra = Number(resp.headers.get('retry-after'))
    return new LLMError('rate_limit', `请求被限流：${msg}`, {
      status,
      retryAfterMs: Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined,
    })
  }
  if (status >= 500) return new LLMError('server', `服务端错误：${msg}`, { status })
  return new LLMError('bad_request', `请求错误：${msg}`, { status })
}

export function classifyFetchError(e: unknown): LLMError {
  if (e instanceof LLMError) return e
  if (e instanceof DOMException && e.name === 'AbortError') {
    return new LLMError('abort', '请求已取消', { cause: e })
  }
  if (e instanceof TypeError) {
    return new LLMError(
      'cors',
      '网络请求失败：该服务商可能不支持浏览器直连（CORS 限制），或网络不可达。可在该服务商的编辑弹窗中把「连接方式」切换为「本地代理」（npm run dev 运行时可用），或改用 OpenRouter 等支持直连的聚合服务',
      { cause: e },
    )
  }
  return new LLMError('server', e instanceof Error ? e.message : String(e), { cause: e })
}
