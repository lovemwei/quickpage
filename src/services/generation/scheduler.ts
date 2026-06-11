import type { Page } from '@/types/page'
import { createLimiter, withRetry, type Limiter } from '@/utils/concurrency'
import { isRetryable, LLMError } from '../llm/errors'

export interface SchedulerCallbacks {
  /** 状态流转；error 为「已取消」时由调用方决定回退状态 */
  onStatus: (pageId: string, status: 'queued' | 'generating' | 'failed', error?: string) => void
  onDelta: (pageId: string, text: string) => void
  onReasoningDelta: (pageId: string, text: string) => void
  /** 生成成功，html 已 normalize；由调用方负责落库 */
  onSuccess: (pageId: string, html: string) => Promise<void>
}

export interface SchedulerOptions {
  concurrency: () => number
  generate: (
    page: Page,
    signal: AbortSignal,
    onDelta: (t: string) => void,
    onReasoningDelta: (t: string) => void,
  ) => Promise<string>
  callbacks: SchedulerCallbacks
}

/** 批量页面生成调度：限流、重试、限流降级、单页/全局中止 */
export class GenerationScheduler {
  private limiter: Limiter
  private controllers = new Map<string, AbortController>()
  private rateLimited = false

  constructor(private opts: SchedulerOptions) {
    this.limiter = createLimiter(opts.concurrency())
  }

  get runningCount(): number {
    return this.controllers.size
  }

  isActive(pageId: string): boolean {
    return this.controllers.has(pageId)
  }

  enqueue(pages: Page[]): void {
    this.limiter.setLimit(this.rateLimited ? 1 : this.opts.concurrency())
    for (const page of pages) {
      if (this.controllers.has(page.id)) continue
      const ctl = new AbortController()
      this.controllers.set(page.id, ctl)
      this.opts.callbacks.onStatus(page.id, 'queued')
      void this.limiter.run(() => this.runOne(page, ctl)).catch(() => {})
    }
  }

  private async runOne(page: Page, ctl: AbortController): Promise<void> {
    const cb = this.opts.callbacks
    try {
      if (ctl.signal.aborted) {
        cb.onStatus(page.id, 'failed', '已取消')
        return
      }
      cb.onStatus(page.id, 'generating')
      const html = await withRetry(
        () =>
          this.opts.generate(
            page,
            ctl.signal,
            (t) => cb.onDelta(page.id, t),
            (t) => cb.onReasoningDelta(page.id, t),
          ),
        {
          retries: 2,
          shouldRetry: (e) => isRetryable(e),
          backoffMs: (attempt, e) => {
            if (e instanceof LLMError && e.kind === 'rate_limit') {
              this.rateLimited = true
              this.limiter.setLimit(1)
              return e.retryAfterMs ?? 5000 * (attempt + 1)
            }
            return attempt === 0 ? 2000 : 6000
          },
          signal: ctl.signal,
        },
      )
      if (this.rateLimited) {
        this.rateLimited = false
        this.limiter.setLimit(this.opts.concurrency())
      }
      await cb.onSuccess(page.id, html)
    } catch (e) {
      const isAbort =
        (e instanceof LLMError && e.kind === 'abort') ||
        (e instanceof DOMException && e.name === 'AbortError')
      cb.onStatus(page.id, 'failed', isAbort ? '已取消' : (e as Error).message)
    } finally {
      this.controllers.delete(page.id)
    }
  }

  cancel(pageId: string): void {
    this.controllers.get(pageId)?.abort()
  }

  cancelAll(): void {
    for (const ctl of this.controllers.values()) ctl.abort()
  }
}
