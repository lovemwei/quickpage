<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useCreateWizardStore } from '@/stores/createWizard'
import StepBasic from '@/components/wizard/StepBasic.vue'
import StepStyle from '@/components/wizard/StepStyle.vue'
import StepUpload from '@/components/wizard/StepUpload.vue'
import StepAnalyze from '@/components/wizard/StepAnalyze.vue'
import StepReview from '@/components/wizard/StepReview.vue'

const wizard = useCreateWizardStore()
const router = useRouter()
const message = useMessage()
const creating = ref(false)

const canNext = computed(() => {
  switch (wizard.step) {
    case 1:
    case 2:
      return true
    case 3:
      return wizard.canAnalyze && !wizard.files.some((f) => f.status === 'parsing')
    default:
      return false
  }
})

async function onCreate() {
  if (!wizard.analysis?.pages.length) {
    message.error('页面清单为空，无法创建')
    return
  }
  creating.value = true
  try {
    const id = await wizard.createProject()
    wizard.reset()
    void router.push({ path: `/project/${id}`, query: { autostart: '1' } })
  } catch (e) {
    message.error((e as Error).message)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="wizard-page">
    <n-page-header title="创建项目" @back="router.push('/')" />

    <n-steps :current="wizard.step" size="small" class="steps">
      <n-step title="基本信息" />
      <n-step title="设计风格" />
      <n-step title="上传文档" />
      <n-step title="需求理解" />
      <n-step title="清单审核" />
    </n-steps>

    <div class="step-body">
      <StepBasic v-if="wizard.step === 1" />
      <StepStyle v-else-if="wizard.step === 2" />
      <StepUpload v-else-if="wizard.step === 3" />
      <StepAnalyze v-else-if="wizard.step === 4" />
      <StepReview v-else-if="wizard.step === 5" />
    </div>

    <div class="wizard-footer">
      <n-button v-if="wizard.step > 1" :disabled="wizard.analyzing" @click="wizard.step--">
        上一步
      </n-button>
      <div style="flex: 1" />
      <n-button v-if="wizard.step < 4" type="primary" :disabled="!canNext" @click="wizard.step++">
        下一步
      </n-button>
      <n-button
        v-if="wizard.step === 5"
        type="primary"
        :loading="creating"
        :disabled="!wizard.analysis?.pages.length"
        @click="onCreate"
      >
        创建项目并开始生成
      </n-button>
    </div>
  </div>
</template>

<style scoped>
.wizard-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.steps {
  margin: 20px 0 28px;
}

.step-body {
  flex: 1;
}

.wizard-footer {
  display: flex;
  gap: 12px;
  padding: 20px 0 8px;
  margin-top: 16px;
  border-top: 1px solid var(--qp-border);
}
</style>
