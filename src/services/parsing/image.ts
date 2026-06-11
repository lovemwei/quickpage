import type { ParsedDocument } from '@/types/parsing'
import { normalizeImage } from './imageOps'

export async function parseImageFile(file: File): Promise<ParsedDocument> {
  const normalized = await normalizeImage(file, 'upload')
  return {
    fileName: file.name,
    fileType: 'image',
    text: normalized ? `[参考图：${file.name}]` : '',
    images: normalized ? [normalized] : [],
    meta: { warnings: normalized ? undefined : ['图片无法解码，已忽略'] },
  }
}
