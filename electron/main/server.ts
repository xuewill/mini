import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamText, stepCountIs } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { appStore } from './store'
import { mcpManager } from './mcp-manager'

// import { createRequire } from 'node:module'
// const require = createRequire(import.meta.url)
// const log = require('electron-log/main')

const app = new Hono()

app.use('/*', cors())

app.get('/api/health', (c) => {
  console.log('[API] Health check')
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json()
    const { messages, model } = body

    console.log('[API] Chat request received:', { model, messageCount: messages?.length })

    const storeData = appStore.store as any
    const config = storeData.openai || {}

    console.log('[API] Config loaded:', { 
      hasApiKey: !!config.apiKey, 
      baseURL: config.baseURL 
    })

    if (!config.apiKey || !config.baseURL) {
      console.error('[API] Missing configuration')
      return c.json({ error: 'API Key or Base URL not configured. Please go to Settings.' }, 400)
    }

    // Normalize baseURL: strip /chat/completions or /responses suffix
    // because the SDK appends these paths automatically
    let baseURL = config.baseURL.replace(/\/+$/, '')
    baseURL = baseURL.replace(/\/chat\/completions$/, '')
    baseURL = baseURL.replace(/\/responses$/, '')

    const provider = createOpenAI({
      apiKey: config.apiKey,
      baseURL,
    })

    // Determine model to use
    let modelId = model
    if (!modelId) {
       const enabledModels = (config.models || []).filter((m: any) => m.enabled)
       modelId = enabledModels.length > 0 ? enabledModels[0].id : 'gpt-3.5-turbo'
    }

    console.log('[API] Using model:', modelId)

    // Get MCP tools (empty ToolSet if no servers connected)
    const mcpTools = await mcpManager.getTools()
    const toolCount = Object.keys(mcpTools).length
    console.log('[API] MCP tools available:', toolCount)

    // Use provider.chat() to force Chat Completions API (/chat/completions)
    const result = streamText({
      model: provider.chat(modelId),
      messages,
      ...(toolCount > 0 ? {
        tools: mcpTools,
        stopWhen: stepCountIs(10),
      } : {}),
      onError({ error }) {
        console.error('[API] Stream error:', error)
      }
    })

    // Build a custom text stream that includes tool call status markers
    // so the frontend can detect tool usage and show indicators.
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of result.fullStream) {
            switch (part.type) {
              case 'text-delta':
                controller.enqueue(encoder.encode(part.text))
                break
              case 'tool-call':
                // Emit marker so frontend can show "Using tool..." indicator
                controller.enqueue(encoder.encode(
                  `\n__TOOL_START__:${part.toolName}\n`
                ))
                break
              case 'tool-result':
                controller.enqueue(encoder.encode(
                  `\n__TOOL_END__:${part.toolName}\n`
                ))
                break
            }
          }
        } catch (err: any) {
          console.error('[API] Stream processing error:', err?.message)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error: any) {
    console.error('[API] Request handling error:', error?.message || error)
    return c.json({ error: error?.message || 'Unknown server error' }, 500)
  }
})

export function startServer(): Promise<number> {
  return new Promise((resolve) => {
    const server = serve({
      fetch: app.fetch,
      port: 0,
      hostname: '127.0.0.1'
    }, (info) => {
      console.log(`[API] Server listening on http://127.0.0.1:${info.port}`)
      resolve(info.port)
    })
  })
}
