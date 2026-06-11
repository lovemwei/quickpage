<script setup lang="ts">
import { computed } from 'vue'
import { layoutOptionsFor } from '@/prompts/stylePrompt'
import { useCreateWizardStore } from '@/stores/createWizard'

const wizard = useCreateWizardStore()

const colorModes: Array<'hex'> = ['hex']

const SWATCHES = [
  '#4f46e5',
  '#2563eb',
  '#0891b2',
  '#0d9488',
  '#16a34a',
  '#ca8a04',
  '#ea580c',
  '#dc2626',
  '#db2777',
  '#9333ea',
  '#18181b',
]

const radiusOptions = [
  { label: '直角', value: 'none' },
  { label: '小圆角', value: 'sm' },
  { label: '中圆角', value: 'md' },
  { label: '大圆角', value: 'lg' },
  { label: '全圆角', value: 'full' },
]
const densityOptions = [
  { label: '紧凑', value: 'compact' },
  { label: '舒适', value: 'comfortable' },
  { label: '宽松', value: 'spacious' },
]
const neutralOptions = [
  { label: '中性灰 gray', value: 'gray' },
  { label: '冷灰 slate', value: 'slate' },
  { label: '锌灰 zinc', value: 'zinc' },
  { label: '暖灰 stone', value: 'stone' },
  { label: '纯灰 neutral', value: 'neutral' },
]
const fontOptions = [
  { label: '系统默认', value: 'system' },
  { label: '衬线（编辑感）', value: 'serif' },
  { label: '圆体（亲和）', value: 'rounded' },
]

const layoutOptions = computed(() => layoutOptionsFor(wizard.platform))
const isCustom = computed(() => wizard.presetId === 'custom')

function toggleAccent(enabled: boolean) {
  wizard.tokens.accentColor = enabled ? '#f59e0b' : undefined
}

const RADIUS_PX: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '14px', full: '999px' }

const sample = computed(() => {
  const t = wizard.tokens
  const dark = t.colorMode === 'dark'
  return {
    bg: dark ? '#131316' : '#f4f5f7',
    card: dark ? '#1e1e22' : '#ffffff',
    border: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    text: dark ? '#e4e4e7' : '#27272a',
    sub: dark ? '#a1a1aa' : '#71717a',
    radius: RADIUS_PX[t.borderRadius] ?? '8px',
    primary: t.primaryColor,
    accent: t.accentColor,
    pad: t.density === 'compact' ? '10px' : t.density === 'spacious' ? '20px' : '14px',
    font:
      t.fontFamily === 'serif'
        ? 'Georgia, "Noto Serif SC", serif'
        : t.fontFamily === 'rounded'
          ? '"PingFang SC", "Hiragino Sans GB", sans-serif'
          : 'system-ui, sans-serif',
  }
})
</script>

