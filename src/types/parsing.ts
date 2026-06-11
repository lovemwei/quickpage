export type ImageOrigin = 'docx' | 'pdf' | 'md' | 'upload'

export interface ExtractedImage {
  id: string
  mimeType: string
  blob: Blob
  width?: number
  height?: number
  origin: ImageOrigin
}

export interface ParsedDocument {
  fileName: string
  fileType: 'docx' | 'pdf' | 'xlsx' | 'md' | 'txt' | 'image'
  text: string
  images: ExtractedImage[]
  meta: {
    pageCount?: number
    sheetNames?: string[]
    truncated?: boolean
    warnings?: string[]
  }
}
