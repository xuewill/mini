import { Link, Outlet, NavLink, useNavigate } from "react-router-dom";
import { MessageSquare, Plus, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSession } from "@/contexts/SessionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function ChatLayout() {
  const { sessions, currentSessionId, createSession, selectSession, deleteSession } = useSession();
  const navigate = useNavigate();

  const handleNewChat = async () => {
    const id = await createSession();
    // Navigate is handled by selectSession logic often, but here we just ensure route updates if needed
    // But since we use currentSessionId context, maybe we don't need route params yet?
    // Actually, let's keep it simple: contexts drives the UI.
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar - Floating/Distinct style */}
      <aside className="w-72 bg-secondary/30 backdrop-blur-xl flex flex-col border-r border-border/50 relative z-[9999]">
        <div className="p-4 border-b space-y-2">
           <Button onClick={handleNewChat} variant="secondary" className="w-full justify-start gap-2">
             <Plus className="h-4 w-4" />
             新建对话
           </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div 
                key={session.id}
                className={cn(
                  "group flex items-center w-full rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer mb-1",
                  currentSessionId === session.id ? "bg-accent text-accent-foreground" : "transparent"
                )}
                onClick={() => selectSession(session.id)}
              >
                <MessageSquare className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <span className="truncate flex-1 text-left">{session.title || '新对话'}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t mt-auto">
          <div 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors w-full"
            onClick={() => {
              console.log('Settings clicked, forcing navigation');
              window.location.hash = '#/settings';
            }}
          >
            <Settings className="h-4 w-4" />
            <span>设置</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <ErrorBoundary fallbackMessage="聊天遇到错误">
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
