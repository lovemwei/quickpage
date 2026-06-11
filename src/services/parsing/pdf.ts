import * as pdfjs from 'pdfjs-dist'
import type { ExtractedImage, ParsedDocument } from '@/types/parsing'
import { normalizeImage } from './imageOps'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const SCAN_TEXT_THRESHOLD = 50
const SCAN_MAX_PAGES = 10

interface RawImage {
  width: number
  height: number
  data?: Uint8Array | Uint8ClampedArray
  kind?: number
  bitmap?: ImageBitmap
}

async function rawImageToBlob(img: RawImage): Promise<Blob | null> {
  const { width, height } = img
  if (!width || !height) return null
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0)
  } else if (img.data) {
    const d = img.data
    const rgba = new Uint8ClampedArray(width * height * 4)
    if (img.kind === 3) {
      rgba.set(d.subarray(0, rgba.length))
    } else if (img.kind === 2) {
      for (let i = 0, j = 0; j < rgba.length; i += 3, j += 4) {
        rgba[j] = d[i]!
        rgba[j + 1] = d[i + 1]!
        rgba[j + 2] = d[i + 2]!
        rgba[j + 3] = 255
      }
    } else {
      return null
    }
    ctx.putImageData(new ImageData(rgba, width, height), 0, 0)
  } else {
    return null
  }
  return canvas.convertToBlob({ type: 'image/png' })
}

async function extractPageImages(
  page: pdfjs.PDFPageProxy,
  images: ExtractedImage[],
): Promise<void> {
  const ops = await page.getOperatorList()
  const seen = new Set<string>()
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] !== pdfjs.OPS.paintImageXObject) continue
    const name = ops.argsArray[i]?.[0] as string | undefined
    if (!name || seen.has(name)) continue
    seen.add(name)
    try {
      const raw = await new Promise<RawImage | null>((resolve) => {
        try {
          page.objs.get(name, (obj: unknown) => resolve(obj as RawImage | null))
        } catch {
          resolve(null)
        }
      })
      if (!raw) continue
      const blob = await rawImageToBlob(raw)
      if (!blob) continue
      const normalized = await normalizeImage(blob, 'pdf')
      if (normalized) images.push(normalized)
    } catch {
      /* 单图失败跳过 */
    }
  }
}

async function renderPageAsImage(
  page: pdfjs.PDFPageProxy,
  images: ExtractedImage[],
): Promise<void> {
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = Math.min(2, 1280 / baseViewport.width)
  const viewport = page.getViewport({ scale })
  const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  } as Parameters<typeof page.render>[0]).promise
  const blob = await canvas.convertToBlob({ type: 'image/png' })
  const normalized = await normalizeImage(blob, 'pdf')
  if (normalized) images.push(normalized)
}

export async function parsePdf(file: File): Promise<ParsedDocument> {
  const data = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data }).promise
  try {
    const pageTexts: string[] = []
    const images: ExtractedImage[] = []
    const warnings: string[] = []

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      let line = ''
      const lines: string[] = []
      for (const item of content.items) {
        if ('str' in item) {
          line += item.str
          if (item.hasEOL) {
            lines.push(line)
            line = ''
          }
        }
      }
      if (line) lines.push(line)
      pageTexts.push(lines.join('\n').trim())
      try {
        await extractPageImages(page, images)
      } catch {
        /* 整页图片提取失败跳过 */
      }
    }

    const totalChars = pageTexts.reduce((n, t) => n + t.length, 0)
    const avgChars = totalChars / doc.numPages
    if (avgChars < SCAN_TEXT_THRESHOLD && doc.numPages <= SCAN_MAX_PAGES) {
      images.length = 0
      for (let i = 1; i <= doc.numPages; i++) {
        await renderPageAsImage(await doc.getPage(i), images)
      }
      warnings.push('该 PDF 几乎没有可提取文本（疑似扫描件），已将整页转为图片，需求理解需选择支持视觉的模型')
    }

    return {
      fileName: file.name,
      fileType: 'pdf',
      text: pageTexts.filter(Boolean).join('\n\n'),
      images,
      meta: {
        pageCount: doc.numPages,
        warnings: warnings.length ? warnings : undefined,
      },
    }
  } finally {
    await doc.destroy()
  }
}
