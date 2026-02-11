import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash, RefreshCw, FolderOpen, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";

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
    if (window.ipcRenderer) {
        // @ts-ignore
        const data = await window.ipcRenderer.invoke("get-mcp-servers");
        setServers(data || []);
    }
  }, []);

  const loadStatuses = useCallback(async () => {
    try {
      // @ts-ignore
      if (window.ipcRenderer) {
        // @ts-ignore
        const data = await window.ipcRenderer.invoke("get-mcp-status");
        setStatuses(data || []);
      }
    } catch {
      // MCP status IPC may not be ready yet
    }
  }, []);

  const loadConfigPath = useCallback(async () => {
    // @ts-ignore
    if (window.ipcRenderer) {
        // @ts-ignore
        const path = await window.ipcRenderer.invoke("get-mcp-config-path");
        setConfigPath(path || "");
    }
  }, []);

  useEffect(() => {
    loadServers();
    loadStatuses();
    loadConfigPath();
  }, [loadServers, loadStatuses, loadConfigPath]);

  const saveServers = async (updatedServers: McpServerConfig[]) => {
    setServers(updatedServers);
    // @ts-ignore
    if (window.ipcRenderer) {
        // @ts-ignore
        await window.ipcRenderer.invoke("save-mcp-servers", updatedServers);
    }
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
      if (window.ipcRenderer) {
        // @ts-ignore
        await window.ipcRenderer.invoke("refresh-mcp-connections");
        await loadStatuses();
      }
    } catch (err) {
      console.error("Failed to refresh MCP connections:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectConfigFile = async () => {
    // @ts-ignore
    if (window.ipcRenderer) {
        // @ts-ignore
        const filePath = await window.ipcRenderer.invoke("select-mcp-config-file");
        if (!filePath) return;

        setConfigPath(filePath);
        await handleImportConfig(filePath);
    }
  };

  const handleImportConfig = async (path?: string) => {
    const targetPath = path || configPath;
    if (!targetPath) return;

    setImportStatus(null);

    // @ts-ignore
    if (window.ipcRenderer) {
        // @ts-ignore
        const result = await window.ipcRenderer.invoke("import-mcp-config", targetPath);

        if (result?.success) {
            setImportStatus({ type: 'success', message: `Imported ${result.count} servers` });
            await loadServers();
            // Auto reconnect after import
            await handleReconnect();
        } else {
            setImportStatus({ type: 'error', message: result?.error || 'Import failed' });
        }
    }
  };

  const getStatusForServer = (serverId: string) => {
    return statuses.find(s => s.id === serverId);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">MCP Servers</h1>
            <p className="text-sm text-muted-foreground mt-2">
                Manage connections to Model Context Protocol servers.
            </p>
         </div>
         <Button
            variant="outline"
            size="sm"
            onClick={handleReconnect}
            disabled={refreshing || servers.length === 0}
         >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Connections
         </Button>
      </div>

      <div className="h-px w-full bg-border/40" />

      {/* Server List Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
         {/* Existing Servers */}
         {servers.map((server) => {
             const serverStatus = getStatusForServer(server.id);
             const isConnected = serverStatus?.status === 'connected';

             return (
                 <div key={server.id} className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all hover:border-primary/20 hover:shadow-md">
                     {/* Status Dot */}
                     <div className="absolute right-4 top-4">
                        {isConnected ? (
                            <div className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </div>
                        ) : (
                            <div className={`h-2.5 w-2.5 rounded-full ${serverStatus?.status === 'error' ? 'bg-destructive' : 'bg-muted-foreground/30'}`} />
                        )}
                     </div>

                     <div className="mb-4">
                        <h3 className="font-medium leading-none">{server.name}</h3>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ring-inset",
                                isConnected ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" :
                                serverStatus?.status === 'error' ? "bg-red-50 text-red-700 ring-red-600/10" :
                                "bg-gray-50 text-gray-600 ring-gray-500/10"
                            )}>
                                {serverStatus?.status || 'disconnected'}
                            </span>
                        </div>
                     </div>

                     {/* Command Preview */}
                     <div className="mb-4 rounded-md bg-zinc-950/50 p-3 font-mono text-[10px] text-muted-foreground border border-border/40">
                        <div className="flex gap-2 opacity-70">
                            <span className="text-primary">$</span>
                            <span className="truncate">{server.command} {server.args.join(" ")}</span>
                        </div>
                     </div>

                     {/* Error Message */}
                     {serverStatus?.error && (
                        <div className="mb-4 text-xs text-destructive bg-destructive/5 p-2 rounded-md border border-destructive/10">
                            {serverStatus.error}
                        </div>
                     )}

                     {/* Actions */}
                     <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-4 mt-auto">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(server.id)}>
                            Delete
                        </Button>
                     </div>
                 </div>
             );
         })}

         {/* Add New Card */}
         <div className="flex flex-col rounded-xl border border-dashed border-border/60 bg-muted/5 p-6 transition-colors hover:bg-muted/10">
             <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plus className="h-4 w-4" />
                </div>
                <h3 className="font-medium text-sm">Connect New Server</h3>
             </div>

             <div className="space-y-3 flex-1">
                <Input
                    placeholder="Server Name"
                    value={newServer.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewServer({ ...newServer, name: e.target.value })}
                    className="h-8 text-sm bg-background"
                />
                <Input
                    placeholder="Command (e.g., npx)"
                    value={newServer.command}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewServer({ ...newServer, command: e.target.value })}
                    className="h-8 text-sm bg-background"
                />
                 <Input
                    placeholder="Args (comma separated)"
                    value={newServer.args?.join(", ")}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewServer({
                        ...newServer,
                        args: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                    }
                    className="h-8 text-sm bg-background"
                />
             </div>

             <Button className="mt-4 w-full" size="sm" onClick={handleAddServer} disabled={!newServer.name || !newServer.command}>
                Add Server
             </Button>

             <div className="relative mt-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/40" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or Import Config</span>
                </div>
             </div>

            <div className="mt-4 flex gap-2">
                <Input
                     placeholder="Path to mcp_config.json"
                     value={configPath}
                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigPath(e.target.value)}
                     className="h-8 text-xs font-mono"
                />
                 <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleSelectConfigFile}>
                    <FolderOpen className="h-3.5 w-3.5" />
                </Button>
            </div>
             <Button variant="secondary" size="sm" className="mt-2 w-full text-xs" onClick={() => handleImportConfig()} disabled={!configPath}>
                <FileJson className="mr-2 h-3.5 w-3.5" />
                Import JSON
            </Button>

            {importStatus && (
                <p className={`mt-2 text-center text-xs ${importStatus.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                    {importStatus.message}
                </p>
            )}
         </div>
      </div>
    </div>
  );
}
