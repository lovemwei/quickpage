import type { DesignTokens, Platform } from '@/types/project'

export interface StylePreset {
  id: string
  name: string
  description: string
  platforms: Platform[]
  tokens: DesignTokens
  /** 面向 LLM 的风格描述，与 tokens 一起合成「设计规范」 */
  promptFragment: string
}

export const stylePresets: StylePreset[] = [
  {
    id: 'modern-admin',
    name: '现代简约后台',
    description: '清爽明亮的 B 端管理系统风格，信息密度适中，适合后台 / SaaS 产品',
    platforms: ['pc'],
    tokens: {
      primaryColor: '#4f46e5',
      neutralTone: 'slate',
      borderRadius: 'md',
      fontFamily: 'system',
      density: 'comfortable',
      colorMode: 'light',
    },
    promptFragment: `整体气质：现代、克制、专业的 B 端管理系统。
布局：左侧深色窄导航栏（含 logo、图标+文字菜单、底部用户头像），顶部白色工具栏（面包屑、搜索框、通知铃铛、头像），内容区浅灰背景上铺白色圆角卡片。
组件：卡片用细边框 + 极浅阴影（shadow-sm）；表格行高适中、斑马纹可选、表头浅灰底；按钮主色实心、次要按钮白底细边框；表单控件统一高度 40px 左右。
数据可视化：统计卡片（大数字 + 趋势小箭头 + 迷你折线），用纯 CSS/SVG 绘制。
留白：模块间 24px、卡片内边距 24px，井然有序，避免拥挤。`,
  },
  {
    id: 'tech-dark',
    name: '科技深色',
    description: '深色底 + 霓虹点缀的科技感风格，适合监控大屏、开发者工具、数据产品',
    platforms: ['pc'],
    tokens: {
      primaryColor: '#22d3ee',
      neutralTone: 'zinc',
      borderRadius: 'md',
      fontFamily: 'system',
      density: 'comfortable',
      colorMode: 'dark',
    },
    promptFragment: `整体气质：深邃的科技感，类似现代开发者工具 / 数据监控平台。
配色：近黑深底（zinc-950 背景、zinc-900 卡片），主色作为霓虹高亮用于数字、图表线条、活跃状态；辅以少量紫色/绿色渐变点缀；文字以 zinc-300 为主、标题白色。
布局：顶部细导航或左侧图标导航，内容区网格化卡片布局。
组件：卡片用 zinc-800 细边框、内部微弱渐变；关键数字用大号等宽字体 + 主色发光效果（text-shadow / drop-shadow）；图表用 SVG 折线/面积图带渐变填充；状态点用发光小圆点。
细节：分割线极细且低对比；hover 状态边框亮起；避免纯白大面积区域。`,
  },
  {
    id: 'glass-dashboard',
    name: '玻璃拟态仪表盘',
    description: '渐变背景 + 毛玻璃卡片的轻盈质感，适合数据看板、个人工具、展示型产品',
    platforms: ['pc'],
    tokens: {
      primaryColor: '#8b5cf6',
      neutralTone: 'slate',
      borderRadius: 'lg',
      fontFamily: 'system',
      density: 'spacious',
      colorMode: 'dark',
    },
    promptFragment: `整体气质：轻盈通透的玻璃拟态（glassmorphism）。
背景：深色底上铺大面积柔和渐变光斑（紫→蓝→粉，用 fixed 定位的模糊圆形 div 实现，blur-3xl）。
组件：卡片用半透明白（bg-white/10）+ backdrop-blur-xl + 1px 半透明白边框（border-white/20）+ 大圆角；按钮和标签同样半透明质感，主操作用主色渐变实心。
文字：白色标题 + white/60 正文，保证可读性。
布局：宽松的网格布局，卡片间距 24px 以上；顶部悬浮玻璃导航条。
图表：SVG 渐变面积图、圆环进度，线条用主色到透明的渐变。`,
  },
  {
    id: 'minimal-doc',
    name: '极简黑白',
    description: '黑白灰为主的极简风格，大量留白，适合内容型产品、官网、工具站',
    platforms: ['pc'],
    tokens: {
      primaryColor: '#18181b',
      neutralTone: 'zinc',
      borderRadius: 'sm',
      fontFamily: 'system',
      density: 'spacious',
      colorMode: 'light',
    },
    promptFragment: `整体气质：极简、安静、内容优先，类似 Linear / Vercel 的官网气质。
配色：纯白背景，文字近黑（zinc-900）与中灰（zinc-500）两级，主操作用纯黑实心按钮，几乎不用彩色；必要的状态色降低饱和度。
布局：大量留白，居中窄栏或宽松网格；顶部极简导航（logo + 少量链接 + 一个主按钮）。
组件：边框极细（zinc-200）、小圆角、无阴影或极浅阴影；分割线代替卡片包裹；表格线条极简。
字体：标题用粗壮的无衬线大字号，正文行高宽松（leading-relaxed）。
细节：图标线性细描边；hover 仅做轻微背景变化。`,
  },
  {
    id: 'fresh-mobile',
    name: '清新移动端',
    description: '圆润亲和的移动 App 风格，明快配色，适合生活服务、健康、社区类应用',
    platforms: ['mobile'],
    tokens: {
      primaryColor: '#10b981',
      neutralTone: 'gray',
      borderRadius: 'lg',
      fontFamily: 'rounded',
      density: 'comfortable',
      colorMode: 'light',
    },
    promptFragment: `整体气质：清新、圆润、有亲和力的移动 App。
布局：375px 视口；顶部状态栏区域留白；底部 Tab 栏（4-5 个图标+文字，激活态主色，含中央凸起主操作按钮可选）；内容区浅灰背景（gray-50）铺白色大圆角卡片（rounded-2xl）。
组件：搜索框胶囊形；标签/筹码（chip）圆角全圆；按钮大圆角、主色实心、高度 48px 适合拇指点击；列表项带缩略图圆角方块。
配色：白色为主，主色用于按钮/图标/激活态，搭配 1-2 个柔和的辅助色块（浅黄、浅蓝）做卡片底色点缀。
细节：图标圆润填充风格；卡片阴影柔和（shadow-sm）；信息层级靠字号和字重区分。`,
  },
  {
    id: 'vibrant-commerce',
    name: '活力电商',
    description: '高饱和促销氛围的移动电商风格，适合商城、营销活动、本地生活类应用',
    platforms: ['mobile'],
    tokens: {
      primaryColor: '#f43f5e',
      neutralTone: 'gray',
      borderRadius: 'lg',
      fontFamily: 'system',
      density: 'compact',
      colorMode: 'light',
    },
    promptFragment: `整体气质：热闹、有购买冲动的移动电商。
布局：375px 视口；顶部主色渐变区域（搜索框 + 分类入口）；金刚区图标网格（4-5 列圆形彩色图标）；横向滚动的促销卡片；瀑布流双列商品卡（图占位 + 标题 + 价格红色加粗 + 已售标签）；底部 Tab 栏。
配色：主色到橙色的渐变用于促销区与主按钮；价格统一红色系；优惠券/标签用红底白字或红边红字小标签。
组件：商品卡白底圆角带浅阴影；"立即抢购"等按钮胶囊形渐变；倒计时用深色块数字。
密度：信息紧凑但分组明确，利用细分割线和留白区隔板块。
图片：所有商品图用浅灰色块 + 居中文字说明占位（如「商品图」）。`,
  },
]

export function getStylePreset(id: string): StylePreset | undefined {
  return stylePresets.find((p) => p.id === id)
}
