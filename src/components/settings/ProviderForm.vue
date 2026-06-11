<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { nanoid } from 'nanoid'
import { useMessage } from 'naive-ui'
import type { ProviderConfig } from '@/types/provider'
import { providerPresets } from '@/data/providerPresets'
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
  { label: '自定义（OpenAI 兼容）', value: 'custom' },
]

const presetNotes = computed(() => {
  const preset = providerPresets.find((p) => p.id === (form.presetId ?? presetChoice.value))
  return preset?.notes
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
  form.baseUrl = preset.baseUrl
  form.corsHint = preset.corsHint
  form.presetId = preset.id
  form.models = [...preset.suggestedModels]
}

const formVisible = computed(() => isEditing.value || presetChoice.value !== null)
const canTest = computed(() => !!form.baseUrl.trim() && !!form.apiKey.trim())

const fetchedOptions = computed(() =>
  fetchedModels.value
    .filter((m) => !form.models.includes(m))
    .map((m) => ({ label: m, value: m })),
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
          <n-radio-group v-model:value="form.protocol">
            <n-radio-button value="openai">OpenAI 兼容</n-radio-button>
            <n-radio-button value="anthropic">Anthropic</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="连接方式">
          <n-space vertical size="small" style="width: 100%">
            <n-radio-group v-model:value="form.useProxy">
              <n-radio-button :value="false">浏览器直连</n-radio-button>
              <n-radio-button :value="true">本地代理</n-radio-button>
            </n-radio-group>
            <n-text depth="3" style="font-size: 12px">
              直连失败（CORS 报错）时选「本地代理」：请求经本机开发服务器转发，需以 npm run
              dev / preview 方式运行；静态部署下不可用
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
