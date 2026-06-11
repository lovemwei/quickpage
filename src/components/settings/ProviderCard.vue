<script setup lang="ts">
import { computed } from 'vue'
import type { ProviderConfig } from '@/types/provider'
import { corsHintLabels, providerProtocolLabels } from '@/data/providerPresets'

const props = defineProps<{ provider: ProviderConfig; testing: boolean }>()
defineEmits<{
  (e: 'edit'): void
  (e: 'remove'): void
  (e: 'test'): void
}>()

const maskedKey = computed(() => {
  const key = props.provider.apiKey
  if (!key) return '未填写 Key'
  if (key.length <= 8) return '••••'
  return `${key.slice(0, 4)}••••${key.slice(-4)}`
})

const cors = computed(() => corsHintLabels[props.provider.corsHint])
</script>

<template>
  <n-card size="small">
    <template #header>
      <span>{{ provider.name }}</span>
    </template>
    <template #header-extra>
      <n-space size="small">
        <n-tag size="small" :bordered="false">
          {{ providerProtocolLabels[provider.protocol] }}
        </n-tag>
        <n-tag v-if="provider.useProxy" size="small" :bordered="false" type="info">本地代理</n-tag>
        <n-tag v-else size="small" :bordered="false" :type="cors.type">{{ cors.label }}</n-tag>
      </n-space>
    </template>
    <n-space vertical size="small">
      <n-text depth="3" style="font-size: 12px; word-break: break-all">{{
        provider.baseUrl
      }}</n-text>
      <n-text depth="3" style="font-size: 12px">
        {{ maskedKey }} · {{ provider.models.length }} 个模型
      </n-text>
    </n-space>
    <template #action>
      <n-space justify="end" size="small">
        <n-button size="small" quaternary :loading="testing" @click="$emit('test')">测试</n-button>
        <n-button size="small" quaternary @click="$emit('edit')">编辑</n-button>
        <n-popconfirm @positive-click="$emit('remove')">
          <template #trigger>
            <n-button size="small" quaternary type="error">删除</n-button>
          </template>
          确定删除该服务商？引用它的模型选择会被清空。
        </n-popconfirm>
      </n-space>
    </template>
  </n-card>
</template>
