export interface Limiter {
  run<T>(fn: () => Promise<T>): Promise<T>
  setLimit(n: number): void
}

/** 信号量并发限流，支持运行中动态调整并发数 */
export function createLimiter(limit: number): Limiter {
  let active = 0
  let max = Math.max(1, limit)
  const queue: (() => void)[] = []
  const pump = () => {
    while (active < max && queue.length > 0) {
      active++
      queue.shift()!()
    }
  }
  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push(() => {
          fn()
            .then(resolve, reject)
            .finally(() => {
              active--
              pump()
            })
        })
        pump()
      })
    },
    setLimit(n: number) {
      max = Math.max(1, n)
      pump()
    },
  }
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(() => resolve(), ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

export interface RetryOptions {
  retries: number
  shouldRetry: (e: unknown) => boolean
  backoffMs: (attempt: number, e: unknown) => number
  signal?: AbortSignal
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (e) {
      if (attempt >= opts.retries || !opts.shouldRetry(e) || opts.signal?.aborted) throw e
      await sleep(opts.backoffMs(attempt, e), opts.signal)
    }
  }
}
