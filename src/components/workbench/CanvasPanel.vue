<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWorkbenchStore } from '@/stores/workbench'
import SandboxFrame from './SandboxFrame.vue'
import StreamingCodePane from './StreamingCodePane.vue'

const wb = useWorkbenchStore()

const zoom = ref<number | 'fit'>('fit')
const zoomOptions = [
  { label: '适应', value: 'fit' },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
]

const liveHtml = ref('')
let throttleTimer: number | undefined

watch(
  () => wb.selectedStream?.text ?? '',
  (text) => {
    if (!text) {
      liveHtml.value = ''
      if (throttleTimer) {
        clearTimeout(throttleTimer)
        throttleTimer = undefined
      }
      return
    }
    if (throttleTimer) return
    throttleTimer = window.setTimeout(() => {
      throttleTimer = undefined
      liveHtml.value = wb.selectedStream?.text ?? ''
    }, 1500)
  },
)

watch(
  () => wb.selectedPageId,
  () => {
    liveHtml.value = ''
  },
)
</script>

<template>
  <div class="canvas-panel">
    <div class="toolbar">
      <span class="page-title">{{ wb.selectedPage?.spec.name ?? '未选择页面' }}</span>
      <n-select
        :value="zoom"
        :options="zoomOptions"
        size="tiny"
        style="width: 90px"
        @update:value="(v: number | 'fit') => (zoom = v)"
      />
      <div style="flex: 1" />
      <template v-if="wb.selectedPage && !wb.selectedPage.spec.groupOnly">
        <n-button
          v-if="wb.selectedPage.genStatus === 'generating' || wb.selectedPage.genStatus === 'queued'"
          size="tiny"
          secondary
          @click="wb.cancelPage(wb.selectedPage.id)"
        >
          取消生成
        </n-button>
        <n-button
          v-else
          size="tiny"
          secondary
          type="primary"
          @click="wb.regenerateSelected()"
        >
          {{ wb.selectedHtml ? '重新生成' : '生成' }}
        </n-button>
      </template>
    </div>

    <div class="canvas-body">
      <template v-if="!wb.selectedPage">
        <n-empty description="左侧选择一个页面" class="center" />
      </template>

      <template v-else-if="wb.selectedPage.spec.groupOnly">
        <n-empty description="这是导航分组节点，不生成页面" class="center" />
      </template>

      <template v-else-if="wb.selectedPage.genStatus === 'generating' && wb.selectedStream">
        <div class="generating-split">
          <div class="live-preview">
            <SandboxFrame
              v-if="liveHtml"
              :html="liveHtml"
              :platform="wb.project!.platform"
              :zoom="zoom"
            />
            <n-empty v-else description="正在等待模型输出…" class="center" />
          </div>
          <div class="live-code">
            <StreamingCodePane :stream="wb.selectedStream" />
          </div>
        </div>
      </template>

      <template v-else-if="wb.selectedPage.genStatus === 'queued'">
        <n-empty description="排队等待生成…" class="center" />
      </template>

      <template v-else-if="wb.selectedPage.genStatus === 'failed' && !wb.selectedHtml">
        <div class="center">
          <n-result status="error" title="生成失败" :description="wb.selectedPage.errorMessage">
            <template #footer>
              <n-button type="primary" @click="wb.regenerateSelected()">重试</n-button>
            </template>
          </n-result>
        </div>
      </template>

      <template v-else-if="wb.selectedHtml">
        <n-alert
          v-if="wb.selectedPage.genStatus === 'failed'"
          type="warning"
          :bordered="false"
          closable
          style="margin: 8px 12px 0"
        >
          上次生成失败：{{ wb.selectedPage.errorMessage }}（当前展示历史版本）
        </n-alert>
        <SandboxFrame :html="wb.selectedHtml" :platform="wb.project!.platform" :zoom="zoom" />
      </template>

      <template v-else>
        <div class="center">
          <n-empty description="该页面还未生成">
            <template #extra>
              <n-button type="primary" @click="wb.regenerateSelected()">立即生成</n-button>
            </template>
          </n-empty>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.canvas-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--qp-border);
}

.page-title {
  font-size: 13px;
  font-weight: 600;
}

.canvas-body {
  flex: 1;
  min-height: 0;
  position: relative;
  background:
    radial-gradient(var(--qp-canvas-dot) 1px, transparent 1px) 0 0 / 22px 22px,
    var(--qp-canvas-bg);
  display: flex;
  flex-direction: column;
}

.center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.generating-split {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.live-preview {
  flex: 1.4;
  min-height: 0;
  display: flex;
}

.live-code {
  flex: 1;
  min-height: 0;
}
</style>
