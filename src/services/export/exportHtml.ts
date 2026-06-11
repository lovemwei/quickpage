import type { Platform } from '@/types/project'
import { downloadText } from '@/utils/download'
import { withExportIframe } from './exportFrame'

/**
 * 构建可交付的 HTML：inlineTailwind 时在导出 iframe 中等 JIT 编译完成，
 * 序列化包含已生成样式的 DOM 并移除全部脚本，得到零网络依赖的自包含文件
 */
export async function buildExportHtml(
  html: string,
  platform: Platform,
  inlineTailwind: boolean,
): Promise<string> {
  if (!inlineTailwind) return html
  return withExportIframe(html, platform, async (doc) => {
    const clone = doc.documentElement.cloneNode(true) as HTMLElement
    clone.querySelectorAll('script').forEach((s) => s.remove())
    return '<!DOCTYPE html>\n' + clone.outerHTML
  })
}

export async function exportPageHtml(
  html: string,
  platform: Platform,
  fileName: string,
  inlineTailwind = true,
): Promise<void> {
  downloadText(await buildExportHtml(html, platform, inlineTailwind), fileName)
}
