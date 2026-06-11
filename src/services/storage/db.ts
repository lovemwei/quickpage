import Dexie, { type EntityTable } from 'dexie'
import type { Project } from '@/types/project'
import type { Page, PageVersion } from '@/types/page'
import type { ImageOrigin, ParsedDocument } from '@/types/parsing'

/** 持久化的源文档（解析后的文本与元信息，不存原始文件） */
export interface SourceDoc {
  id: string
  projectId: string
  fileName: string
  fileType: ParsedDocument['fileType']
  text: string
  meta: ParsedDocument['meta']
}

/** 从文档中提取的图片资产 */
export interface StoredAsset {
  id: string
  projectId: string
  docId: string
  mimeType: string
  blob: Blob
  origin: ImageOrigin
}

export const db = new Dexie('quickpage') as Dexie & {
  projects: EntityTable<Project, 'id'>
  pages: EntityTable<Page, 'id'>
  pageVersions: EntityTable<PageVersion, 'id'>
  sourceDocs: EntityTable<SourceDoc, 'id'>
  assets: EntityTable<StoredAsset, 'id'>
}

db.version(1).stores({
  projects: 'id, updatedAt',
  pages: 'id, projectId, [projectId+sortOrder]',
  pageVersions: 'id, pageId, [pageId+versionNumber], createdAt',
  sourceDocs: 'id, projectId',
  assets: 'id, projectId, docId',
})
