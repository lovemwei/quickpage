import type { DesignTokens, Platform } from '@/types/project'

export interface NormalizeOptions {
  tokens: DesignTokens
  platform: Platform
  tailwindCdnUrl: string
}

const INJECT_ATTR = 'data-ua-inject'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(rgb: [number, number, number], target: number, ratio: number): string {
  const [r, g, b] = rgb.map((c) => Math.round(c + (target - c) * ratio)) as [number, number, number]
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** 由主色生成 Tailwind 色阶（600 为基准色） */
function buildPrimaryScale(primary: string): Record<string, string> {
  const rgb = hexToRgb(primary)
  const lighten: [string, number][] = [
    ['50', 0.94],
    ['100', 0.88],
    ['200', 0.74],
    ['300', 0.56],
    ['400', 0.32],
    ['500', 0.14],
  ]
  const darken: [string, number][] = [
    ['700', 0.16],
    ['800', 0.3],
    ['900', 0.44],
    ['950', 0.58],
  ]
  const scale: Record<string, string> = { DEFAULT: primary, '600': primary }
  for (const [k, r] of lighten) scale[k] = mix(rgb, 255, r)
  for (const [k, r] of darken) scale[k] = mix(rgb, 0, r)
  return scale
}

const FONT_STACKS: Record<DesignTokens['fontFamily'], string> = {
  system:
    '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',
  serif: 'Georgia,"Times New Roman","Noto Serif SC","Songti SC",serif',
  rounded:
    '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",-apple-system,BlinkMacSystemFont,sans-serif',
}

function svgPlaceholder(): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#9ca3af" opacity="0.25"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#6b7280" font-size="20" font-family="sans-serif">图片占位</text></svg>'
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/**
 * 生成结果后处理（不信任模型自觉，机器保证一致与安全）：
 * 补全文档结构 → 剥离全部脚本与外链 → 注入统一的 Tailwind CDN + config + 基础样式
 */
export function normalizeHtml(rawHtml: string, opts: NormalizeOptions): string {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  const head = doc.head

  doc.querySelectorAll('script, link').forEach((el) => el.remove())
  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') ?? ''
    if (/^(https?:)?\/\//i.test(src)) img.setAttribute('src', svgPlaceholder())
  })
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name)
      else if (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.setAttribute('href', '#')
      }
    }
  })

  doc.documentElement.setAttribute('lang', 'zh-CN')
  if (!head.querySelector('meta[charset]')) {
    const meta = doc.createElement('meta')
    meta.setAttribute('charset', 'UTF-8')
    head.prepend(meta)
  }
  if (opts.platform === 'mobile' && !head.querySelector('meta[name="viewport"]')) {
    const meta = doc.createElement('meta')
    meta.setAttribute('name', 'viewport')
    meta.setAttribute('content', 'width=device-width, initial-scale=1')
    head.querySelector('meta[charset]')?.after(meta)
  }

  const cdnScript = doc.createElement('script')
  cdnScript.setAttribute('src', opts.tailwindCdnUrl)
  cdnScript.setAttribute(INJECT_ATTR, 'cdn')
  head.appendChild(cdnScript)

  const configScript = doc.createElement('script')
  configScript.setAttribute(INJECT_ATTR, 'config')
  const colors: Record<string, Record<string, string>> = {
    primary: buildPrimaryScale(opts.tokens.primaryColor),
  }
  if (opts.tokens.accentColor) colors.accent = buildPrimaryScale(opts.tokens.accentColor)
  const config = {
    theme: {
      extend: { colors },
    },
  }
  configScript.textContent = `tailwind.config = ${JSON.stringify(config)}`
  head.appendChild(configScript)

  const baseStyle = doc.createElement('style')
  baseStyle.setAttribute(INJECT_ATTR, 'base')
  baseStyle.textContent = `
*,::before,::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:${FONT_STACKS[opts.tokens.fontFamily]};-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-thumb{background:rgba(127,127,127,.35);border-radius:4px}
::-webkit-scrollbar-track{background:transparent}
`
  head.appendChild(baseStyle)

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}
