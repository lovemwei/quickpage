<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { StreamState } from '@/stores/workbench'

const props = defineProps<{ stream: StreamState }>()

const el = ref<HTMLElement | null>(null)

const tail = computed(() => {
  const t = props.stream.text
  return t.length > 4000 ? '…' + t.slice(-4000) : t
})

const reasoningTail = computed(() => {
  const t = props.stream.reasoning
  return t.length > 1500 ? '…' + t.slice(-1500) : t
})

watch(
  () => props.stream.text.length + props.stream.reasoning.length,
  () => {
    void nextTick(() => el.value?.scrollTo({ top: el.value.scrollHeight }))
  },
)
</script>

<template>
  <div ref="el" class="code-pane">
    <div v-if="reasoningTail" class="reasoning">{{ reasoningTail }}</div>
    <pre class="code">{{ tail }}</pre>
    <div class="meta">已输出 {{ stream.text.length.toLocaleString() }} 字符 ▍</div>
  </div>
</template>

<style scoped>
.code-pane {
  height: 100%;
  overflow: auto;
  padding: 14px;
  background: var(--qp-pane);
  border-radius: 8px;
}

.reasoning {
  font-size: 11px;
  color: var(--qp-text-faint);
  white-space: pre-wrap;
  word-break: break-all;
  border-left: 2px solid var(--qp-border);
  padding-left: 10px;
  margin-bottom: 10px;
}

.code {
  margin: 0;
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: 11.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--qp-code-text);
}

.meta {
  margin-top: 8px;
  font-size: 11px;
  color: var(--qp-text-faint);
}
</style>
