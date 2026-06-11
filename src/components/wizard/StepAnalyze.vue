<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCreateWizardStore } from '@/stores/createWizard'
import { useSettingsStore } from '@/stores/settings'
import ModelSelect from '@/components/settings/ModelSelect.vue'

const wizard = useCreateWizardStore()
const settings = useSettingsStore()
const router = useRouter()

const resolved = computed(() => settings.resolveModel('analysis'))
const logEl = ref<HTMLElement | null>(null)

watch(
  () => wizard.streamText + wizard.reasoningText,
  () => {
    void nextTick(() => {
      logEl.value?.scrollTo({ top: logEl.value.scrollHeight })
    })
  },
)
</script>

<template>
  <div>
    <n-alert v-if="!settings.providers.length" type="warning" :bordered="false">
      尚未配置任何服务商。
      <n-button text type="primary" @click="router.push('/settings')">前往设置</n-button>
    </n-alert>

    <template v-else>
      <div class="model-row">
        <n-text depth="3" style="font-size: 12px; flex-shrink: 0">理解模型</n-text>
        <ModelSelect v-model="settings.modelSelection.analysis" size="small" class="model-select" />
        <n-text v-if="wizard.selectedImages.length" depth="3" style="font-size: 12px; flex-shrink: 0">
          将发送 {{ wizard.selectedImages.length }} 张图片（需视觉模型）
        </n-text>
      </div>

      <n-space style="margin-bottom: 14px">
        <n-button
          type="primary"
          :loading="wizard.analyzing"
          :disabled="!wizard.canAnalyze || !resolved"
          @click="wizard.runAnalysis()"
        >
          {{ wizard.analysis ? '重新分析' : '开始分析' }}
        </n-button>
        <n-button v-if="wizard.analyzing" @click="wizard.cancelAnalysis()">取消</n-button>
      </n-space>

      <n-alert v-if="wizard.analysisError" type="error" :bordered="false" style="margin-bottom: 14px">
        {{ wizard.analysisError }}
      </n-alert>

      <div
        v-if="wizard.analyzing || wizard.streamText || wizard.reasoningText"
        ref="logEl"
        class="stream-log"
      >
        <div v-if="wizard.reasoningText" class="reasoning">{{ wizard.reasoningText }}</div>
        <pre class="content">{{ wizard.streamText }}</pre>
        <n-text v-if="wizard.analyzing" depth="3" style="font-size: 12px">▍生成中…</n-text>
      </div>
    </template>
  </div>
</template>

<style scoped>
.model-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.model-select {
  max-width: 480px;
  flex: 1;
}

.stream-log {
  border: 1px solid var(--qp-border);
  border-radius: 8px;
  padding: 14px;
  max-height: 420px;
  overflow: auto;
  background: var(--qp-pane);
}

.reasoning {
  font-size: 12px;
  color: var(--qp-text-faint);
  white-space: pre-wrap;
  word-break: break-all;
  border-left: 2px solid var(--qp-border);
  padding-left: 10px;
  margin-bottom: 10px;
}

.content {
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
}
</style>
