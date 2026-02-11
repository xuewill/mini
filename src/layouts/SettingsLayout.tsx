import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Settings, Server, Cpu, ArrowLeft } from "lucide-react";

export function SettingsLayout() {
  const location = useLocation();

  const navItems = [
    { href: "/settings/general", label: "通用", icon: Settings },
    { href: "/settings/models", label: "模型", icon: Cpu },
    { href: "/settings/mcp", label: "MCP 服务器", icon: Server },
  ];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-lg font-semibold tracking-tight">
            设置
          </h2>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Button
                variant={location.pathname === item.href ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
