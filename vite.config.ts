import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { defineConfig, type Connect, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'origin',
  'referer',
  'cookie',
  'connection',
  'content-length',
  'accept-encoding',
  'user-agent',
  'x-qp-target',
])

const STRIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
])

function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return Promise.resolve(undefined)
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/**
 * 本地 LLM 转发代理（仅 dev / preview 下可用）：
 * 浏览器请求 /llm-proxy/<path>，目标源放在 x-qp-target 头，由 Node 端转发以绕过 CORS。
 * 支持 SSE 流式透传与客户端取消。
 */
function llmProxyPlugin(): Plugin {
  const handle = async (req: Connect.IncomingMessage, res: ServerResponse) => {
    const target = req.headers['x-qp-target']
    if (typeof target !== 'string' || !/^https?:\/\//.test(target)) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: { message: '缺少有效的 x-qp-target 请求头' } }))
      return
    }
    const abort = new AbortController()
    req.on('close', () => abort.abort())
    try {
      const url = new URL(req.url ?? '/', target)
      const headers: Record<string, string> = {}
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value !== 'string') continue
        const k = key.toLowerCase()
        if (STRIP_REQUEST_HEADERS.has(k) || k.startsWith('sec-')) continue
        headers[k] = value
      }
      const body = await readBody(req)
      const upstream = await fetch(url, {
        method: req.method,
        headers,
        body: body && body.length > 0 ? new Uint8Array(body) : undefined,
        signal: abort.signal,
        redirect: 'manual',
      })
      res.statusCode = upstream.status
      upstream.headers.forEach((value, key) => {
        if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) res.setHeader(key, value)
      })
      if (!upstream.body) {
        res.end()
        return
      }
      const reader = upstream.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
      res.end()
    } catch (e) {
      if (abort.signal.aborted) {
        res.destroy()
        return
      }
      if (!res.headersSent) {
        res.statusCode = 502
        res.setHeader('content-type', 'application/json')
      }
      res.end(
        JSON.stringify({ error: { message: `本地代理转发失败：${(e as Error).message}` } }),
      )
    }
  }
  return {
    name: 'qp-llm-proxy',
    configureServer(server) {
      server.middlewares.use('/llm-proxy', handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/llm-proxy', handle)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    Components({
      resolvers: [NaiveUiResolver()],
      dts: 'src/components.d.ts',
    }),
    llmProxyPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
