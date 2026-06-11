import type { Platform } from '@/types/project'

export function buildAnalysisSystemPrompt(platform: Platform): string {
  const platformText =
    platform === 'pc' ? 'PC Web（桌面端网页 / 管理后台）' : '移动端 H5（手机网页，App 式交互）'
  return `你是资深产品分析师与交互设计师。任务：阅读需求文档，梳理产品结构，产出页面清单，用于后续逐页生成 UI 设计图。

目标平台：${platformText}。页面拆分粒度须符合该平台的导航与交互习惯。

输出要求：只输出一个 JSON 对象，不要输出任何解释或 JSON 以外的文字。结构如下：
{
  "productName": "产品名称（从文档提炼；无明确名称则起一个贴切的）",
  "overview": "产品概述，100 字以内",
  "targetUsers": "目标用户，50 字以内",
  "modules": [{ "name": "模块名", "description": "模块职责，30 字以内" }],
  "pages": [
    {
      "name": "页面名（简体中文，2-8 字）",
      "module": "所属模块名（必须与 modules 中某一项完全一致）",
      "description": "页面用途与核心交互，60 字以内",
      "blocks": ["按从上到下顺序列出页面的可见 UI 区块，3-8 条，每条 4-20 字，如：顶部搜索栏、数据统计卡片组、订单列表表格"]
    }
  ]
}

规则：
1. 页面清单完整覆盖文档描述的功能；文档未提及登录/注册等通用页就不要自行添加
2. 页面总数不超过 20 个，超出时合并同类页面（如多种详情页合并为一个代表页）
3. 模块数量 2-6 个；每个页面必须归属一个模块
4. blocks 描述页面上可见的 UI 区块，不是抽象功能点
5. 文档信息不足时基于行业常识合理补全，但不要凭空发明文档没有暗示的大模块`
}

export function buildAnalysisUserText(docText: string, imageCount: number): string {
  const imageNote =
    imageCount > 0 ? `\n\n（随消息附带 ${imageCount} 张文档中的截图/草图，请结合理解）` : ''
  return `需求文档内容：\n\n${docText}${imageNote}`
}
