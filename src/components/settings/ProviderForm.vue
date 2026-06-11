<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { nanoid } from 'nanoid'
import { useMessage } from 'naive-ui'
import type { ProviderConfig, ProviderProtocol } from '@/types/provider'
import {
  getPresetEndpoint,
  getPresetProtocols,
  providerPresets,
  providerProtocolLabels,
} from '@/data/providerPresets'
import { testProvider } from '@/services/llm/factory'

const props = defineProps<{ show: boolean; provider: ProviderConfig | null }>()
const emit = defineEmits<{
  (e: 'update:show', v: boolean): void
  (e: 'saved', v: ProviderConfig): void
}>()

const message = useMessage()

const isEditing = computed(() => !!props.provider)
const presetChoice = ref<string | null>(null)
const testing = ref(false)
const fetchedModels = ref<string[]>([])

const form = reactive<ProviderConfig>({
  id: '',
  name: '',
  protocol: 'openai',
  baseUrl: '',
  apiKey: '',
  models: [],
  presetId: undefined,
  corsHint: 'unknown',
  useProxy: false,
})

const presetOptions = [
  ...providerPresets.map((p) => ({ label: p.name, value: p.id })),
  { label: '自定义服务商', value: 'custom' },
]

const selectedPreset = computed(() =>
  providerPresets.find((p) => p.id === (form.presetId ?? presetChoice.value)),
)

const protocolOptions = computed(() => {
  const protocols = selectedPreset.value
    ? getPresetProtocols(selectedPreset.value)
    : (['openai', 'anthropic'] as ProviderProtocol[])
  return protocols.map((p) => ({ label: providerProtocolLabels[p], value: p }))
})

const presetNotes = computed(() => {
  return selectedPreset.value?.notes
})

const presetProtocolHelp = computed(() => {
  const preset = selectedPreset.value
  if (!preset) return ''
  const protocols = getPresetProtocols(preset)
  if (protocols.length <= 1) return ''
  return `该预设支持：${protocols.map((p) => providerProtocolLabels[p]).join(' / ')}，切换协议会同步 Base URL`
})

const presetConnectionNotes = computed(() => {
  return (
    selectedPreset.value?.connectionNotes ??
    '直连失败（CORS 报错）时选「本地代理」：请求经本机开发服务器转发，需以 npm run dev / preview 方式运行；静态部署下不可用'
  )
})

const presetLinks = computed(() => {
  const links = selectedPreset.value?.links
  if (!links) return []
  return [
    { label: '官网', href: links.official },
    { label: '文档', href: links.docs },
    { label: 'API Key', href: links.apiKey },
    { label: '模型', href: links.models },
  ].filter((link): link is { label: string; href: string } => !!link.href)
})

watch(
  () => props.show,
  (show) => {
    if (!show) return
    presetChoice.value = props.provider ? (props.provider.presetId ?? 'custom') : null
    testing.value = false
    fetchedModels.value = []
    Object.assign(
      form,
      props.provider ?? {
        id: '',
        name: '',
        protocol: 'openai',
        baseUrl: '',
        apiKey: '',
        models: [],
        presetId: undefined,
        corsHint: 'unknown',
        useProxy: false,
      },
    )
    form.useProxy = props.provider?.useProxy ?? false
    form.models = [...form.models]
  },
)

function onPresetChange(value: string | null) {
  if (!value) return
  if (value === 'custom') {
    form.presetId = undefined
    form.corsHint = 'unknown'
    return
  }
  const preset = providerPresets.find((p) => p.id === value)
  if (!preset) return
  form.name = preset.name
  form.protocol = preset.protocol
  form.baseUrl = getPresetEndpoint(preset, preset.protocol) ?? preset.baseUrl
  form.corsHint = preset.corsHint
  form.presetId = preset.id
  form.useProxy = preset.defaultUseProxy ?? false
  form.models = [...preset.suggestedModels]
}

function onProtocolChange(protocol: ProviderProtocol) {
  const preset = selectedPreset.value
  if (!preset) return
  const endpoint = getPresetEndpoint(preset, protocol)
  if (endpoint) form.baseUrl = endpoint
}

const formVisible = computed(() => isEditing.value || presetChoice.value !== null)
const canTest = computed(() => !!form.baseUrl.trim() && !!form.apiKey.trim())

const fetchedOptions = computed(() =>
  fetchedModels.value.filter((m) => !form.models.includes(m)).map((m) => ({ label: m, value: m })),
)

