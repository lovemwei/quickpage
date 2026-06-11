<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Platform } from '@/types/project'

const props = defineProps<{ html: string; platform: Platform; zoom: number | 'fit' }>()

const containerEl = ref<HTMLElement | null>(null)
const containerSize = ref({ w: 800, h: 600 })
let ro: ResizeObserver | null = null

onMounted(() => {
  ro = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (rect) containerSize.value = { w: rect.width, h: rect.height }
  })
  if (containerEl.value) ro.observe(containerEl.value)
})
onBeforeUnmount(() => ro?.disconnect())

const base = computed(() =>
  props.platform === 'pc' ? { w: 1440, h: 900 } : { w: 375, h: 812 },
)

const scale = computed(() => {
  if (props.zoom !== 'fit') return props.zoom
  const pad = 40
  const s = Math.min(
    (containerSize.value.w - pad) / base.value.w,
    (containerSize.value.h - pad) / base.value.h,
  )
  return Math.min(1, Math.max(0.08, s))
})
</script>

<template>
  <div ref="containerEl" class="frame-container">
    <div
      class="frame-outer"
      :class="{ phone: platform === 'mobile' }"
      :style="{ width: base.w * scale + 'px', height: base.h * scale + 'px' }"
    >
      <iframe
        class="frame"
        sandbox="allow-scripts"
        :srcdoc="html"
        :style="{
          width: base.w + 'px',
          height: base.h + 'px',
          transform: `scale(${scale})`,
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.frame-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.frame-outer {
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.45);
  background: #fff;
  flex-shrink: 0;
}

.frame-outer.phone {
  border-radius: 18px;
  outline: 6px solid #2a2a30;
}

.frame {
  border: 0;
  transform-origin: top left;
  display: block;
  background: #fff;
}
</style>
