import Store from 'electron-store'
import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFileSync } from 'node:fs'

interface Modelconfig {
  id: string
  name: string
  enabled: boolean
}

interface OpenAIConfig {
  apiKey: string
  baseURL: string
  models: Modelconfig[]
}

interface McpServerConfig {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
}

interface Message {
  id: string
  role: 'system' | 'user' | 'assistant' | 'data' | 'tool'
  content: string
}

interface ChatSession {
  id: string
  title: string
  createdAt: string
  messages: Message[]
}

interface AppSchema {
  theme: 'light' | 'dark' | 'system'
  openai: OpenAIConfig
  mcp: {
    servers: McpServerConfig[]
    configPath: string
  }
  sessions: ChatSession[]
}

const store = new Store<AppSchema>({
  defaults: {
    theme: 'system',
    openai: {
      apiKey: '',
      baseURL: 'https://api.openai.com/v1',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', enabled: true },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', enabled: true }
      ]
    },
    mcp: {
      servers: [],
      configPath: ''
    },
    sessions: []
  }
}) as any

export function setupStorageHandlers() {
  // Settings
  ipcMain.handle('get-settings', () => {
    return {
      theme: store.get('theme'),
      openai: store.get('openai')
    }
  })

  ipcMain.handle('save-settings', (_, settings: Partial<AppSchema>) => {
    if (settings.theme) store.set('theme', settings.theme)
    if (settings.openai) store.set('openai', settings.openai)
    return true
  })

  // MCP Servers
  ipcMain.handle('get-mcp-servers', () => {
    return store.get('mcp.servers')
  })

  ipcMain.handle('save-mcp-servers', (_, servers: McpServerConfig[]) => {
    store.set('mcp.servers', servers)
    return true
  })

  // MCP Config File
  ipcMain.handle('get-mcp-config-path', () => {
    return store.get('mcp.configPath', '')
  })

  ipcMain.handle('set-mcp-config-path', (_, path: string) => {
    store.set('mcp.configPath', path)
    return true
  })

  ipcMain.handle('select-mcp-config-file', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: 'Select MCP Config File',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('import-mcp-config', async (_, filePath: string) => {
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const json = JSON.parse(raw)
      const mcpServers = json.mcpServers || {}

      // Convert standard format to internal McpServerConfig[]
      const servers: McpServerConfig[] = Object.entries(mcpServers).map(
        ([name, cfg]: [string, any]) => ({
          id: name,
          name,
          command: cfg.command || '',
          args: cfg.args || [],
          env: cfg.env || {},
          enabled: true
        })
      )

      store.set('mcp.servers', servers)
      store.set('mcp.configPath', filePath)

      return { success: true, count: servers.length }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to parse config' }
    }
  })

  // MCP Connection Management
  ipcMain.handle('refresh-mcp-connections', async () => {
    const { mcpManager } = await import('./mcp-manager')
    await mcpManager.refreshConnections()
    return true
  })

  ipcMain.handle('get-mcp-status', async () => {
    const { mcpManager } = await import('./mcp-manager')
    return mcpManager.getStatus()
  })

  // Sessions
  ipcMain.handle('get-sessions', () => {
    return store.get('sessions', [])
  })

  ipcMain.handle('create-session', (_, session: ChatSession) => {
    const sessions = store.get('sessions', [])
    store.set('sessions', [session, ...sessions])
    return true
  })

  ipcMain.handle('update-session', (_, { id, messages, title }: { id: string, messages: Message[], title?: string }) => {
    // @ts-ignore
    const sessions = store.get('sessions', []) as ChatSession[]
    // @ts-ignore
    const index = sessions.findIndex((s: ChatSession) => s.id === id)
    if (index !== -1) {
      sessions[index].messages = messages
      if (title) sessions[index].title = title
      // @ts-ignore
      store.set('sessions', sessions)
    }
    return true
  })

  ipcMain.handle('delete-session', (_, id: string) => {
    // @ts-ignore
    const sessions = store.get('sessions', []) as ChatSession[]
    // @ts-ignore
    store.set('sessions', sessions.filter((s: ChatSession) => s.id !== id))
    return true
  })
  
  // Direct value access for Main process usage
  return store
}

export const appStore = store
