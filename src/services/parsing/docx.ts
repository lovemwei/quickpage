import mammoth from 'mammoth'
import type { ExtractedImage, ParsedDocument } from '@/types/parsing'
import { base64ToBlob } from '@/utils/blob'
import { normalizeImage } from './imageOps'

function serializeBlock(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const text = (node: Element) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()
  const headingMatch = tag.match(/^h([1-6])$/)
  if (headingMatch) return '#'.repeat(Number(headingMatch[1])) + ' ' + text(el)
  if (tag === 'ul' || tag === 'ol') {
    return [...el.children]
      .map((li, i) => (tag === 'ol' ? `${i + 1}. ` : '- ') + text(li))
      .join('\n')
  }
  if (tag === 'table') {
    return [...el.querySelectorAll('tr')]
      .map(
        (tr) =>
          '| ' +
          [...tr.children].map((td) => text(td).replace(/\|/g, '/')).join(' | ') +
          ' |',
      )
      .join('\n')
  }
  return text(el)
}

export async function parseDocx(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer()
  const collected: { contentType: string; base64: string }[] = []

  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read('base64')
        collected.push({ contentType: image.contentType, base64 })
        return { src: `placeholder://${collected.length - 1}` }
      }),
    },
  )

  const doc = new DOMParser().parseFromString(result.value, 'text/html')
  doc.querySelectorAll('img').forEach((img) => {
    const m = img.getAttribute('src')?.match(/^placeholder:\/\/(\d+)$/)
    img.replaceWith(doc.createTextNode(m ? `[图片${Number(m[1]) + 1}]` : '[图片]'))
  })
  const text = [...doc.body.children]
    .map(serializeBlock)
    .filter(Boolean)
    .join('\n\n')

  const images: ExtractedImage[] = []
  for (const item of collected) {
    const normalized = await normalizeImage(base64ToBlob(item.base64, item.contentType), 'docx')
    if (normalized) images.push(normalized)
  }

  const warnings = result.messages
    .filter((m) => m.type === 'warning')
    .slice(0, 3)
    .map((m) => m.message)

  return {
    fileName: file.name,
    fileType: 'docx',
    text,
    images,
    meta: { warnings: warnings.length ? warnings : undefined },
  }
}
