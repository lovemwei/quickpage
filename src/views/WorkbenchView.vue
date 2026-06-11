<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkbenchStore } from '@/stores/workbench'
import { useSettingsStore } from '@/stores/settings'
import { getStylePreset } from '@/data/stylePresets'
import PagePanel from '@/components/workbench/PagePanel.vue'
import CanvasPanel from '@/components/workbench/CanvasPanel.vue'
import RefineChat from '@/components/workbench/RefineChat.vue'
import VersionList from '@/components/workbench/VersionList.vue'
import PageInfoForm from '@/components/workbench/PageInfoForm.vue'
import ExportMenu from '@/components/workbench/ExportMenu.vue'
import ModelSelect from '@/components/settings/ModelSelect.vue'

const route = useRoute()
const router = useRouter()
const wb = useWorkbenchStore()
const settings = useSettingsStore()

function loadFromRoute() {
  const id = route.params.id as string
  if (!id) return
  const autostart = route.query.autostart === '1'
  if (autostart) void router.replace({ path: route.path })
  void wb.load(id, autostart)
}

onMounted(loadFromRoute)
watch(
  () => route.params.id,
  () => {
    if (route.name === 'workbench') loadFromRoute()
  },
)
</script>

<template>
  <div class="workbench">
    <header class="topbar">
      <n-button quaternary size="small" @click="router.push('/')">← 项目</n-button>
      <span class="project-name">{{ wb.project?.name ?? '加载中…' }}</span>
      <n-tag v-if="wb.project" size="small" :bordered="false">
        {{ wb.project.platform === 'pc' ? 'PC Web' : '移动端 H5' }}
      </n-tag>
      <n-tag v-if="wb.project" size="small" :bordered="false">
        {{ getStylePreset(wb.project.styleSpec.presetId)?.name ?? '自定义风格' }}
        <span
          class="style-dot"
          :style="{ background: wb.project.styleSpec.tokens.primaryColor }"
        />
      </n-tag>
      <div style="flex: 1" />
      <div class="topbar-model">
        <n-text depth="3" style="font-size: 12px; flex-shrink: 0">生成模型</n-text>
        <ModelSelect v-model="settings.modelSelection.generation" size="tiny" style="flex: 1" />
      </div>
      <ExportMenu />
      <n-button
        size="small"
        quaternary
        :title="settings.appTheme === 'dark' ? '切换到浅色' : '切换到深色'"
        @click="settings.toggleAppTheme()"
      >
        {{ settings.appTheme === 'dark' ? '🌙' : '☀️' }}
      </n-button>
      <n-button size="small" quaternary @click="router.push('/settings')">设置</n-button>
    </header>

    <div v-if="wb.loadError" class="load-error">
      <n-result status="404" title="项目不存在" :description="wb.loadError">
        <template #footer>
          <n-button type="primary" @click="router.push('/')">返回项目列表</n-button>
        </template>
      </n-result>
    </div>

    <n-spin v-else-if="wb.loading" class="load-error" />

    <div v-else class="columns">
      <aside class="col-left">
        <PagePanel />
      </aside>
      <main class="col-center">
        <CanvasPanel />
      </main>
      <aside class="col-right">
        <n-tabs type="line" size="small" default-value="refine" class="inspector-tabs">
          <n-tab-pane name="refine" tab="微调">
            <RefineChat />
          </n-tab-pane>
          <n-tab-pane name="versions" tab="版本">
            <VersionList />
          </n-tab-pane>
          <n-tab-pane name="info" tab="信息">
            <PageInfoForm />
          </n-tab-pane>
        </n-tabs>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.workbench {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--qp-border);
  flex-shrink: 0;
}

.project-name {
  font-weight: 600;
  font-size: 14px;
}

.style-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: 4px;
  vertical-align: -1px;
}

.topbar-model {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 400px;
}

.load-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.columns {
  flex: 1;
  min-height: 0;
  display: flex;
}

.col-left {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--qp-border);
}

.col-center {
  flex: 1;
  min-width: 0;
}

.col-right {
  width: 330px;
  flex-shrink: 0;
  border-left: 1px solid var(--qp-border);
}

.inspector-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.inspector-tabs :deep(.n-tabs-nav) {
  padding: 0 14px;
  flex-shrink: 0;
}

.inspector-tabs :deep(.n-tabs-pane-wrapper),
.inspector-tabs :deep(.n-tab-pane) {
  height: 100%;
  padding: 0 !important;
}

.inspector-tabs :deep(.n-tabs-pane-wrapper) {
  flex: 1;
  min-height: 0;
}
</style>
