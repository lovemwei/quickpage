<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ExtractedImage } from '@/types/parsing'
import { normalizeImage } from '@/services/parsing/imageOps'
import { useWorkbenchStore } from '@/stores/workbench'

const wb = useWorkbenchStore()

const input = ref('')
const listEl = ref<HTMLElement | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)
const attachments = ref<ExtractedImage[]>([])
const thumbUrls = ref(new Map<string, string>())

const QUICK_CHIPS = [
  '整体更紧凑',
  '增加留白，更通透',
  '列表改成卡片式',
  '卡片改成表格',
  '切换为深色页面',
  '切换为浅色页面',
  '颜色更克制，减少彩色',
  '强化数据可视化',
  '主操作按钮更突出',
]

async function onPickFiles(e: Event) {
  const inputEl = e.target as HTMLInputElement
  const files = [...(inputEl.files ?? [])]
  inputEl.value = ''
  for (const file of files.slice(0, 4 - attachments.value.length)) {
    const img = await normalizeImage(file, 'upload')
    if (img) {
      attachments.value.push(img)
      thumbUrls.value.set(img.id, URL.createObjectURL(img.blob))
    }
  }
}

function removeAttachment(id: string) {
  attachments.value = attachments.value.filter((a) => a.id !== id)
  const url = thumbUrls.value.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    thumbUrls.value.delete(id)
  }
}

function clearAttachments() {
  for (const url of thumbUrls.value.values()) URL.revokeObjectURL(url)
  thumbUrls.value.clear()
  attachments.value = []
}

onBeforeUnmount(clearAttachments)

function applyChip(chip: string) {
  input.value = input.value.trim() ? `${input.value.trim()}；${chip}` : chip
}

function send() {
  const text = input.value.trim()
  if (!text || wb.refining || !wb.selectedHtml) return
  const images = attachments.value.length ? [...attachments.value] : undefined
  input.value = ''
  attachments.value = []
  void wb.refineSelected(text, images).finally(() => {
    for (const url of thumbUrls.value.values()) URL.revokeObjectURL(url)
    thumbUrls.value.clear()
  })
}

watch(
  () => [wb.selectedChat.length, wb.refineStream.text.length],
  () => {
    void nextTick(() => listEl.value?.scrollTo({ top: listEl.value.scrollHeight }))
  },
)
</script>

<template>
  <div class="refine-chat">
    <div v-if="wb.selectedChat.length || wb.refining" ref="listEl" class="chat-list">
      <div class="chat-inner">
        <div
          v-for="entry in wb.selectedChat"
          :key="entry.id"
          class="bubble"
          :class="[entry.role, { failed: entry.failed }]"
        >
          {{ entry.text }}
        </div>
        <div v-if="wb.refining" class="bubble assistant streaming">
          <template v-if="wb.refineStream.text">
            已输出 {{ wb.refineStream.text.length.toLocaleString() }} 字符…
          </template>
          <template v-else>思考中…</template>
          <n-button size="tiny" quaternary style="margin-left: 8px" @click="wb.cancelRefine()">
            取消
          </n-button>
        </div>
      </div>
    </div>

    <div v-else class="chat-empty">
      <n-empty size="small" description="用自然语言微调当前页面">
        <template #extra>
          <n-text depth="3" style="font-size: 12px">
            可附参考图让 AI 对齐目标样式
          </n-text>
        </template>
      </n-empty>
    </div>

    <div class="chat-input">
      <div class="chips">
        <span v-for="chip in QUICK_CHIPS" :key="chip" class="chip" @click="applyChip(chip)">
          {{ chip }}
        </span>
      </div>

      <div v-if="attachments.length" class="attachments">
        <div v-for="img in attachments" :key="img.id" class="attach-thumb">
          <img :src="thumbUrls.get(img.id)" alt="" />
          <span class="attach-remove" @click="removeAttachment(img.id)">✕</span>
        </div>
      </div>

      <n-input
        v-model:value="input"
        type="textarea"
        :rows="3"
        :disabled="!wb.selectedHtml"
        :placeholder="wb.selectedHtml ? '描述要修改的内容，Ctrl+Enter 发送' : '页面生成后才能微调'"
        @keydown.ctrl.enter.prevent="send"
      />
      <div class="input-actions">
        <n-button
          size="small"
          quaternary
          :disabled="!wb.selectedHtml || attachments.length >= 4"
          title="附参考图（最多 4 张，需视觉模型）"
          @click="fileEl?.click()"
        >
          📎 参考图
        </n-button>
        <input
          ref="fileEl"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          style="display: none"
          @change="onPickFiles"
        />
        <n-button
          type="primary"
          size="small"
          style="flex: 1"
          :loading="wb.refining"
          :disabled="!input.trim() || !wb.selectedHtml"
          @click="send"
        >
          发送修改要求
        </n-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.refine-chat {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.chat-inner {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bubble {
  max-width: 92%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble.user {
  align-self: flex-end;
  background: rgba(99, 102, 241, 0.25);
}

.bubble.assistant {
  align-self: flex-start;
  background: var(--qp-pane, rgba(255, 255, 255, 0.07));
}

.bubble.failed {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.bubble.streaming {
  display: flex;
  align-items: center;
}

.chat-input {
  padding: 10px 12px 12px;
  border-top: 1px solid var(--qp-border, rgba(255, 255, 255, 0.08));
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.chip {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid var(--qp-border, rgba(255, 255, 255, 0.14));
  cursor: pointer;
  opacity: 0.75;
}

.chip:hover {
  border-color: #6366f1;
  color: #818cf8;
  opacity: 1;
}

.attachments {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.attach-thumb {
  position: relative;
  width: 56px;
  height: 42px;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid var(--qp-border, rgba(255, 255, 255, 0.14));
}

.attach-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attach-remove {
  position: absolute;
  right: 1px;
  top: 1px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.input-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