<template>
  <div class="style-step">
    <div class="left">
      <n-h4 style="margin-top: 0">风格预设</n-h4>
      <div class="preset-grid">
        <div
          v-for="p in wizard.availablePresets"
          :key="p.id"
          class="preset-card"
          :class="{ active: wizard.presetId === p.id }"
          @click="wizard.applyPreset(p.id)"
        >
          <div class="preset-head">
            <span class="preset-name">{{ p.name }}</span>
            <span class="color-dot" :style="{ background: p.tokens.primaryColor }" />
            <n-tag size="tiny" :bordered="false">
              {{ p.tokens.colorMode === 'dark' ? '深色' : '浅色' }}
            </n-tag>
          </div>
          <n-text depth="3" style="font-size: 12px">{{ p.description }}</n-text>
        </div>
        <div
          class="preset-card"
          :class="{ active: isCustom }"
          @click="wizard.applyPreset('custom')"
        >
          <div class="preset-head">
            <span class="preset-name">✏️ 完全自定义</span>
          </div>
          <n-text depth="3" style="font-size: 12px">
            自己描述风格基调，配合下方 tokens 微调
          </n-text>
        </div>
      </div>

      <n-input
        v-if="isCustom"
        v-model:value="wizard.customStyleText"
        type="textarea"
        :rows="4"
        style="margin-bottom: 12px"
        placeholder="描述你想要的风格基调，例如：&#10;整体参照 Notion 的极简文档风：白底、细分割线、低饱和度；导航采用浅灰侧栏；按钮黑色实心；图表只用主色单色系……"
      />

      <n-h4>颜色与质感</n-h4>
      <n-form label-placement="left" label-width="76" size="small">
        <n-form-item label="主色">
          <n-space vertical size="small" style="width: 100%">
            <n-space size="small" align="center">
              <button
                v-for="c in SWATCHES"
                :key="c"
                class="swatch"
                :class="{ active: wizard.tokens.primaryColor.toLowerCase() === c }"
                :style="{ background: c }"
                @click="wizard.tokens.primaryColor = c"
              />
            </n-space>
            <n-color-picker
              v-model:value="wizard.tokens.primaryColor"
              :show-alpha="false"
              :modes="colorModes"
              style="width: 140px"
            />
          </n-space>
        </n-form-item>
        <n-form-item label="辅助色">
          <n-space align="center" size="small">
            <n-switch
              :value="!!wizard.tokens.accentColor"
              size="small"
              @update:value="toggleAccent"
            />
            <n-color-picker
              v-if="wizard.tokens.accentColor"
              v-model:value="wizard.tokens.accentColor"
              :show-alpha="false"
              :modes="colorModes"
              style="width: 140px"
            />
            <n-text v-else depth="3" style="font-size: 12px">关闭（仅用主色）</n-text>
          </n-space>
        </n-form-item>
        <n-form-item label="中性色调">
          <n-select v-model:value="wizard.tokens.neutralTone" :options="neutralOptions" style="width: 170px" />
        </n-form-item>
        <n-form-item label="圆角">
          <n-select v-model:value="wizard.tokens.borderRadius" :options="radiusOptions" style="width: 170px" />
        </n-form-item>
        <n-form-item label="密度">
          <n-select v-model:value="wizard.tokens.density" :options="densityOptions" style="width: 170px" />
        </n-form-item>
        <n-form-item label="字体气质">
          <n-select v-model:value="wizard.tokens.fontFamily" :options="fontOptions" style="width: 170px" />
        </n-form-item>
        <n-form-item label="页面明暗">
          <n-radio-group v-model:value="wizard.tokens.colorMode">
            <n-radio-button value="light">浅色页面</n-radio-button>
            <n-radio-button value="dark">深色页面</n-radio-button>
          </n-radio-group>
        </n-form-item>
      </n-form>

      <n-h4>布局容器</n-h4>
      <n-form label-placement="left" label-width="76" size="small">
        <n-form-item label="导航框架">
          <n-select v-model:value="wizard.layout" :options="layoutOptions" style="width: 240px" />
        </n-form-item>
        <n-form-item label="布局说明">
          <n-input
            v-model:value="wizard.layoutNotes"
            placeholder="可选。如：侧栏可折叠、内容区最大 1200px 居中、双栏布局"
          />
        </n-form-item>
        <n-form-item label="补充要求">
          <n-input
            v-model:value="wizard.customNotes"
            type="textarea"
            :rows="2"
            placeholder="可选。其他风格要求，如：品牌名「云途」需出现在导航、整体偏年轻化"
          />
        </n-form-item>
      </n-form>
    </div>

    <div class="right">
      <n-h4 style="margin-top: 0">小样预览</n-h4>
      <div
        class="sample"
        :style="{ background: sample.bg, fontFamily: sample.font, color: sample.text }"
      >
        <div
          class="sample-nav"
          :style="{ background: sample.card, borderBottom: `1px solid ${sample.border}` }"
        >
          <span :style="{ color: sample.primary, fontWeight: 700 }">● Logo</span>
          <span :style="{ color: sample.sub, fontSize: '12px' }">菜单 一 · 菜单 二</span>
        </div>
        <div class="sample-body" :style="{ padding: sample.pad }">
          <div
            class="sample-card"
            :style="{
              background: sample.card,
              borderRadius: sample.radius,
              border: `1px solid ${sample.border}`,
              padding: sample.pad,
            }"
          >
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px">
              <span style="font-weight: 600">卡片标题</span>
              <span
                v-if="sample.accent"
                :style="{
                  background: sample.accent + '22',
                  color: sample.accent,
                  borderRadius: sample.radius,
                  padding: '1px 8px',
                  fontSize: '11px',
                }"
              >
                标签
              </span>
            </div>
            <div :style="{ color: sample.sub, fontSize: '12px', marginBottom: '12px' }">
              这是一段示例描述文字，展示正文的观感。
            </div>
            <div style="display: flex; gap: 8px">
              <span
                :style="{
                  background: sample.primary,
                  color: '#fff',
                  borderRadius: sample.radius,
                  padding: '6px 14px',
                  fontSize: '12px',
                }"
              >
                主按钮
              </span>
              <span
                :style="{
                  border: `1px solid ${sample.border}`,
                  color: sample.text,
                  borderRadius: sample.radius,
                  padding: '6px 14px',
                  fontSize: '12px',
                }"
              >
                次按钮
              </span>
            </div>
          </div>
        </div>
      </div>
      <n-text depth="3" style="font-size: 12px; display: block; margin-top: 10px">
        该风格规范（含布局容器）将注入本项目所有页面的生成过程，保证多页面风格统一。
      </n-text>
    </div>
  </div>
</template>

<style scoped>
.style-step {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.left {
  flex: 1;
  min-width: 0;
}

.right {
  width: 320px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.preset-card {
  border: 1px solid var(--qp-border, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.preset-card:hover {
  border-color: var(--qp-border-strong, rgba(255, 255, 255, 0.3));
}

.preset-card.active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
}

.preset-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.preset-name {
  font-weight: 600;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.swatch {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}

.swatch.active {
  border-color: #6366f1;
  outline: 1px solid rgba(99, 102, 241, 0.5);
}

.sample {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--qp-border, rgba(255, 255, 255, 0.1));
}

.sample-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
}
</style>
