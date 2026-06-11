import JSZip from 'jszip'
import type { Page } from '@/types/page'
import type { Project } from '@/types/project'
import { downloadBlob, sanitizeFileName } from '@/utils/download'
import { buildExportHtml } from './exportHtml'

interface IndexEntry {
  file: string
  name: string
  module: string
}

function buildIndexHtml(project: Project, entries: IndexEntry[]): string {
  const groups = new Map<string, IndexEntry[]>()
  for (const e of entries) {
    const list = groups.get(e.module) ?? []
    list.push(e)
    groups.set(e.module, list)
  }
  const sections = [...groups.entries()]
    .map(
      ([module, list]) => `
    <section>
      <h2>${module}</h2>
      <ul>${list
        .map((e) => `<li><a href="${e.file}" target="_blank">${e.name}</a></li>`)
        .join('')}</ul>
    </section>`,
    )
    .join('')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${project.name} — UI 设计稿</title>
<style>
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#18181b}
h1{font-size:24px}h2{font-size:15px;color:#52525b;margin:28px 0 8px;border-bottom:1px solid #e4e4e7;padding-bottom:6px}
ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}
li a{display:inline-block;padding:8px 14px;border:1px solid #e4e4e7;border-radius:8px;color:#18181b;text-decoration:none;font-size:14px}
li a:hover{border-color:#6366f1;color:#6366f1}
p{color:#71717a;font-size:13px}
</style>
</head>
<body>
<h1>${project.name}</h1>
<p>${project.analysis?.overview ?? ''}</p>
<p>平台：${project.platform === 'pc' ? 'PC Web' : '移动端 H5'} · 共 ${entries.length} 个页面 · 由 UI Agent 生成</p>
${sections}
</body>
</html>`
}

export async function exportProjectZip(
  project: Project,
  items: { page: Page; html: string; groupName: string }[],
  opts: { inlineTailwind: boolean; onProgress?: (done: number, total: number) => void },
): Promise<void> {
  const zip = new JSZip()
  const used = new Set<string>()
  const entries: IndexEntry[] = []
  let done = 0
  for (const { page, html, groupName } of items) {
    const base = sanitizeFileName(page.spec.name)
    let file = `${base}.html`
    for (let i = 2; used.has(file); i++) file = `${base}-${i}.html`
    used.add(file)
    const out = await buildExportHtml(html, project.platform, opts.inlineTailwind)
    zip.file(`pages/${file}`, out)
    entries.push({
      file: `pages/${file}`,
      name: page.spec.name,
      module: groupName,
    })
    done++
    opts.onProgress?.(done, items.length)
  }
  zip.file('index.html', buildIndexHtml(project, entries))
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${sanitizeFileName(project.name)}-UI设计.zip`)
}
