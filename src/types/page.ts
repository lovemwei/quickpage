import type { PageSpec } from './analysis'

export type PageGenStatus = 'idle' | 'queued' | 'generating' | 'done' | 'failed'

export interface Page {
  id: string
  projectId: string
  spec: PageSpec
  sortOrder: number
  genStatus: PageGenStatus
  errorMessage?: string
  currentVersionId?: string
  updatedAt: number
}

export type PageVersionSource = 'generate' | 'refine' | 'rollback'

export interface PageVersion {
  id: string
  pageId: string
  versionNumber: number
  html: string
  source: PageVersionSource
  feedbackText?: string
  createdAt: number
}
