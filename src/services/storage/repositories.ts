import { nanoid } from 'nanoid'
import { db, type SourceDoc, type StoredAsset } from './db'
import type { Project } from '@/types/project'
import type { Page, PageVersion, PageVersionSource } from '@/types/page'

const MAX_VERSIONS_PER_PAGE = 20

export const projectRepo = {
  list(): Promise<Project[]> {
    return db.projects.orderBy('updatedAt').reverse().toArray()
  },

  get(id: string): Promise<Project | undefined> {
    return db.projects.get(id)
  },

  async create(project: Project): Promise<void> {
    await db.projects.add(project)
  },

  async update(id: string, patch: Partial<Omit<Project, 'id'>>): Promise<void> {
    await db.projects.update(id, { ...patch, updatedAt: Date.now() })
  },

  /** 级联删除项目及其页面、版本、源文档、图片资产 */
  async removeCascade(id: string): Promise<void> {
    await db.transaction(
      'rw',
      [db.projects, db.pages, db.pageVersions, db.sourceDocs, db.assets],
      async () => {
        const pageIds = (await db.pages.where('projectId').equals(id).primaryKeys()) as string[]
        await db.pageVersions.where('pageId').anyOf(pageIds).delete()
        await db.pages.where('projectId').equals(id).delete()
        await db.sourceDocs.where('projectId').equals(id).delete()
        await db.assets.where('projectId').equals(id).delete()
        await db.projects.delete(id)
      },
    )
  },
}

export const pageRepo = {
  listByProject(projectId: string): Promise<Page[]> {
    return db.pages.where('projectId').equals(projectId).sortBy('sortOrder')
  },

  get(id: string): Promise<Page | undefined> {
    return db.pages.get(id)
  },

  async bulkCreate(pages: Page[]): Promise<void> {
    await db.pages.bulkAdd(pages)
  },

  async create(page: Page): Promise<void> {
    await db.pages.add(page)
  },

  async update(id: string, patch: Partial<Omit<Page, 'id'>>): Promise<void> {
    await db.pages.update(id, { ...patch, updatedAt: Date.now() })
  },

  async remove(id: string): Promise<void> {
    await db.transaction('rw', [db.pages, db.pageVersions], async () => {
      await db.pageVersions.where('pageId').equals(id).delete()
      await db.pages.delete(id)
    })
  },

  /** 刷新/崩溃后残留的 generating/queued 状态重置为 failed */
  async resetStale(projectId: string): Promise<void> {
    await db.pages
      .where('projectId')
      .equals(projectId)
      .filter((p) => p.genStatus === 'generating' || p.genStatus === 'queued')
      .modify({ genStatus: 'failed', errorMessage: '生成被中断，可重试' })
  },
}

export const versionRepo = {
  async listByPage(pageId: string): Promise<PageVersion[]> {
    const versions = await db.pageVersions.where('pageId').equals(pageId).sortBy('versionNumber')
    return versions.reverse()
  },

  get(id: string): Promise<PageVersion | undefined> {
    return db.pageVersions.get(id)
  },

  /** 新增版本：写版本、置为当前版本、裁剪历史 */
  async add(
    pageId: string,
    html: string,
    source: PageVersionSource,
    feedbackText?: string,
  ): Promise<PageVersion> {
    return db.transaction('rw', [db.pages, db.pageVersions], async () => {
      const existing = await db.pageVersions.where('pageId').equals(pageId).sortBy('versionNumber')
      const version: PageVersion = {
        id: nanoid(),
        pageId,
        versionNumber: (existing.at(-1)?.versionNumber ?? 0) + 1,
        html,
        source,
        feedbackText,
        createdAt: Date.now(),
      }
      await db.pageVersions.add(version)
      await db.pages.update(pageId, {
        currentVersionId: version.id,
        genStatus: 'done',
        errorMessage: undefined,
        updatedAt: Date.now(),
      })
      if (existing.length + 1 > MAX_VERSIONS_PER_PAGE) {
        const surplus = existing.slice(0, existing.length + 1 - MAX_VERSIONS_PER_PAGE)
        await db.pageVersions.bulkDelete(surplus.map((v) => v.id))
      }
      return version
    })
  },
}

export const docRepo = {
  async bulkCreate(docs: SourceDoc[]): Promise<void> {
    await db.sourceDocs.bulkAdd(docs)
  },

  listByProject(projectId: string): Promise<SourceDoc[]> {
    return db.sourceDocs.where('projectId').equals(projectId).toArray()
  },
}

export const assetRepo = {
  async bulkCreate(assets: StoredAsset[]): Promise<void> {
    await db.assets.bulkAdd(assets)
  },

  listByProject(projectId: string): Promise<StoredAsset[]> {
    return db.assets.where('projectId').equals(projectId).toArray()
  },
}

/** 工作台一次性读取：项目 + 页面 + 当前版本 HTML */
export async function loadWorkbench(projectId: string): Promise<{
  project: Project
  pages: Page[]
  htmlByPage: Map<string, string>
} | null> {
  const project = await db.projects.get(projectId)
  if (!project) return null
  await pageRepo.resetStale(projectId)
  const pages = await pageRepo.listByProject(projectId)
  const versionIds = pages.map((p) => p.currentVersionId).filter((v): v is string => !!v)
  const versions = await db.pageVersions.bulkGet(versionIds)
  const htmlByPage = new Map<string, string>()
  for (const v of versions) {
    if (v) htmlByPage.set(v.pageId, v.html)
  }
  return { project, pages, htmlByPage }
}

export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota }
}
