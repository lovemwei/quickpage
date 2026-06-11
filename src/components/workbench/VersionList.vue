<script setup lang="ts">
import type { PageVersion } from '@/types/page'
import { useWorkbenchStore } from '@/stores/workbench'
import { formatTime } from '@/utils/format'

const wb = useWorkbenchStore()

const SOURCE_LABEL: Record<PageVersion['source'], string> = {
  generate: '生成',
  refine: '微调',
  rollback: '回退',
}
</script>

<template>
  <div class="version-list">
    <n-empty
      v-if="!wb.versions.length"
      size="small"
      description="暂无版本"
      style="margin-top: 40px"
    />
    <n-scrollbar v-else>
      <div class="list-inner">
        <div
          v-for="v in wb.versions"
          :key="v.id"
          class="version-item"
          :class="{ current: v.id === wb.selectedPage?.currentVersionId }"
        >
          <div class="version-head">
            <span class="version-no">v{{ v.versionNumber }}</span>
            <n-tag size="tiny" :bordered="false">{{ SOURCE_LABEL[v.source] }}</n-tag>
            <n-tag
              v-if="v.id === wb.selectedPage?.currentVersionId"
              size="tiny"
              type="primary"
              :bordered="false"
            >
              当前
            </n-tag>
            <div style="flex: 1" />
            <n-popconfirm
              v-if="v.id !== wb.selectedPage?.currentVersionId"
              @positive-click="wb.rollbackTo(v)"
            >
              <template #trigger>
                <n-button size="tiny" quaternary type="primary">回退到此版</n-button>
              </template>
              以 v{{ v.versionNumber }} 的内容创建新版本？
            </n-popconfirm>
          </div>
          <div v-if="v.feedbackText" class="version-feedback">「{{ v.feedbackText }}」</div>
          <n-text depth="3" style="font-size: 11px">{{ formatTime(v.createdAt) }}</n-text>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<style scoped>
.version-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-inner {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-item {
  border: 1px solid var(--qp-border);
  border-radius: 8px;
  padding: 10px 12px;
}

.version-item.current {
  border-color: rgba(99, 102, 241, 0.5);
}

.version-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.version-no {
  font-weight: 600;
  font-size: 13px;
}

.version-feedback {
  font-size: 12px;
  color: var(--qp-text-muted);
  margin: 6px 0 2px;
}
</style>
