import type { ExtractedImage, ParsedDocument } from '@/types/parsing'
import { base64ToBlob } from '@/utils/blob'
import { normalizeImage } from './imageOps'

export async function parseText(file: File): Promise<ParsedDocument> {
  const raw = await file.text()
  const isMd = /\.(md|markdown)$/i.test(file.name)
  const warnings: string[] = []
  const dataUrls: { mimeType: string; base64: string }[] = []

  let text = raw
  if (isMd) {
    let counter = 0
    text = text.replace(
      /!\[[^\]]*\]\(data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)\)/g,
      (_m, mimeType: string, base64: string) => {
        dataUrls.push({ mimeType, base64: base64.replace(/\s/g, '') })
        return `[图片${++counter}]`
      },
    )
    if (/!\[[^\]]*\]\(https?:/.test(text)) {
      text = text.replace(/!\[[^\]]*\]\(https?:[^)]+\)/g, '[外链图片，未提取]')
      warnings.push('Markdown 中的外链图片未提取，仅保留占位标记')
    }
  }

  const images: ExtractedImage[] = []
  for (const item of dataUrls) {
    const normalized = await normalizeImage(base64ToBlob(item.base64, item.mimeType), 'md')
    if (normalized) images.push(normalized)
  }

  return {
    fileName: file.name,
    fileType: isMd ? 'md' : 'txt',
    text,
    images,
    meta: { warnings: warnings.length ? warnings : undefined },
  }
}