async function onTest() {
  testing.value = true
  try {
    const { models } = await testProvider({ ...form, models: [...form.models] })
    fetchedModels.value = models
    message.success(models.length ? `连接成功，拉取到 ${models.length} 个模型` : '连接成功')
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    testing.value = false
  }
}

function addFetchedModel(model: string | null) {
  if (model && !form.models.includes(model)) form.models.push(model)
}

function onSave() {
  if (!form.name.trim() || !form.baseUrl.trim() || !form.apiKey.trim()) {
    message.error('请填写名称、Base URL 和 API Key')
    return
  }
  if (!/^https?:\/\//.test(form.baseUrl.trim())) {
    message.error('Base URL 需以 http(s):// 开头')
    return
  }
  const saved: ProviderConfig = {
    ...form,
    id: form.id || nanoid(),
    name: form.name.trim(),
    baseUrl: form.baseUrl.trim().replace(/\/+$/, ''),
    apiKey: form.apiKey.trim(),
    models: [...form.models],
  }
  emit('saved', saved)
  emit('update:show', false)
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    :title="isEditing ? '编辑服务商' : '添加服务商'"
    style="width: 660px"
    @update:show="emit('update:show', $event)"
  >
    <n-form label-placement="left" label-width="92">
      <n-form-item v-if="!isEditing" label="预设">
        <n-select
          v-model:value="presetChoice"
          :options="presetOptions"
          placeholder="选择服务商预设，或自定义"
          @update:value="onPresetChange"
        />
      </n-form-item>
      <template v-if="formVisible">
        <n-form-item label="名称">
          <n-input v-model:value="form.name" placeholder="服务商显示名称" />
        </n-form-item>
        <n-form-item label="协议">
          <n-space vertical size="small" style="width: 100%">
            <n-radio-group v-model:value="form.protocol" @update:value="onProtocolChange">
              <n-radio-button
                v-for="option in protocolOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </n-radio-button>
            </n-radio-group>
            <n-text v-if="presetProtocolHelp" depth="3" style="font-size: 12px">
              {{ presetProtocolHelp }}
            </n-text>
          </n-space>
        </n-form-item>
        <n-form-item v-if="presetLinks.length" label="资料">
          <n-space size="small">
            <a
              v-for="link in presetLinks"
              :key="link.label"
              class="provider-link"
              :href="link.href"
              target="_blank"
              rel="noreferrer"
            >
              {{ link.label }}
            </a>
          </n-space>
        </n-form-item>
        <n-form-item label="连接方式">
          <n-space vertical size="small" style="width: 100%">
            <n-radio-group v-model:value="form.useProxy">
              <n-radio-button :value="false">浏览器直连</n-radio-button>
              <n-radio-button :value="true">本地代理</n-radio-button>
            </n-radio-group>
            <n-text depth="3" style="font-size: 12px">
              {{ presetConnectionNotes }}
            </n-text>
          </n-space>
        </n-form-item>
        <n-form-item label="Base URL">
          <n-input v-model:value="form.baseUrl" placeholder="https://api.example.com/v1" />
        </n-form-item>
        <n-form-item label="API Key">
          <n-input
            v-model:value="form.apiKey"
            type="password"
            show-password-on="click"
            placeholder="仅保存在本机浏览器中"
          />
        </n-form-item>
        <n-form-item label="模型">
          <n-space vertical style="width: 100%">
            <n-dynamic-tags v-model:value="form.models" />
            <n-select
              v-if="fetchedOptions.length"
              :value="null"
              :options="fetchedOptions"
              filterable
              placeholder="从拉取到的模型列表中选择添加"
              @update:value="addFetchedModel"
            />
            <n-text v-if="presetNotes" depth="3" style="font-size: 12px">{{ presetNotes }}</n-text>
          </n-space>
        </n-form-item>
      </template>
    </n-form>
    <template #footer>
      <n-space justify="space-between">
        <n-button :disabled="!canTest" :loading="testing" @click="onTest">
          测试连接 / 拉取模型
        </n-button>
        <n-space>
          <n-button @click="emit('update:show', false)">取消</n-button>
          <n-button type="primary" :disabled="!formVisible" @click="onSave">保存</n-button>
        </n-space>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped>
.provider-link {
  color: var(--n-primary-color);
  font-size: 12px;
  text-decoration: none;
}

.provider-link:hover {
  text-decoration: underline;
}
</style>
