import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Trash2, Plus, Pencil, Check, X, Search, Cpu } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ModelItem {
  id: string;
  name: string;
  enabled: boolean;
}

interface OpenAIConfig {
  apiKey: string;
  baseURL: string;
  models: ModelItem[];
}

export function ModelSettings() {
  const [config, setConfig] = useState<OpenAIConfig>({
    apiKey: "",
    baseURL: "https://api.openai.com/v1",
    models: [],
  });
  const [loading, setLoading] = useState(false);
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    // @ts-ignore
    if (window.ipcRenderer) {
        // @ts-ignore
        window.ipcRenderer.invoke("get-settings").then((data: any) => {
        if (data.openai) {
            setConfig(data.openai);
        }
        });
    }
  }, []);

  const saveConfig = async (newConfig: OpenAIConfig) => {
    setConfig(newConfig);
    setLoading(true);
    // @ts-ignore
    if (window.ipcRenderer) {
        // @ts-ignore
        await window.ipcRenderer.invoke("save-settings", { openai: newConfig });
    }
    setLoading(false);
    toast.success("Settings saved successfully");
  };

  const handleAddModel = () => {
    if (!newModelId.trim()) return;
    const displayName = newModelName.trim() || newModelId.trim();
    const newModel: ModelItem = { id: newModelId.trim(), name: displayName, enabled: true };

    if (config.models.some(m => m.id === newModel.id)) return;

    saveConfig({ ...config, models: [...config.models, newModel] });
    setNewModelId("");
    setNewModelName("");
  };

  const handleDeleteModel = (id: string) => {
    saveConfig({ ...config, models: config.models.filter(m => m.id !== id) });
  };

  const handleToggle = (id: string, checked: boolean) => {
    const newModels = config.models.map(m => m.id === id ? { ...m, enabled: checked } : m);
    saveConfig({ ...config, models: newModels });
  };

  const handleStartEdit = (model: ModelItem) => {
    setEditingId(model.id);
    setEditName(model.name);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const newModels = config.models.map(m =>
      m.id === editingId ? { ...m, name: editName.trim() } : m
    );
    saveConfig({ ...config, models: newModels });
    setEditingId(null);
    setEditName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Model Configuration</h1>
            <p className="text-sm text-muted-foreground mt-2">
                Configure OpenAI-compatible API providers and models.
            </p>
        </div>
        <Button onClick={() => saveConfig(config)} disabled={loading} className="gap-2">
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Save className="h-4 w-4" />}
            Save Changes
        </Button>
      </div>

      <div className="h-px w-full bg-border/40" />

      {/* Provider Settings Section */}
      <div className="grid gap-8 md:grid-cols-[250px_1fr]">
        <div>
            <h2 className="text-sm font-medium text-foreground">Provider Details</h2>
            <p className="text-xs text-muted-foreground mt-1">
                Connection details for the AI inference server.
            </p>
        </div>
        <div className="max-w-2xl space-y-4">
            <div className="grid gap-2">
                <Label>Base URL</Label>
                <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-border focus-within:ring-2 focus-within:ring-primary">
                        <span className="flex select-none items-center pl-3 text-muted-foreground sm:text-sm">https://</span>
                        <input
                        type="text"
                        className="block flex-1 border-0 bg-transparent py-2 pl-1 text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-sm sm:leading-6 focus:outline-none"
                        placeholder="api.openai.com/v1"
                        value={config.baseURL.replace('https://', '')}
                        onChange={(e) => setConfig({ ...config, baseURL: `https://${e.target.value}` })}
                        />
                </div>
            </div>
            <div className="grid gap-2">
                <Label>API Key</Label>
                <Input
                    type="password"
                    placeholder="sk-..."
                    value={config.apiKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, apiKey: e.target.value })}
                    className="font-mono text-xs"
                />
            </div>
        </div>
      </div>

      <div className="h-px w-full bg-border/40" />

      {/* Models List Section */}
      <div className="space-y-4">
            <div className="flex items-center justify-between">
            <div>
                <h2 className="text-sm font-medium text-foreground">Available Models</h2>
                <p className="text-xs text-muted-foreground mt-1">
                    Manage the models available to the chat interface.
                </p>
            </div>
            </div>

            {/* Add Model Bar */}
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-2">
            <div className="relative flex-1">
                <Cpu className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Model ID (e.g., gpt-4-turbo)"
                    value={newModelId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewModelId(e.target.value)}
                    className="border-0 bg-transparent pl-9 focus-visible:ring-0 shadow-none"
                        onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddModel()}
                />
            </div>
            <div className="h-6 w-px bg-border/50" />
            <Input
                placeholder="Display Name (Optional)"
                value={newModelName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewModelName(e.target.value)}
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 shadow-none"
                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddModel()}
            />
            <Button onClick={handleAddModel} disabled={!newModelId.trim()} size="sm" variant="secondary">
                <Plus className="mr-2 h-3.5 w-3.5" /> Add
            </Button>
            </div>

            {/* Technical List */}
            <div className="rounded-lg border border-border/40 bg-card text-card-foreground shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_100px_100px] gap-4 border-b border-border/40 bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
                <div>Model Name</div>
                <div>Model ID</div>
                <div className="text-center">Status</div>
                <div className="text-end">Actions</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/40">
                    {config.models.length === 0 && (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        No models configured. Add one above.
                    </div>
                )}
                {config.models.map((model) => (
                        <div key={model.id} className="group grid grid-cols-[1fr_1fr_100px_100px] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
                        {/* Name */}
                        <div className="font-medium text-sm">
                                {editingId === model.id ? (
                                <Input
                                    value={editName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                                    className="h-7 text-xs"
                                    autoFocus
                                    onKeyDown={(e: React.KeyboardEvent) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                />
                                ) : model.name}
                        </div>

                        {/* ID */}
                        <div className="font-mono text-xs text-muted-foreground">{model.id}</div>

                        {/* Status */}
                        <div className="flex justify-center">
                                <Switch
                                checked={model.enabled}
                                onCheckedChange={(checked: boolean) => handleToggle(model.id, checked)}
                                className="scale-75 data-[state=checked]:bg-emerald-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {editingId === model.id ? (
                                <>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500" onClick={handleSaveEdit}>
                                        <Check className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={handleCancelEdit}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </>
                                ) : (
                                <>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleStartEdit(model)}>
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteModel(model.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </>
                                )}
                        </div>
                        </div>
                ))}
            </div>
            </div>
      </div>
    </div>
  );
}
