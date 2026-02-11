import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Settings, Server, Cpu, ArrowLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export function SettingsLayout() {
  const location = useLocation();

  const navItems = [
    { href: "/settings/general", label: "General", icon: Settings, description: "Theme & preferences" },
    { href: "/settings/models", label: "Models", icon: Cpu, description: "AI providers configuration" },
    { href: "/settings/mcp", label: "MCP Servers", icon: Server, description: "Manage protocol connections" },
  ];

  return (
    <div className="flex h-screen w-full bg-background font-sans text-foreground selection:bg-primary/20">
      {/* Sidebar */}
      <aside className="group/sidebar flex w-64 flex-col border-r border-border/40 bg-background/50 backdrop-blur-xl transition-all duration-300">

        {/* Header */}
        <div className="flex h-16 items-center border-b border-border/40 px-6">
            <Link
              to="/"
              className="group flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border/40 bg-background shadow-sm transition-all group-hover:border-primary/20 group-hover:shadow-md">
                <ArrowLeft className="h-3 w-3" />
              </div>
              <span className="tracking-tight">Back to Chat</span>
            </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            System Configuration
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href);

              return (
                <Link key={item.href} to={item.href} className="block">
                  <div className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute left-0 h-1/2 w-1 -translate-x-3 rounded-r-full bg-primary"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    <item.icon className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                    )} />

                    <span className="flex-1">{item.label}</span>

                    {isActive && (
                       <ChevronRight className="h-3 w-3 text-primary/50" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 p-4">
           <div className="rounded-md bg-muted/30 p-3">
              <p className="text-xs font-medium text-foreground">Ops Assistant</p>
              <p className="text-[10px] text-muted-foreground">v1.0.0 • Stable</p>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden bg-muted/5">
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-4xl px-8 py-10">
            {/* Animated Page Transition */}
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              <Outlet />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
