<script setup lang="ts">
import { computed } from 'vue'
import type { ModelRef } from '@/types/provider'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{
  modelValue: ModelRef | null
  size?: 'tiny' | 'small' | 'medium'
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: ModelRef | null): void }>()

const settings = useSettingsStore()

const providerOptions = computed(() =>
  settings.providers.map((p) => ({ label: p.name, value: p.id })),
)

const modelOptions = computed(() => {
  const provider = props.modelValue ? settings.getProvider(props.modelValue.providerId) : undefined
  return (provider?.models ?? []).map((m) => ({ label: m, value: m }))
})

function onProviderChange(providerId: string | null) {
  if (!providerId) {
    emit('update:modelValue', null)
    return
  }
  const provider = settings.getProvider(providerId)
  emit('update:modelValue', { providerId, model: provider?.models[0] ?? '' })
}

function onModelChange(model: string | null) {
  if (!props.modelValue) return
  emit('update:modelValue', { ...props.modelValue, model: model ?? '' })
}
</script>

<template>
  <div style="display: flex; gap: 12px">
    <n-select
      style="width: 240px"
      :size="size"
      :value="modelValue?.providerId ?? null"
      :options="providerOptions"
      placeholder="选择服务商"
      clearable
      @update:value="onProviderChange"
    />
    <n-select
      style="flex: 1"
      :size="size"
      :value="modelValue?.model || null"
      :options="modelOptions"
      placeholder="选择或输入模型名"
      filterable
      tag
      :disabled="!modelValue"
      @update:value="onModelChange"
    />
  </div>
</template>
