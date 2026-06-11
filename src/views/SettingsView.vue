<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDialog, useMessage } from 'naive-ui'
import type { ProviderConfig } from '@/types/provider'
import { useSettingsStore } from '@/stores/settings'
import { testProvider } from '@/services/llm/factory'
import { db } from '@/services/storage/db'
import { estimateUsage } from '@/services/storage/repositories'
import { formatBytes } from '@/utils/format'
import ProviderCard from '@/components/settings/ProviderCard.vue'
import ProviderForm from '@/components/settings/ProviderForm.vue'
import ModelSelect from '@/components/settings/ModelSelect.vue'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const settings = useSettingsStore()

const formShow = ref(false)
const editingProvider = ref<ProviderConfig | null>(null)
const testingId = ref<string | null>(null)
const usageText = ref('')

function openCreate() {
  editingProvider.value = null
  formShow.value = true
}

function openEdit(provider: ProviderConfig) {
  editingProvider.value = provider
  formShow.value = true
}

function onSaved(provider: ProviderConfig) {
  settings.upsertProvider(provider)
  message.success('已保存')
  if (provider.apiKey && !settings.securityNoticeAcknowledged) {
    dialog.warning({
      title: '安全提示',
      content:
        'API Key 仅以明文保存在本机浏览器的 localStorage 中，不会上传到任何服务器。请勿在公用电脑上使用，也不要将本应用部署到公网供他人访问。',
      positiveText: '我已知晓',
      onPositiveClick: () => {
        settings.securityNoticeAcknowledged = true
      },
    })
  }
}

async function handleTest(provider: ProviderConfig) {
  testingId.value = provider.id
  try {
    const { models } = await testProvider(provider)
    message.success(models.length ? `连接成功，可用模型 ${models.length} 个` : '连接成功')
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    testingId.value = null
  }
}

async function refreshUsage() {
  const usage = await estimateUsage()
  usageText.value = usage
    ? `已用 ${formatBytes(usage.usage)} / 配额约 ${formatBytes(usage.quota)}`
    : '当前浏览器不支持容量查询'
}

function confirmClearData() {
  dialog.warning({
    title: '清空全部项目数据',
    content:
      '将删除所有项目、页面、版本历史与文档资产（IndexedDB），服务商设置保留。此操作不可恢复，确定继续？',
    positiveText: '清空',
    negativeText: '取消',
    onPositiveClick: async () => {
      await db.delete()
      message.success('已清空，页面即将刷新')
      setTimeout(() => location.reload(), 600)
    },
  })
}

onMounted(refreshUsage)
</script>

<template>
  <div class="settings-page">
    <n-page-header title="设置" @back="router.push('/')" />

    <n-h3>服务商</n-h3>
    <n-alert type="info" :bordered="false" style="margin-bottom: 16px">
      API Key 仅保存在本机浏览器中，所有请求由浏览器直连服务商。部分国内服务商可能不支持浏览器直连（CORS），可用「测试连接」验证。
    </n-alert>
    <n-grid :cols="2" :x-gap="12" :y-gap="12">
      <n-grid-item v-for="p in settings.providers" :key="p.id">
        <ProviderCard
          :provider="p"
          :testing="testingId === p.id"
          @edit="openEdit(p)"
          @remove="settings.removeProvider(p.id)"
          @test="handleTest(p)"
        />
      </n-grid-item>
      <n-grid-item>
        <n-button dashed block style="height: 100%; min-height: 120px" @click="openCreate">
          + 添加服务商
        </n-button>
      </n-grid-item>
    </n-grid>

    <n-h3>默认模型</n-h3>
    <n-form label-placement="left" label-width="110">
      <n-form-item label="需求理解模型">
        <n-space vertical style="width: 100%" size="small">
          <ModelSelect v-model="settings.modelSelection.analysis" />
          <n-text depth="3" style="font-size: 12px">
            需求文档包含图片时，需选择支持视觉输入的模型
          </n-text>
        </n-space>
      </n-form-item>
      <n-form-item label="页面生成模型">
        <ModelSelect v-model="settings.modelSelection.generation" />
      </n-form-item>
    </n-form>

    <n-h3>生成参数</n-h3>
    <n-form label-placement="left" label-width="110">
      <n-form-item label="并发数">
        <n-slider
          v-model:value="settings.genParams.concurrency"
          :min="1"
          :max="5"
          :step="1"
          :marks="{ 1: '1', 3: '3', 5: '5' }"
          style="max-width: 320px"
        />
      </n-form-item>
      <n-form-item label="生成 maxTokens">
        <n-input-number
          v-model:value="settings.genParams.maxTokens"
          :min="4000"
          :max="64000"
          :step="1000"
          style="width: 200px"
        />
      </n-form-item>
      <n-form-item label="温度">
        <n-slider
          v-model:value="settings.genParams.temperature"
          :min="0"
          :max="1.5"
          :step="0.1"
          style="max-width: 320px"
        />
      </n-form-item>
      <n-form-item label="理解输入预算">
        <n-space align="center">
          <n-input-number
            v-model:value="settings.genParams.analysisInputBudget"
            :min="8000"
            :max="128000"
            :step="4000"
            style="width: 200px"
          />
          <n-text depth="3" style="font-size: 12px">tokens，超出将结构化截断文档</n-text>
        </n-space>
      </n-form-item>
      <n-form-item label="Tailwind CDN">
        <n-input
          v-model:value="settings.genParams.tailwindCdnUrl"
          placeholder="https://cdn.tailwindcss.com"
          style="max-width: 420px"
        />
      </n-form-item>
    </n-form>

    <n-h3>数据管理</n-h3>
    <n-space align="center">
      <n-text depth="2">{{ usageText }}</n-text>
      <n-button size="small" quaternary @click="refreshUsage">刷新</n-button>
      <n-button size="small" type="error" secondary @click="confirmClearData">
        清空全部项目数据
      </n-button>
    </n-space>

    <ProviderForm v-model:show="formShow" :provider="editingProvider" @saved="onSaved" />
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px;
}
</style>
