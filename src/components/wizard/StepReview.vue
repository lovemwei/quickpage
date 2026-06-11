<script setup lang="ts">
import { computed } from 'vue'
import { nanoid } from 'nanoid'
import type { PageSpec } from '@/types/analysis'
import { useCreateWizardStore } from '@/stores/createWizard'

const wizard = useCreateWizardStore()

const analysis = computed(() => wizard.analysis)

const moduleOptions = computed(
  () => analysis.value?.modules.map((m) => ({ label: m.name, value: m.id })) ?? [],
)

function pagesOf(moduleId: string): PageSpec[] {
  return analysis.value?.pages.filter((p) => p.moduleId === moduleId) ?? []
}

function addPage(moduleId: string) {
  const a = analysis.value
  if (!a) return
  const page: PageSpec = { id: nanoid(), name: '新页面', moduleId, description: '', blocks: [] }
  let insertAt = a.pages.length
  for (let i = a.pages.length - 1; i >= 0; i--) {
    if (a.pages[i]!.moduleId === moduleId) {
      insertAt = i + 1
      break
    }
  }
  a.pages.splice(insertAt, 0, page)
}

function removePage(id: string) {
  const a = analysis.value
  if (!a) return
  a.pages = a.pages.filter((p) => p.id !== id)
}

function movePage(id: string, dir: -1 | 1) {
  const a = analysis.value
  if (!a) return
  const pages = a.pages
  const idx = pages.findIndex((p) => p.id === id)
  if (idx < 0) return
  const moduleId = pages[idx]!.moduleId
  let j = idx + dir
  while (j >= 0 && j < pages.length && pages[j]!.moduleId !== moduleId) j += dir
  if (j < 0 || j >= pages.length) return
  ;[pages[idx], pages[j]] = [pages[j]!, pages[idx]!]
}

function addModule() {
  analysis.value?.modules.push({ id: nanoid(), name: '新模块', description: '' })
}

function removeModule(id: string) {
  const a = analysis.value
  if (!a || pagesOf(id).length > 0) return
  a.modules = a.modules.filter((m) => m.id !== id)
}
</script>

<template>
  <div v-if="analysis">
    <n-card size="small" style="margin-bottom: 16px">
      <n-form label-placement="left" label-width="76" size="small">
        <n-form-item label="产品名称">
          <n-input v-model:value="analysis.productName" style="max-width: 360px" />
        </n-form-item>
        <n-form-item label="产品概述">
          <n-input v-model:value="analysis.overview" type="textarea" :rows="2" />
        </n-form-item>
      </n-form>
    </n-card>

    <div v-for="mod in analysis.modules" :key="mod.id" class="module-block">
      <div class="module-head">
        <n-input
          v-model:value="mod.name"
          size="small"
          style="width: 200px; font-weight: 600"
        />
        <n-text depth="3" style="font-size: 12px; flex: 1">{{ mod.description }}</n-text>
        <n-button size="tiny" quaternary @click="addPage(mod.id)">+ 添加页面</n-button>
        <n-button
          size="tiny"
          quaternary
          type="error"
          :disabled="pagesOf(mod.id).length > 0"
          @click="removeModule(mod.id)"
        >
          删除模块
        </n-button>
      </div>

      <div v-for="page in pagesOf(mod.id)" :key="page.id" class="page-row">
        <div class="page-main">
          <div style="display: flex; gap: 10px; align-items: center">
            <n-input v-model:value="page.name" size="small" style="width: 180px" placeholder="页面名" />
            <n-select
              v-model:value="page.moduleId"
              size="small"
              :options="moduleOptions"
              style="width: 150px"
            />
            <div style="flex: 1" />
            <n-button size="tiny" quaternary @click="movePage(page.id, -1)">↑</n-button>
            <n-button size="tiny" quaternary @click="movePage(page.id, 1)">↓</n-button>
            <n-popconfirm @positive-click="removePage(page.id)">
              <template #trigger>
                <n-button size="tiny" quaternary type="error">删除</n-button>
              </template>
              删除「{{ page.name }}」？
            </n-popconfirm>
          </div>
          <n-input
            v-model:value="page.description"
            size="small"
            placeholder="页面用途描述"
            style="margin: 8px 0"
          />
          <n-dynamic-tags v-model:value="page.blocks" size="small" />
        </div>
      </div>
    </div>

    <n-button dashed size="small" style="margin-top: 4px" @click="addModule">+ 添加模块</n-button>

    <n-alert
      v-if="!analysis.pages.length"
      type="warning"
      :bordered="false"
      style="margin-top: 14px"
    >
      页面清单为空，请至少保留一个页面
    </n-alert>
  </div>
</template>

<style scoped>
.module-block {
  margin-bottom: 18px;
}

.module-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.page-row {
  border: 1px solid var(--qp-border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}
</style>
