import type { Platform } from '@/types/project'
import type { PageSpec } from '@/types/analysis'

export function buildHardConstraints(platform: Platform): string {
  const canvas =
    platform === 'pc'
      ? '按 1440px 宽桌面浏览器设计，body 不设固定宽度，大区块内容自适应；含侧边/顶部导航时严格使用「导航菜单结构」中的真实名称与层级，当前页为高亮态'
      : '按 375px 宽手机视口设计，<head> 必须含 <meta name="viewport" content="width=device-width, initial-scale=1">；控件尺寸适合拇指点击（主按钮高约 48px）；底部 Tab 等导航使用「导航菜单结构」中的一级菜单'
  return `【硬性约束】
1. 输出单个自包含 HTML 文件，从 <!DOCTYPE html> 到 </html> 完整无缺
2. 样式只用 Tailwind CSS：<head> 中引入 <script src="https://cdn.tailwindcss.com"></script>，可配合少量内联 <style>
3. 除 Tailwind CDN 外禁止任何外部资源：不引用任何外链图片/字体/JS/CSS
4. 图标一律内联 SVG（24px 线性风格，stroke-width 约 1.8）；图表用纯 CSS/SVG 绘制；照片/头像/商品图用「色块 + 居中文字说明」或内联 SVG 占位
5. 填充真实感的简体中文示例数据（具体的人名、商品名、金额、日期、状态），禁止 lorem ipsum 和「示例文本」式敷衍占位；列表/表格至少 5-8 条数据
6. ${canvas}
7. 所有链接 href="#"；不写业务 JavaScript（纯静态视觉稿，hover 效果用 CSS 实现）
8. 信息层级分明：标题/正文/辅助文字的字号字重拉开差距，留白与对齐遵守统一网格
9. 只输出一个 \`\`\`html 代码块，不要任何解释文字`
}

export function buildPageSystemPrompt(styleFragment: string, platform: Platform): string {
  return `你是顶尖的 UI 设计师兼前端工程师，负责把页面需求转化为设计稿级视觉质量的高保真 HTML 原型。

${styleFragment}

${buildHardConstraints(platform)}`
}

export interface PagePromptContext {
  productName: string
  overview: string
  targetUsers?: string
  /** 缩进文本形式的两级菜单结构 */
  menuTree: string
  /** 二级页面的上级菜单名；一级页面为空 */
  parentName?: string
}

export function buildPageUserPrompt(page: PageSpec, ctx: PagePromptContext): string {
  const blocks = page.blocks.length
    ? `页面内容区块（从上到下）：\n${page.blocks.map((b, i) => `${i + 1}. ${b}`).join('\n')}`
    : '页面内容区块：未指定，请根据页面用途合理设计'
  const position = ctx.parentName
    ? `（一级菜单「${ctx.parentName}」下的二级页面）`
    : '（一级菜单页面）'
  return [
    `产品背景：${ctx.productName} —— ${ctx.overview}`,
    ctx.targetUsers ? `目标用户：${ctx.targetUsers}` : '',
    `导航菜单结构（页面内的导航必须使用此真实结构与名称，当前页为高亮态）：`,
    ctx.menuTree,
    '',
    `请设计页面：「${page.name}」${position}`,
    `页面用途：${page.description || '见页面名称'}`,
    blocks,
    '',
    '请输出该页面完整的高保真 HTML。',
  ]
    .filter((l) => l !== '')
    .join('\n')
}
