<script setup lang="ts">
import { useCreateWizardStore } from '@/stores/createWizard'

const wizard = useCreateWizardStore()

const platforms = [
  {
    value: 'pc' as const,
    title: 'PC Web',
    desc: '管理后台、SaaS、官网等桌面端网页，1440px 设计稿',
    icon: '🖥️',
  },
  {
    value: 'mobile' as const,
    title: '移动端 H5',
    desc: 'App 式手机页面，375px 视口，底部 Tab 导航',
    icon: '📱',
  },
]
</script>

<template>
  <div>
    <n-form label-placement="top">
      <n-form-item label="项目名称（可留空，将自动取自需求理解结果）">
        <n-input
          v-model:value="wizard.projectName"
          placeholder="如：供应链管理系统"
          style="max-width: 420px"
        />
      </n-form-item>
      <n-form-item label="目标平台">
        <div class="platform-cards">
          <div
            v-for="p in platforms"
            :key="p.value"
            class="platform-card"
            :class="{ active: wizard.platform === p.value }"
            @click="wizard.platform = p.value"
          >
            <div class="platform-icon">{{ p.icon }}</div>
            <div>
              <div class="platform-title">{{ p.title }}</div>
              <n-text depth="3" style="font-size: 12px">{{ p.desc }}</n-text>
            </div>
          </div>
        </div>
      </n-form-item>
    </n-form>
  </div>
</template>

<style scoped>
.platform-cards {
  display: flex;
  gap: 16px;
}

.platform-card {
  display: flex;
  gap: 14px;
  align-items: center;
  width: 320px;
  padding: 18px 20px;
  border: 1px solid var(--qp-border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.platform-card:hover {
  border-color: var(--qp-border-strong);
}

.platform-card.active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
}

.platform-icon {
  font-size: 28px;
}

.platform-title {
  font-weight: 600;
  margin-bottom: 2px;
}
</style>
