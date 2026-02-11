import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Save, Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

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
    window.ipcRenderer.invoke("get-settings").then((data: any) => {
      if (data.openai) {
        setConfig(data.openai);
      }
    });
  }, []);

  const saveConfig = async (newConfig: OpenAIConfig) => {
    setConfig(newConfig);
    setLoading(true);
    // @ts-ignore
    await window.ipcRenderer.invoke("save-settings", { openai: newConfig });
    setLoading(false);
    toast.success("配置已保存");
  };

  const handleAddModel = () => {
    if (!newModelId.trim()) return;
    const displayName = newModelName.trim() || newModelId.trim();
    const newModel: ModelItem = { id: newModelId.trim(), name: displayName, enabled: true };

    // Prevent duplicate IDs
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
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">模型配置</h2>
        <p className="text-muted-foreground">
          配置 OpenAI 兼容的 API 设置。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>提供商设置</CardTitle>
          <CardDescription>
            输入您的 API 密钥和基础 URL (例如：DeepSeek, OpenRouter)。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>基础 URL</Label>
            <Input
              placeholder="https://api.openai.com/v1"
              value={config.baseURL}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, baseURL: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>API 密钥</Label>
            <Input
              type="password"
              placeholder="sk-..."
              value={config.apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, apiKey: e.target.value })}
            />
          </div>
          <Button onClick={() => saveConfig(config)} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "保存中..." : "保存配置"}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>模型列表</CardTitle>
          <CardDescription>
            管理此提供商的可用模型。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {config.models.length === 0 && (
              <p className="text-sm text-muted-foreground">未配置模型。请在下方添加。</p>
            )}
            {config.models.map((model) => (
              <div key={model.id} className="flex items-center justify-between space-x-4 border p-4 rounded-lg">
                <div className="flex-1 space-y-1 min-w-0">
                  {editingId === model.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e: React.KeyboardEvent) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleSaveEdit}>
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium leading-none truncate">{model.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{model.id}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  {editingId !== model.id && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(model)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  <Switch 
                    checked={model.enabled} 
                    onCheckedChange={(checked: boolean) => handleToggle(model.id, checked)}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteModel(model.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">添加模型</h4>
            <div className="flex gap-3">
              <Input 
                placeholder="模型 ID (例如：gpt-4o)" 
                value={newModelId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewModelId(e.target.value)}
                className="flex-1"
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') handleAddModel();
                }}
              />
              <Input 
                placeholder="显示名称 (可选)" 
                value={newModelName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewModelName(e.target.value)}
                className="flex-1"
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') handleAddModel();
                }}
              />
              <Button 
                variant="outline"
                onClick={handleAddModel}
                disabled={!newModelId.trim()}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
