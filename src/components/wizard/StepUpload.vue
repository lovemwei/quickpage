<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { ParsedDocument } from '@/types/parsing'
import { FILE_ACCEPT } from '@/services/parsing'
import { MAX_ANALYSIS_IMAGES } from '@/services/generation/analyzeRequirements'
import { useCreateWizardStore } from '@/stores/createWizard'
import { useSettingsStore } from '@/stores/settings'
import { formatBytes } from '@/utils/format'

const wizard = useCreateWizardStore()
const settings = useSettingsStore()

const dragOver = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)
const previewDoc = ref<ParsedDocument | null>(null)

function onDrop(e: DragEvent) {
  dragOver.value = false
  const files = [...(e.dataTransfer?.files ?? [])]
  if (files.length) void wizard.addFiles(files)
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) void wizard.addFiles([...input.files])
  input.value = ''
}

const typeIcons: Record<string, string> = {
  docx: '📄',
  pdf: '📕',
  xlsx: '📊',
  md: '📝',
  txt: '📝',
  image: '🖼️',
}

const urlMap = reactive(new Map<string, string>())
watch(
  () => wizard.allImages,
  (imgs) => {
    const ids = new Set(imgs.map((i) => i.id))
    for (const [id, url] of urlMap) {
      if (!ids.has(id)) {
        URL.revokeObjectURL(url)
        urlMap.delete(id)
      }
    }
    for (const img of imgs) {
      if (!urlMap.has(img.id)) urlMap.set(img.id, URL.createObjectURL(img.blob))
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  for (const url of urlMap.values()) URL.revokeObjectURL(url)
  urlMap.clear()
})

const budget = computed(() => settings.genParams.analysisInputBudget)
</script>

<template>
  <div>
    <div
      class="dropzone"
      :class="{ over: dragOver }"
      @click="inputEl?.click()"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
    >
      <div style="font-size: 32px">📂</div>
      <div style="font-weight: 600; margin: 6px 0 2px">点击或拖拽上传需求文档</div>
      <n-text depth="3" style="font-size: 12px">
        支持 docx / pdf / xlsx / csv / md / txt，以及 png / jpg 参考图，可多选
      </n-text>
      <input
        ref="inputEl"
        type="file"
        multiple
        :accept="FILE_ACCEPT"
        style="display: none"
        @change="onPick"
      />
    </div>

    <div v-if="wizard.files.length" class="file-list">
      <div v-for="f in wizard.files" :key="f.id" class="file-row">
        <span style="font-size: 18px">{{ typeIcons[f.doc?.fileType ?? ''] ?? '📄' }}</span>
        <div style="flex: 1; min-width: 0">
          <div class="file-name">{{ f.file.name }}</div>
          <n-text depth="3" style="font-size: 12px">
            {{ formatBytes(f.file.size) }}
            <template v-if="f.status === 'done' && f.doc">
              · {{ f.doc.text.length }} 字符 · {{ f.doc.images.length }} 张图片
              <template v-if="f.doc.meta.pageCount"> · {{ f.doc.meta.pageCount }} 页</template>
            </template>
          </n-text>
          <div v-if="f.doc?.meta.warnings?.length">
            <n-text type="warning" style="font-size: 12px">{{ f.doc.meta.warnings[0] }}</n-text>
          </div>
        </div>
        <n-spin v-if="f.status === 'parsing'" :size="16" />
        <n-tag v-else-if="f.status === 'error'" type="error" size="small" :bordered="false">
          {{ f.error }}
        </n-tag>
        <n-button
          v-if="f.status === 'done' && f.doc?.text"
          size="tiny"
          quaternary
          @click="previewDoc = f.doc ?? null"
        >
          预览
        </n-button>
        <n-button size="tiny" quaternary type="error" @click="wizard.removeFile(f.id)">
          移除
        </n-button>
      </div>
    </div>

    <template v-if="wizard.parsedDocs.length">
      <n-alert
        v-if="wizard.overBudget"
        type="warning"
        :bordered="false"
        style="margin-top: 14px"
      >
        文档约 {{ wizard.totalTokens.toLocaleString() }} tokens，超出理解预算
        {{ budget.toLocaleString() }}，分析时将按章节结构截断（可在设置中调大预算）
      </n-alert>
      <n-text v-else depth="3" style="font-size: 12px; display: block; margin-top: 14px">
        合计约 {{ wizard.totalTokens.toLocaleString() }} tokens（预算
        {{ budget.toLocaleString() }}）
      </n-text>
    </template>

    <template v-if="wizard.allImages.length">
      <n-h4 style="margin-bottom: 8px">
        随分析发送的图片
        <n-text depth="3" style="font-size: 12px; font-weight: 400">
          已选 {{ wizard.selectedImageIds.length }}/{{ MAX_ANALYSIS_IMAGES }}（需视觉模型）
        </n-text>
      </n-h4>
      <div class="image-grid">
        <div
          v-for="img in wizard.allImages"
          :key="img.id"
          class="thumb"
          :class="{ selected: wizard.selectedImageIds.includes(img.id) }"
          @click="wizard.toggleImage(img.id)"
        >
          <img :src="urlMap.get(img.id)" alt="" />
          <span v-if="wizard.selectedImageIds.includes(img.id)" class="check">✓</span>
        </div>
      </div>
    </template>

    <n-modal
      :show="!!previewDoc"
      preset="card"
      :title="previewDoc?.fileName"
      style="width: 720px"
      @update:show="previewDoc = null"
    >
      <n-scrollbar style="max-height: 60vh">
        <pre class="doc-preview">{{ previewDoc?.text }}</pre>
      </n-scrollbar>
    </n-modal>
  </div>
</template>

<style scoped>
.dropzone {
  border: 1px dashed var(--qp-border-strong);
  border-radius: 10px;
  padding: 36px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.dropzone:hover,
.dropzone.over {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.06);
}

.file-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--qp-border);
  border-radius: 8px;
}

.file-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.thumb {
  position: relative;
  width: 96px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  background: var(--qp-hover);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb.selected {
  border-color: #6366f1;
}

.check {
  position: absolute;
  right: 4px;
  top: 2px;
  color: #fff;
  background: #6366f1;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doc-preview {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.7;
  margin: 0;
  font-family: inherit;
}
</style>
