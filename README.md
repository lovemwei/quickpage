# 快页 QuickPage

**中文** | [English](./README.en.md)

快页（QuickPage）是一款**纯前端**的高保真原型批量生成工具：上传需求文档（docx / pdf / xlsx / csv / md / txt / 图片），AI 自动理解需求并产出可编辑的页面清单，确认后批量并行生成**统一风格的高保真 HTML 原型**，支持对话式微调（可附参考图）、版本回退，导出 PNG / 自包含 HTML / 整项目 ZIP。

无后端：API Key 仅保存在本机浏览器 localStorage，项目数据存 IndexedDB，请求由浏览器直连服务商或经本地 Vite 代理转发。

## 快速开始

```bash
npm install
npm run dev
```

首次使用：进入「设置」→ 添加服务商（内置 OpenAI、Anthropic、OpenRouter、DeepSeek、硅基流动、Kimi、智谱、通义、魔搭、火山方舟、腾讯混元、百度千帆、MiniMax、GitHub Models、Google Gemini OpenAI 兼容、Groq、Mistral、Perplexity、Together、Fireworks、Cerebras、Hugging Face、LM Studio、Ollama、New API 等 20+ 预设，也支持自定义 OpenAI 兼容或 Anthropic 服务商）→ 填入 API Key →「测试连接 / 拉取模型」→ 分别选择「需求理解模型」与「页面生成模型」。服务商配置保存在本地，可随时编辑、删除；向导与工作台中可内联快速切换模型。

## 核心流程

1. **新建项目**：选择目标平台（PC Web 1440px / 移动端 H5 375px）
2. **设计风格**：
   - 6 套内置预设 + **完全自定义**（自写风格基调描述）
   - 颜色规范：主色（含常用色板）、可选辅助强调色、5 档中性色调（gray/slate/zinc/stone/neutral）
   - 圆角、密度、字体气质、页面明/暗模式
   - **布局容器**：PC 可选侧边导航 / 顶部导航 / 顶栏+侧栏 / 无框架落地页；H5 可选底部 Tab / 顶部导航 / 沉浸式；支持自动与自定义说明
3. **上传文档**：浏览器本地解析，提取文本与内嵌图片（可勾选随分析发送给视觉模型）
4. **需求理解**：AI 流式输出结构化结果——产品概述、功能模块、页面清单（每页含内容区块）
5. **清单审核**：增删改页面、调整模块归属与顺序，确认后进入工作台
6. **批量生成**：并发生成全部页面（默认 3 路，可调 1–5），每页完成即落库，刷新不丢
7. **微调与导出**：
   - 自然语言反馈修改选中页面，可**附最多 4 张参考图**（需视觉模型），内置常用微调快捷指令
   - 每页保留最近 20 个版本，可一键回退
   - 导出 PNG（2x）/ 自包含 HTML（Tailwind 已内联，断网可看）/ 整项目 ZIP（含导航首页）

应用本身支持明/暗主题切换（顶栏 🌙/☀️）。

## 风格统一机制

- 项目级「风格规范」（预设或自定义描述 + design tokens + 布局容器）注入每一次生成与微调请求的 system prompt
- 生成结果统一经过 `normalizeHtml` 后处理：剥离全部脚本与外链资源、注入同一份 Tailwind 配置（primary/accent 色阶、字体栈、基础样式）

## 安全说明

- API Key 仅存本机 localStorage，请勿在公用电脑使用，勿将本应用部署到公网供他人访问
- 预览 iframe 使用 `sandbox="allow-scripts"`（opaque origin），AI 生成的代码无法访问应用数据
- 导出用临时 iframe 虽带 `allow-same-origin`，但内容已被剥净全部脚本，且用后即毁

## 已知限制

- 多数服务商的浏览器 CORS 策略不稳定：预设会给出推荐连接方式；若直连失败，在服务商编辑弹窗中把「连接方式」切换为**本地代理**即可（请求经 Vite 开发服务器转发，需 `npm run dev` 或 `npm run preview` 方式运行）。静态部署时本地代理不可用，可改用 OpenRouter 等支持直连的聚合服务
- 预览与「保留 CDN」模式导出依赖 `cdn.tailwindcss.com` 可达（设置中可配置镜像地址）
- SheetJS 社区版无法提取 xlsx 内嵌图片；旧版 .doc 不支持，请另存为 .docx
- 扫描版 PDF（≤10 页）会整页转图片走视觉模型理解

## 技术栈

Vue 3 + TypeScript + Vite + Naive UI + Pinia + Dexie(IndexedDB)；文档解析：mammoth / pdfjs-dist / SheetJS；导出：html-to-image / JSZip。LLM 客户端为手写 fetch，支持 OpenAI 兼容与 Anthropic 两种协议的流式输出与多模态消息。
