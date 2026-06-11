<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDialog } from 'naive-ui'
import type { Page, PageGenStatus } from '@/types/page'
import { useWorkbenchStore } from '@/stores/workbench'

const wb = useWorkbenchStore()
const dialog = useDialog()

const addShow = ref(false)
const addName = ref('')
const addModuleId = ref<string | null>(null)

const moduleOptions = computed(
  () =>
    wb.project?.analysis?.modules.map((m) => ({ label: m.name, value: m.id })) ?? [],
)

const STATUS_META: Record<PageGenStatus, { label: string; color: string }> = {
  idle: { label: '未生成', color: 'rgba(255,255,255,0.25)' },
  queued: { label: '排队中', color: '#f59e0b' },
  generating: { label: '生成中', color: '#6366f1' },
  done: { label: '完成', color: '#22c55e' },
  failed: { label: '失败', color: '#ef4444' },
}

function confirmRemove(page: Page) {
  dialog.warning({
    title: '删除页面',
    content: `删除「${page.spec.name}」及其全部版本历史？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => wb.removePage(page.id),
  })
}

function submitAdd() {
  const name = addName.value.trim()
  const moduleId = addModuleId.value ?? wb.project?.analysis?.modules[0]?.id
  if (!name || !moduleId) return
  void wb.addPage(name, moduleId)
  addShow.value = false
  addName.value = ''
}

function openAdd() {
  addModuleId.value = wb.project?.analysis?.modules[0]?.id ?? null
  addShow.value = true
}
</script>

<template>
  <div class="page-panel">
    <div class="panel-head">
      <n-progress
        type="line"
        :percentage="wb.progress.total ? Math.round((wb.progress.done / wb.progress.total) * 100) : 0"
        :show-indicator="false"
        :height="4"
      />
      <div class="head-row">
        <n-text depth="3" style="font-size: 12px">
          {{ wb.progress.done }}/{{ wb.progress.total }} 页完成
          <template v-if="wb.progress.active">· {{ wb.progress.active }} 进行中</template>
        </n-text>
        <n-space size="small">
          <n-button
            v-if="wb.progress.failed"
            size="tiny"
            type="warning"
            secondary
            @click="wb.retryFailed()"
          >
            重试失败
          </n-button>
          <n-button v-if="wb.progress.active" size="tiny" secondary @click="wb.cancelAll()">
            全部停止
          </n-button>
          <n-button
            v-else
            size="tiny"
            secondary
            type="primary"
            :disabled="!wb.pages.length"
            @click="wb.generatePages(wb.pages.filter((p) => p.genStatus !== 'done').map((p) => p.id))"
          >
            生成未完成
          </n-button>
        </n-space>
      </div>
    </div>

    <n-scrollbar class="panel-body">
      <div v-for="group in wb.pagesByModule" :key="group.moduleId" class="module-group">
        <div class="module-name">{{ group.moduleName }}</div>
        <div
          v-for="page in group.pages"
          :key="page.id"
          class="page-item"
          :class="{ active: wb.selectedPageId === page.id }"
          @click="wb.selectPage(page.id)"
        >
          <n-spin v-if="page.genStatus === 'generating'" :size="10" class="status-spin" />
          <span
            v-else
            class="status-dot"
            :style="{ background: STATUS_META[page.genStatus].color }"
            :title="STATUS_META[page.genStatus].label"
          />
          <span class="page-name">{{ page.spec.name }}</span>
          <span class="item-actions" @click.stop>
            <n-button
              size="tiny"
              quaternary
              title="重新生成"
              :disabled="page.genStatus === 'generating' || page.genStatus === 'queued'"
              @click="wb.generatePages([page.id])"
            >
              ↻
            </n-button>
            <n-button size="tiny" quaternary type="error" title="删除" @click="confirmRemove(page)">
              ✕
            </n-button>
          </span>
        </div>
      </div>
    </n-scrollbar>

    <div class="panel-foot">
      <n-button size="small" dashed block @click="openAdd">+ 新增页面</n-button>
    </div>

    <n-modal
      v-model:show="addShow"
      preset="card"
      title="新增页面"
      style="width: 420px"
    >
      <n-form label-placement="left" label-width="64" size="small">
        <n-form-item label="页面名">
          <n-input v-model:value="addName" placeholder="如：会员中心" @keyup.enter="submitAdd" />
        </n-form-item>
        <n-form-item label="模块">
          <n-select v-model:value="addModuleId" :options="moduleOptions" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="addShow = false">取消</n-button>
          <n-button type="primary" :disabled="!addName.trim()" @click="submitAdd">添加</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.page-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-head {
  padding: 12px 14px 8px;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  gap: 8px;
}

.panel-body {
  flex: 1;
}

.module-group {
  padding: 6px 8px;
}

.module-name {
  font-size: 11px;
  color: var(--qp-text-faint);
  padding: 6px 8px 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.page-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.page-item:hover {
  background: var(--qp-hover);
}

.page-item.active {
  background: rgba(99, 102, 241, 0.16);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-spin {
  flex-shrink: 0;
}

.page-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-actions {
  display: none;
  flex-shrink: 0;
}

.page-item:hover .item-actions {
  display: inline-flex;
}

.panel-foot {
  padding: 10px 14px;
  border-top: 1px solid var(--qp-border);
}
</style>
