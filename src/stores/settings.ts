import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { ModelRef, ModelSelection, ProviderConfig } from '@/types/provider'

export interface GenParams {
  /** 批量生成并发数 1–5 */
  concurrency: number
  /** 页面生成 max_tokens */
  maxTokens: number
  temperature: number
  tailwindCdnUrl: string
  /** 需求理解输入 token 预算 */
  analysisInputBudget: number
}

const DEFAULT_GEN_PARAMS: GenParams = {
  concurrency: 3,
  maxTokens: 16000,
  temperature: 0.7,
  tailwindCdnUrl: 'https://cdn.tailwindcss.com',
  analysisInputBudget: 24000,
}

const STORAGE_KEY = 'quickpage:settings'

interface PersistedSettings {
  providers: ProviderConfig[]
  modelSelection: ModelSelection
  genParams: GenParams
  securityNoticeAcknowledged: boolean
  appTheme: 'dark' | 'light'
}

function loadPersisted(): Partial<PersistedSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<PersistedSettings>) : {}
  } catch {
    return {}
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadPersisted()

  const providers = ref<ProviderConfig[]>(saved.providers ?? [])
  const modelSelection = ref<ModelSelection>(
    saved.modelSelection ?? { analysis: null, generation: null },
  )
  const genParams = ref<GenParams>({ ...DEFAULT_GEN_PARAMS, ...saved.genParams })
  const securityNoticeAcknowledged = ref(saved.securityNoticeAcknowledged ?? false)
  const appTheme = ref<'dark' | 'light'>(saved.appTheme ?? 'dark')

  watch(
    [providers, modelSelection, genParams, securityNoticeAcknowledged, appTheme],
    () => {
      const data: PersistedSettings = {
        providers: providers.value,
        modelSelection: modelSelection.value,
        genParams: genParams.value,
        securityNoticeAcknowledged: securityNoticeAcknowledged.value,
        appTheme: appTheme.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
    { deep: true },
  )

  function toggleAppTheme(): void {
    appTheme.value = appTheme.value === 'dark' ? 'light' : 'dark'
  }

  function getProvider(id: string): ProviderConfig | undefined {
    return providers.value.find((p) => p.id === id)
  }

  function upsertProvider(provider: ProviderConfig): void {
    const idx = providers.value.findIndex((p) => p.id === provider.id)
    if (idx >= 0) providers.value[idx] = provider
    else providers.value.push(provider)
  }

  function removeProvider(id: string): void {
    providers.value = providers.value.filter((p) => p.id !== id)
    if (modelSelection.value.analysis?.providerId === id) modelSelection.value.analysis = null
    if (modelSelection.value.generation?.providerId === id) modelSelection.value.generation = null
  }

  /** 解析某用途最终生效的 provider+model（项目级覆盖优先） */
  function resolveModel(
    kind: keyof ModelSelection,
    override?: Partial<ModelSelection>,
  ): { provider: ProviderConfig; model: string } | null {
    const mref: ModelRef | null | undefined = override?.[kind] ?? modelSelection.value[kind]
    if (!mref) return null
    const provider = getProvider(mref.providerId)
    if (!provider || !provider.apiKey) return null
    return { provider, model: mref.model }
  }

  return {
    providers,
    modelSelection,
    genParams,
    securityNoticeAcknowledged,
    appTheme,
    toggleAppTheme,
    getProvider,
    upsertProvider,
    removeProvider,
    resolveModel,
  }
})
