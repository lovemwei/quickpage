# QuickPage (快页)

[中文](./README.md) | **English**

QuickPage is a **pure-frontend** tool that batch-generates high-fidelity prototypes from requirement documents: upload your docs (docx / pdf / xlsx / csv / md / txt / images), let AI understand the requirements and produce an editable page list, then batch-generate **style-consistent high-fidelity HTML prototypes** in parallel. Refine any page conversationally (with reference images), roll back across version history, and export PNG / self-contained HTML / a project-wide ZIP.

No backend: API keys live only in your browser's localStorage, project data is stored in IndexedDB, and LLM requests either go directly from the browser to the provider or through the local Vite proxy.

## Getting Started

```bash
npm install
npm run dev
```

First run: open **Settings** → add a provider (20+ presets including OpenAI, Anthropic, OpenRouter, DeepSeek, SiliconFlow, Moonshot Kimi, Zhipu GLM, Alibaba DashScope, ModelScope, Volcengine Ark, Tencent Hunyuan, Baidu Qianfan, MiniMax, GitHub Models, Google Gemini OpenAI-compatible, Groq, Mistral, Perplexity, Together, Fireworks, Cerebras, Hugging Face, LM Studio, Ollama, New API, plus custom OpenAI-compatible or Anthropic endpoints) → paste your API key → "Test connection / fetch models" → pick an **analysis model** and a **generation model**. Provider configs are stored locally and can be edited or removed anytime; models can also be switched inline in the wizard and the workbench.

## Workflow

1. **Create a project** — choose the target platform (PC Web @1440px or Mobile H5 @375px)
2. **Design style**
   - 6 built-in presets + a **fully custom** option (write your own style description)
   - Color spec: primary color (with swatches), optional accent color, 5 neutral tones (gray/slate/zinc/stone/neutral)
   - Border radius, density, font character, light/dark page mode
   - **Layout container**: PC — side nav / top nav / top bar + sidebar / no chrome (landing); Mobile — bottom tabs / top bar / immersive; plus auto mode and free-form notes
3. **Upload documents** — parsed locally in the browser; embedded images can be selected and sent to vision models
4. **Requirement analysis** — streaming structured output: product overview and a **two-level menu tree** of pages (level-1 / level-2 menus, with content blocks per page)
5. **Review the list** — the full menu tree of pages to generate: add / edit / delete, change level and order, mark group-only nodes (no page generated), then confirm
6. **Batch generation** — pages are generated concurrently (default 3, configurable 1–5); each finished page is persisted immediately
7. **Refine & export**
   - Refine the selected page in natural language, optionally attaching up to 4 reference images (vision model required); quick-action chips included
   - Each page keeps its last 20 versions with one-click rollback
   - Export PNG (2x) / self-contained HTML (Tailwind inlined, works offline) / project ZIP with an index page

The app itself supports light/dark theme toggle (🌙/☀️ in the top bar).

## How style consistency works

- A project-level "style spec" (preset or custom description + design tokens + layout container) is injected into the system prompt of every generation and refinement request
- Every generated page passes through `normalizeHtml`: all scripts and external resources are stripped, and a single shared Tailwind config (primary/accent scales, font stack, base styles) is injected

## Security notes

- API keys are stored in plain text in localStorage — avoid shared computers and never deploy this app publicly for others to use
- The preview iframe runs with `sandbox="allow-scripts"` (opaque origin), so generated code cannot touch app data
- The export iframe does use `allow-same-origin`, but its content has been stripped of all scripts and the iframe is destroyed immediately after use

## Known limitations

- Browser CORS behavior varies by provider: presets include a recommended connection mode; if direct browser access fails, switch the provider's connection mode to **Local proxy** in its edit dialog (requests are forwarded through the Vite dev server; requires running via `npm run dev` or `npm run preview`). The local proxy is unavailable on static deployments — use OpenRouter or similar instead
- Preview and "keep CDN" export depend on `cdn.tailwindcss.com` being reachable (a mirror URL can be configured in Settings)
- SheetJS CE cannot extract images embedded in xlsx; legacy .doc is unsupported — save as .docx
- Scanned PDFs (≤10 pages) are rendered to images and require a vision model

## Tech stack

Vue 3 + TypeScript + Vite + Naive UI + Pinia + Dexie (IndexedDB); document parsing: mammoth / pdfjs-dist / SheetJS; export: html-to-image / JSZip. The LLM client is hand-written `fetch` supporting both OpenAI-compatible and Anthropic protocols with streaming and multimodal messages.
