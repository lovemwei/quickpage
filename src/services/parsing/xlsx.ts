import { read, utils } from 'xlsx'
import type { ParsedDocument } from '@/types/parsing'

const MAX_ROWS_PER_SHEET = 200

export async function parseXlsx(file: File): Promise<ParsedDocument> {
  const buffer = await file.arrayBuffer()
  const workbook = read(new Uint8Array(buffer), { type: 'array' })

  const parts: string[] = []
  let truncated = false
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    const csv = utils.sheet_to_csv(sheet, { blankrows: false })
    let lines = csv.split('\n').filter((l) => l.trim() !== '')
    if (lines.length > MAX_ROWS_PER_SHEET) {
      lines = lines.slice(0, MAX_ROWS_PER_SHEET)
      lines.push(`[…该表共超过 ${MAX_ROWS_PER_SHEET} 行，已截断]`)
      truncated = true
    }
    parts.push(`## Sheet: ${name}\n${lines.join('\n')}`)
  }

  return {
    fileName: file.name,
    fileType: 'xlsx',
    text: parts.join('\n\n'),
    images: [],
    meta: {
      sheetNames: workbook.SheetNames,
      truncated: truncated || undefined,
      warnings: ['表格内嵌图片无法提取（SheetJS 社区版限制）'],
    },
  }
}
