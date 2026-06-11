<script setup lang="ts">
import { computed } from 'vue'
import { darkTheme, dateZhCN, zhCN } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const theme = computed(() => (settings.appTheme === 'dark' ? darkTheme : null))

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#6366f1',
    primaryColorHover: '#818cf8',
    primaryColorPressed: '#4f46e5',
    primaryColorSuppl: '#6366f1',
    borderRadius: '6px',
  },
}
</script>

<template>
  <n-config-provider
    class="app-provider"
    :class="settings.appTheme === 'dark' ? 'theme-dark' : 'theme-light'"
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <router-view />
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
    <n-global-style />
  </n-config-provider>
</template>

<style scoped>
.app-provider {
  height: 100%;
}

.theme-dark {
  --qp-border: rgba(255, 255, 255, 0.1);
  --qp-border-strong: rgba(255, 255, 255, 0.28);
  --qp-hover: rgba(255, 255, 255, 0.06);
  --qp-text-faint: rgba(255, 255, 255, 0.4);
  --qp-text-muted: rgba(255, 255, 255, 0.6);
  --qp-pane: rgba(0, 0, 0, 0.22);
  --qp-canvas-bg: #101014;
  --qp-canvas-dot: rgba(255, 255, 255, 0.06);
  --qp-code-text: rgba(220, 225, 240, 0.85);
}

.theme-light {
  --qp-border: rgba(0, 0, 0, 0.1);
  --qp-border-strong: rgba(0, 0, 0, 0.26);
  --qp-hover: rgba(0, 0, 0, 0.045);
  --qp-text-faint: rgba(0, 0, 0, 0.45);
  --qp-text-muted: rgba(0, 0, 0, 0.62);
  --qp-pane: rgba(0, 0, 0, 0.045);
  --qp-canvas-bg: #eceef1;
  --qp-canvas-dot: rgba(0, 0, 0, 0.09);
  --qp-code-text: rgba(30, 35, 50, 0.88);
}
</style>
