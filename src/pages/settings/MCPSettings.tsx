import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash, CheckCircle2, XCircle, RefreshCw, AlertCircle, Loader2, FolderOpen, FileJson } from "lucide-react";

interface McpServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
}

interface McpServerStatus {
  id: string;
  name: string;
  status: 'connecting' | 'connected' | 'error' | 'disconnected';
  error?: string;
}

export function MCPSettings() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [statuses, setStatuses] = useState<McpServerStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [configPath, setConfigPath] = useState("");
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newServer, setNewServer] = useState<Partial<McpServerConfig>>({
    name: "",
    command: "",
    args: [],
  });

  const loadServers = useCallback(async () => {
    // @ts-ignore
    const data = await window.ipcRenderer.invoke("get-mcp-servers");
    setServers(data || []);
  }, []);

  const loadStatuses = useCallback(async () => {
    try {
      // @ts-ignore
      const data = await window.ipcRenderer.invoke("get-mcp-status");
      setStatuses(data || []);
    } catch {
      // MCP status IPC may not be ready yet
    }
  }, []);

  const loadConfigPath = useCallback(async () => {
    // @ts-ignore
    const path = await window.ipcRenderer.invoke("get-mcp-config-path");
    setConfigPath(path || "");
  }, []);

  useEffect(() => {
    loadServers();
    loadStatuses();
    loadConfigPath();
  }, [loadServers, loadStatuses, loadConfigPath]);

  const saveServers = async (updatedServers: McpServerConfig[]) => {
    setServers(updatedServers);
    // @ts-ignore
    await window.ipcRenderer.invoke("save-mcp-servers", updatedServers);
  };

  const handleAddServer = async () => {
    if (!newServer.name || !newServer.command) return;
    
    const server: McpServerConfig = {
      id: crypto.randomUUID(),
      name: newServer.name,
      command: newServer.command,
      args: newServer.args || [],
      env: {},
      enabled: true,
    };

    await saveServers([...servers, server]);
    setNewServer({ name: "", command: "", args: [] });
  };

  const handleDelete = async (id: string) => {
    await saveServers(servers.filter((s) => s.id !== id));
  };

  const handleReconnect = async () => {
    setRefreshing(true);
    try {
      // @ts-ignore
      await window.ipcRenderer.invoke("refresh-mcp-connections");
      await loadStatuses();
    } catch (err) {
      console.error("Failed to refresh MCP connections:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectConfigFile = async () => {
    // @ts-ignore
    const filePath = await window.ipcRenderer.invoke("select-mcp-config-file");
    if (!filePath) return;

    setConfigPath(filePath);
    await handleImportConfig(filePath);
  };

  const handleImportConfig = async (path?: string) => {
    const targetPath = path || configPath;
    if (!targetPath) return;

    setImportStatus(null);

    // @ts-ignore
    const result = await window.ipcRenderer.invoke("import-mcp-config", targetPath);
    
    if (result?.success) {
      setImportStatus({ type: 'success', message: `已导入 ${result.count} 个服务器` });
      await loadServers();
      // Auto reconnect after import
      await handleReconnect();
    } else {
      setImportStatus({ type: 'error', message: result?.error || '导入失败' });
    }
  };

  const getStatusForServer = (serverId: string) => {
    return statuses.find(s => s.id === serverId);
  };

  const StatusIcon = ({ status }: { status?: McpServerStatus }) => {
    if (!status) return <XCircle className="h-4 w-4 text-muted-foreground" />;
    switch (status.status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">MCP 服务器</h2>
        <p className="text-muted-foreground">
          管理本地模型上下文协议 (MCP) 服务器。
        </p>
      </div>

      {/* JSON Config File Import */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>JSON 配置文件</CardTitle>
              <CardDescription>
                从标准 JSON 配置文件导入 MCP 服务器（兼容 Claude Desktop / Cursor 格式）。
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="配置文件路径 (mcp_config.json)"
              value={configPath}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigPath(e.target.value)}
              className="flex-1 font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={handleSelectConfigFile} title="选择文件">
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
          {configPath && (
            <Button variant="secondary" size="sm" onClick={() => handleImportConfig()}>
              <RefreshCw className="mr-2 h-3 w-3" />
              重新导入
            </Button>
          )}
          {importStatus && (
            <p className={`text-sm ${importStatus.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {importStatus.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Server List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>已配置的服务器</CardTitle>
              <CardDescription>
                {configPath
                  ? `服务器列表来自配置文件，也可手动添加。`
                  : `可通过上方导入配置文件或下方手动添加。`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              disabled={refreshing || servers.length === 0}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              重连
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {servers.length === 0 && (
            <p className="text-sm text-muted-foreground">未配置服务器。</p>
          )}
          {servers.map((server) => {
            const serverStatus = getStatusForServer(server.id);
            return (
              <div
                key={server.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{server.name}</span>
                    <StatusIcon status={serverStatus} />
                    {serverStatus?.status === 'connected' && (
                      <span className="text-[10px] text-green-600 font-medium">Connected</span>
                    )}
                    {serverStatus?.status === 'error' && (
                      <span className="text-[10px] text-destructive" title={serverStatus.error}>
                        Error
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono bg-muted p-1 rounded inline-block">
                    {server.command} {server.args.join(" ")}
                  </div>
                  {serverStatus?.error && (
                    <div className="text-xs text-destructive/80 mt-1">
                      {serverStatus.error}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(server.id)}
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Add Manual Server */}
      <Card>
        <CardHeader>
          <CardTitle>手动添加服务器</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>名称</Label>
            <Input
              placeholder="例如：文件系统服务器"
              value={newServer.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewServer({ ...newServer, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>命令</Label>
            <Input
              placeholder="例如：npx"
              value={newServer.command}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewServer({ ...newServer, command: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>参数 (逗号分隔)</Label>
            <Input
              placeholder="e.g. -y, @anthropics/mcp-server-filesystem, ./"
              value={newServer.args?.join(", ")}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewServer({
                  ...newServer,
                  args: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
            />
          </div>
          <Button onClick={handleAddServer} disabled={!newServer.name || !newServer.command}>
            <Plus className="mr-2 h-4 w-4" /> 添加服务器
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
