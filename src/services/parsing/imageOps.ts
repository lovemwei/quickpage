import { nanoid } from 'nanoid'
import type { ExtractedImage, ImageOrigin } from '@/types/parsing'

const MAX_EDGE = 1280
const MIN_EDGE = 32
const MAX_BYTES = 1.5 * 1024 * 1024

/** 解码并标准化图片：过小丢弃、长边压到 1280、PNG 保留透明、其余转 JPEG */
export async function normalizeImage(
  blob: Blob,
  origin: ImageOrigin,
): Promise<ExtractedImage | null> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    return null
  }
  try {
    const { width, height } = bitmap
    if (width < MIN_EDGE || height < MIN_EDGE) return null
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, w, h)

    let out: Blob
    if (blob.type === 'image/png') {
      out = await canvas.convertToBlob({ type: 'image/png' })
      if (out.size > MAX_BYTES) {
        out = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
      }
    } else {
      out = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
    }
    return { id: nanoid(), mimeType: out.type, blob: out, width: w, height: h, origin }
  } catch {
    return null
  } finally {
    bitmap.close()
  }
}
