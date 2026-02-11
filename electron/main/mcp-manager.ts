import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { tool, jsonSchema } from 'ai'
import { appStore } from './store'
import { readFileSync, existsSync } from 'node:fs'
import type { ToolSet } from 'ai'

interface McpServerConfig {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
}

interface McpConnection {
  config: McpServerConfig
  client: Client
  transport: StdioClientTransport
  status: 'connecting' | 'connected' | 'error' | 'disconnected'
  error?: string
}

/**
 * Singleton manager for MCP server connections.
 * Handles lifecycle: connect / list tools / call tools / disconnect.
 */
class McpClientManager {
  private connections: Map<string, McpConnection> = new Map()

  /**
   * Initialize connections for all enabled MCP servers.
   * If a JSON config file path is set, sync from it first.
   */
  async initialize(): Promise<void> {
    // Auto-sync from JSON config file if path is configured
    const configPath = (appStore.store as any).mcp?.configPath
    if (configPath && existsSync(configPath)) {
      this.syncFromConfigFile(configPath)
    }

    const storeData = appStore.store as any
    const servers: McpServerConfig[] = storeData.mcp?.servers || []
    // const servers: McpServerConfig[] = []
    const enabled = servers.filter(s => s.enabled)

    console.log(`[MCP] Initializing ${enabled.length} server(s)...`)

    await Promise.allSettled(
      enabled.map(server => this.connectServer(server))
    )
  }

  /**
   * Read a standard mcpServers JSON file and sync to store.
   */
  private syncFromConfigFile(filePath: string): void {
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const json = JSON.parse(raw)
      const mcpServers = json.mcpServers || {}

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

      appStore.set('mcp.servers' as any, servers)
      console.log(`[MCP] Synced ${servers.length} server(s) from config file: ${filePath}`)
    } catch (err: any) {
      console.error(`[MCP] Failed to sync from config file:`, err?.message)
    }
  }

  /**
   * Connect to a single MCP server via stdio transport.
   */
  private async connectServer(config: McpServerConfig): Promise<void> {
    // Disconnect existing connection if any
    if (this.connections.has(config.id)) {
      await this.disconnectServer(config.id)
    }

    const client = new Client(
      { name: 'FruitsAI', version: '1.0.0' },
      { capabilities: {} }
    )

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...process.env, ...config.env } as Record<string, string>,
    })

    const connection: McpConnection = {
      config,
      client,
      transport,
      status: 'connecting',
    }
    this.connections.set(config.id, connection)

    try {
      await client.connect(transport)
      connection.status = 'connected'
      console.log(`[MCP] Connected to "${config.name}" (${config.command})`)
    } catch (err: any) {
      connection.status = 'error'
      connection.error = err?.message || 'Connection failed'
      console.error(`[MCP] Failed to connect to "${config.name}":`, err?.message)
    }
  }

  /**
   * Disconnect a single server by ID.
   */
  private async disconnectServer(id: string): Promise<void> {
    const conn = this.connections.get(id)
    if (!conn) return

    try {
      await conn.client.close()
    } catch (err: any) {
      console.error(`[MCP] Error closing "${conn.config.name}":`, err?.message)
    }
    this.connections.delete(id)
  }

  /**
   * Aggregate tools from all connected MCP servers into AI SDK ToolSet.
   */
  async getTools(): Promise<ToolSet> {
    const tools: ToolSet = {}

    for (const [, conn] of this.connections) {
      if (conn.status !== 'connected') continue

      try {
        const { tools: mcpTools } = await conn.client.listTools()

        for (const mcpTool of mcpTools) {
          // Namespace tool names to avoid collisions: "serverName__toolName"
          const toolKey = `${conn.config.name}__${mcpTool.name}`

          tools[toolKey] = tool({
            description: mcpTool.description || mcpTool.name,
            parameters: jsonSchema(mcpTool.inputSchema as any),
            execute: async (args: Record<string, unknown>) => {
              console.log(`[MCP] Calling tool "${mcpTool.name}" on "${conn.config.name}"`, args)

              const result = await conn.client.callTool({
                name: mcpTool.name,
                arguments: args as Record<string, unknown>,
              })

              // Extract text content from MCP result
              const content = (result as any).content
              if (Array.isArray(content)) {
                return content
                  .filter((c: any) => c.type === 'text')
                  .map((c: any) => c.text)
                  .join('\n')
              }

              // Log result for debugging
              // console.log(`[MCP] Tool "${mcpTool.name}" result:`, JSON.stringify(result).slice(0, 200))

              return JSON.stringify(result)
            },
          } as any)
        }

        console.log(`[MCP] Loaded ${mcpTools.length} tool(s) from "${conn.config.name}"`)
      } catch (err: any) {
        console.error(`[MCP] Failed to list tools from "${conn.config.name}":`, err?.message)
      }
    }

    return tools
  }

  /**
   * Refresh connections based on current settings.
   * Disconnects removed/disabled servers, connects new/enabled ones.
   */
  async refreshConnections(): Promise<void> {
    const storeData = appStore.store as any
    const servers: McpServerConfig[] = storeData.mcp?.servers || []
    const enabledMap = new Map(servers.filter(s => s.enabled).map(s => [s.id, s]))

    // Disconnect servers no longer in config or disabled
    for (const [id] of this.connections) {
      if (!enabledMap.has(id)) {
        await this.disconnectServer(id)
      }
    }

    // Connect new/updated servers
    for (const [id, server] of enabledMap) {
      const existing = this.connections.get(id)
      if (!existing || existing.status === 'error') {
        await this.connectServer(server)
      }
    }
  }

  /**
   * Get status of all servers (for UI display).
   */
  getStatus(): Array<{ id: string; name: string; status: string; error?: string; toolCount?: number }> {
    const result: Array<{ id: string; name: string; status: string; error?: string }> = []
    for (const [, conn] of this.connections) {
      result.push({
        id: conn.config.id,
        name: conn.config.name,
        status: conn.status,
        error: conn.error,
      })
    }
    return result
  }

  /**
   * Gracefully shutdown all connections.
   */
  async shutdown(): Promise<void> {
    console.log('[MCP] Shutting down all connections...')
    const ids = [...this.connections.keys()]
    await Promise.allSettled(ids.map(id => this.disconnectServer(id)))
  }
}

// Singleton export
export const mcpManager = new McpClientManager()
