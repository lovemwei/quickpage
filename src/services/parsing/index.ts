import type { ExtractedImage, ParsedDocument } from '@/types/parsing'
import { parseDocx } from './docx'
import { parseImageFile } from './image'
import { parseText } from './text'
import { parseXlsx } from './xlsx'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif']
const DOC_EXTENSIONS = ['docx', 'pdf', 'xlsx', 'xls', 'csv', 'md', 'markdown', 'txt']

export const SUPPORTED_EXTENSIONS = [...DOC_EXTENSIONS, ...IMAGE_EXTENSIONS]

export const FILE_ACCEPT = SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

function extOf(name: string): string {
  return name.slice(name.lastIndexOf('.') + 1).toLowerCase()
}

export async function parseFile(file: File): Promise<ParsedDocument> {
  const ext = extOf(file.name)
  if (ext === 'docx') return parseDocx(file)
  if (ext === 'pdf') {
    const { parsePdf } = await import('./pdf')
    return parsePdf(file)
  }
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return parseXlsx(file)
  if (ext === 'md' || ext === 'markdown' || ext === 'txt') return parseText(file)
  if (IMAGE_EXTENSIONS.includes(ext)) return parseImageFile(file)
  if (ext === 'doc') throw new Error('不支持旧版 .doc 格式，请在 Word 中另存为 .docx')
  throw new Error(`不支持的文件格式：.${ext}`)
}

/** 多文档合并为单个需求理解输入 */
export function mergeDocuments(docs: ParsedDocument[]): {
  text: string
  images: ExtractedImage[]
} {
  const text = docs
    .map((d) => `===== 文件: ${d.fileName} =====\n\n${d.text}`)
    .join('\n\n')
  return { text, images: docs.flatMap((d) => d.images) }
}
