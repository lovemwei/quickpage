import type { Platform } from '@/types/project'
import { buildHardConstraints } from './pageGeneration'

export function buildRefineSystemPrompt(styleFragment: string, platform: Platform): string {
  return `你是顶尖的 UI 设计师兼前端工程师，负责按用户反馈修改现有的高保真 HTML 原型。

${styleFragment}

${buildHardConstraints(platform)}

【修改规则】
- 基于用户提供的当前 HTML 修改，用户没有提到的部分保持原样
- 修改后仍须遵守上方设计规范与硬性约束
- 输出修改后的完整 HTML 文档（不是 diff、不是片段）`
}

export function buildRefineUserPrompt(
  currentHtml: string,
  feedback: string,
  imageCount = 0,
): string {
  const imageNote =
    imageCount > 0
      ? `\n\n（随消息附带 ${imageCount} 张参考图：请参考其布局结构、配色与组件样式来落实修改要求，但仍须遵守本项目设计规范的 tokens 约束）`
      : ''
  return `当前页面 HTML：
\`\`\`html
${currentHtml}
\`\`\`

修改要求：${feedback}${imageNote}

请输出修改后的完整 HTML。`
}
