import type { LayoutMode, Platform, StyleSpec } from '@/types/project'
import { getStylePreset } from '@/data/stylePresets'

const RADIUS_DESC: Record<string, string> = {
  none: '直角（rounded-none）',
  sm: '小圆角（按钮/输入 rounded，卡片 rounded-md）',
  md: '中圆角（按钮/输入 rounded-md，卡片 rounded-lg）',
  lg: '大圆角（按钮/输入 rounded-lg，卡片 rounded-2xl）',
  full: '胶囊圆角（按钮 rounded-full，卡片 rounded-3xl）',
}

const DENSITY_DESC: Record<string, string> = {
  compact: '紧凑（区块间距 12-16px，卡片内边距 12-16px，表格行高 40px 左右）',
  comfortable: '舒适（区块间距 16-24px，卡片内边距 16-24px）',
  spacious: '宽松（区块间距 24-40px，卡片内边距 24-32px，大量留白）',
}

const FONT_DESC: Record<string, string> = {
  system: '系统无衬线字体栈',
  serif: '标题用衬线字体（font-serif）制造编辑感，正文无衬线',
  rounded: '圆润亲和的无衬线字体，整体字重偏中等',
}

export const LAYOUT_DESC: Record<LayoutMode, string> = {
  auto: '根据页面类型自行选择最合适的导航框架，但同一产品内保持一致',
  'side-nav': '左侧固定侧边导航栏（含 logo、图标+文字菜单、底部用户区），内容区在右侧',
  'top-nav': '顶部水平导航栏（logo + 菜单 + 用户区），内容区全宽在下方',
  'mixed-nav': '顶部全局栏（logo、搜索、用户）+ 左侧侧边菜单的组合框架',
  none: '不使用全局导航框架（落地页/独立页面式），由页面自身组织信息结构',
  'bottom-tab': '底部固定 Tab 栏（4-5 个入口，激活态主色），顶部简洁标题栏',
  'top-bar': '顶部导航栏（返回/标题/右侧操作），无底部 Tab',
  immersive: '沉浸式布局：无固定导航条，内容铺满视口，操作按钮悬浮放置',
}

/** 把风格预设/自定义描述 + tokens + 布局渲染成注入每次生成的「设计规范」（同项目内容稳定） */
export function buildStyleFragment(styleSpec: StyleSpec, platform: Platform): string {
  const t = styleSpec.tokens
  const canvas =
    platform === 'pc' ? 'PC 桌面端，按 1440px 视口设计' : '移动端 H5，按 375px 视口设计'

  let baseDesc: string
  if (styleSpec.presetId === 'custom') {
    baseDesc = styleSpec.customStyleText?.trim()
      ? `风格基调（用户自定义）：\n${styleSpec.customStyleText.trim()}`
      : '风格基调：现代、简洁、专业。'
  } else {
    const preset = getStylePreset(styleSpec.presetId)
    baseDesc = preset ? `风格基调：${preset.name}。\n${preset.promptFragment}` : ''
  }

  const layout = styleSpec.layout ?? 'auto'
  const layoutLine = `- 布局容器：${LAYOUT_DESC[layout]}${
    styleSpec.layoutNotes?.trim() ? `；补充：${styleSpec.layoutNotes.trim()}` : ''
  }`

  const lines = [
    '【设计规范】本项目所有页面共用此规范，必须严格遵守以保证风格统一。',
    baseDesc,
    '设计 tokens：',
    `- 主色：${t.primaryColor}。Tailwind 中直接使用 primary 色名（如 bg-primary-600、text-primary-600），完整色阶已注入 tailwind.config`,
    t.accentColor
      ? `- 辅助强调色：${t.accentColor}。使用 accent 色名（如 bg-accent-500），用于次要强调、标签、图表第二色，占比远低于主色`
      : '',
    `- 中性色：统一使用 ${t.neutralTone} 系列`,
    `- 圆角：${RADIUS_DESC[t.borderRadius]}`,
    `- 密度：${DENSITY_DESC[t.density]}`,
    `- 字体：${FONT_DESC[t.fontFamily]}`,
    `- 色彩模式：${t.colorMode === 'dark' ? '深色模式（深底浅字，避免大面积纯白）' : '浅色模式（浅底深字）'}`,
    layoutLine,
    `- 画布：${canvas}`,
    styleSpec.customNotes ? `补充要求：${styleSpec.customNotes}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

export function layoutOptionsFor(platform: Platform): { label: string; value: LayoutMode }[] {
  return platform === 'pc'
    ? [
        { label: '自动（AI 决定）', value: 'auto' },
        { label: '侧边导航', value: 'side-nav' },
        { label: '顶部导航', value: 'top-nav' },
        { label: '顶栏 + 侧栏', value: 'mixed-nav' },
        { label: '无导航框架（落地页式）', value: 'none' },
      ]
    : [
        { label: '自动（AI 决定）', value: 'auto' },
        { label: '底部 Tab 栏', value: 'bottom-tab' },
        { label: '顶部导航栏', value: 'top-bar' },
        { label: '沉浸式（无固定导航）', value: 'immersive' },
      ]
}
