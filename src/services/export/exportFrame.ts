import type { Platform } from '@/types/project'

export const CANVAS_WIDTH: Record<Platform, number> = { pc: 1440, mobile: 375 }
export const CANVAS_HEIGHT: Record<Platform, number> = { pc: 900, mobile: 812 }

/** 等待 Tailwind Play CDN 的 JIT 样式稳定（styleSheets 数与高度连续两帧不变） */
export async function waitForTailwind(doc: Document, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let stable = 0
  let lastSheets = -1
  let lastHeight = -1
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 120))
    const sheets = doc.styleSheets.length
    const height = doc.documentElement.scrollHeight
    if (sheets > 0 && sheets === lastSheets && height === lastHeight) {
      stable++
      if (stable >= 2) return
    } else {
      stable = 0
    }
    lastSheets = sheets
    lastHeight = height
  }
}

/**
 * 导出专用临时 iframe：sandbox 含 allow-same-origin 以便读取文档；
 * 内容已经 normalizeHtml 剥净所有脚本（仅 Tailwind CDN），用后立即销毁
 */
export async function withExportIframe<T>(
  html: string,
  platform: Platform,
  fn: (doc: Document, iframe: HTMLIFrameElement) => Promise<T>,
): Promise<T> {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  iframe.style.cssText = `position:fixed;left:-100000px;top:0;width:${CANVAS_WIDTH[platform]}px;height:${CANVAS_HEIGHT[platform]}px;border:0;`
  document.body.appendChild(iframe)
  try {
    const loaded = new Promise<void>((resolve) => {
      iframe.addEventListener('load', () => resolve(), { once: true })
    })
    iframe.srcdoc = html
    await loaded
    const doc = iframe.contentDocument
    if (!doc) throw new Error('无法访问导出 iframe 文档')
    await waitForTailwind(doc)
    return await fn(doc, iframe)
  } finally {
    iframe.remove()
  }
}
