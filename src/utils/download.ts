import { saveAs } from 'file-saver'

export function downloadBlob(blob: Blob, fileName: string): void {
  saveAs(blob, fileName)
}

export function downloadText(text: string, fileName: string, mime = 'text/html;charset=utf-8'): void {
  saveAs(new Blob([text], { type: mime }), fileName)
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) || 'untitled'
}
