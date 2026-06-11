<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useWorkbenchStore } from '@/stores/workbench'
import { exportPagePng } from '@/services/export/screenshot'
import { exportPageHtml } from '@/services/export/exportHtml'
import { exportProjectZip } from '@/services/export/exportZip'
import { sanitizeFileName } from '@/utils/download'

const wb = useWorkbenchStore()
const message = useMessage()
const exporting = ref(false)

const options = computed(() => [
  { label: '当前页 PNG（2x）', key: 'png', disabled: !wb.selectedHtml },
  { label: '当前页 HTML（自包含）', key: 'html', disabled: !wb.selectedHtml },
  { label: '整项目 ZIP', key: 'zip', disabled: !wb.pages.some((p) => wb.htmlByPage.has(p.id)) },
])

async function handle(key: string | number) {
  const project = wb.project
  if (!project || exporting.value) return
  exporting.value = true
  const loading = message.loading('正在导出…', { duration: 0 })
  try {
    if (key === 'png' && wb.selectedPage) {
      const bg = project.styleSpec.tokens.colorMode === 'dark' ? '#0b0b0e' : '#ffffff'
      await exportPagePng(
        wb.selectedHtml,
        project.platform,
        `${sanitizeFileName(wb.selectedPage.spec.name)}.png`,
        bg,
      )
    } else if (key === 'html' && wb.selectedPage) {
      await exportPageHtml(
        wb.selectedHtml,
        project.platform,
        `${sanitizeFileName(wb.selectedPage.spec.name)}.html`,
      )
    } else if (key === 'zip') {
      const items = wb.pages
        .filter((p) => wb.htmlByPage.has(p.id))
        .map((p) => ({ page: p, html: wb.htmlByPage.get(p.id)! }))
      await exportProjectZip(project, items, {
        inlineTailwind: true,
        onProgress: (done, total) => {
          loading.content = `正在导出… ${done}/${total} 页`
        },
      })
    }
    message.success('导出完成')
  } catch (e) {
    message.error(`导出失败：${(e as Error).message}`)
  } finally {
    loading.destroy()
    exporting.value = false
  }
}
</script>

<template>
  <n-dropdown trigger="click" :options="options" @select="handle">
    <n-button size="small" secondary :loading="exporting">导出</n-button>
  </n-dropdown>
</template>
