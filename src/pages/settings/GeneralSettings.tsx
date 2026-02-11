import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function GeneralSettings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    // @ts-ignore
    if (window.ipcRenderer) {
        // @ts-ignore
        window.ipcRenderer.invoke('get-settings').then((data) => {
        if (data.theme) {
            setTheme(data.theme);
        }
        });
    }
  }, []);

  const handleThemeChange = async (value: 'light' | 'dark' | 'system') => {
    setTheme(value);
    // @ts-ignore
    if (window.ipcRenderer) {
        // @ts-ignore
        await window.ipcRenderer.invoke('save-settings', { theme: value });
    }

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (value === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(value);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">General Settings</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Customize the appearance and behavior of the application.
        </p>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-border/40" />

      {/* Section: Theme */}
      <div className="grid gap-8 md:grid-cols-[250px_1fr]">
        <div>
          <h2 className="text-sm font-medium text-foreground">Interface Theme</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Select your preferred visual appearance.
          </p>
        </div>

        <div className="max-w-xl">
             <RadioGroup
              value={theme}
              onValueChange={(val) => handleThemeChange(val as 'light' | 'dark' | 'system')}
              className="grid grid-cols-3 gap-4"
            >
              {/* Light Theme Option */}
              <ThemeOption
                value="light"
                label="Light"
                active={theme === 'light'}
                preview={
                    <div className="h-full w-full bg-[#f4f4f5] p-2">
                        <div className="flex h-full gap-1">
                            <div className="w-1/4 h-full rounded-[2px] bg-white shadow-sm border border-black/5" />
                            <div className="flex-1 flex flex-col gap-1">
                                <div className="h-3 w-full rounded-[2px] bg-white shadow-sm border border-black/5" />
                                <div className="flex-1 rounded-[2px] bg-white shadow-sm border border-black/5" />
                            </div>
                        </div>
                    </div>
                }
              />

              {/* Dark Theme Option */}
              <ThemeOption
                value="dark"
                label="Dark"
                active={theme === 'dark'}
                preview={
                    <div className="h-full w-full bg-[#18181b] p-2">
                        <div className="flex h-full gap-1">
                            <div className="w-1/4 h-full rounded-[2px] bg-[#27272a] border border-[#3f3f46]" />
                            <div className="flex-1 flex flex-col gap-1">
                                <div className="h-3 w-full rounded-[2px] bg-[#27272a] border border-[#3f3f46]" />
                                <div className="flex-1 rounded-[2px] bg-[#27272a] border border-[#3f3f46]" />
                            </div>
                        </div>
                    </div>
                }
              />

              {/* System Theme Option */}
               <ThemeOption
                value="system"
                label="System"
                active={theme === 'system'}
                preview={
                    <div className="relative h-full w-full bg-gradient-to-br from-[#f4f4f5] to-[#18181b] p-2">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-full bg-background/80 p-2 backdrop-blur-sm border border-border/50 shadow-sm">
                                <Monitor className="h-4 w-4 text-foreground" />
                            </div>
                        </div>
                    </div>
                }
              />
            </RadioGroup>
        </div>
      </div>
    </div>
  );
}

function ThemeOption({ value, label, active, preview }: { value: string, label: string, active: boolean, preview: React.ReactNode }) {
    return (
        <Label className="cursor-pointer group relative">
            <RadioGroupItem value={value} className="sr-only" />
            <div className={cn(
                "relative overflow-hidden rounded-xl border-2 transition-all duration-200 ease-in-out h-24",
                active
                    ? "border-primary ring-2 ring-primary/20 ring-offset-2"
                    : "border-border/50 hover:border-primary/50 hover:bg-muted/50"
            )}>
                {preview}
                {active && (
                    <div className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm animate-in zoom-in duration-200">
                        <Check className="h-3 w-3" />
                    </div>
                )}
            </div>
            <span className={cn(
                "mt-2 block text-center text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}>
                {label}
            </span>
        </Label>
    )
}
