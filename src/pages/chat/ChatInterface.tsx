import { useEffect, useRef, useState, useCallback } from "react"
import { useSimpleChat, Message, ToolCallInfo } from "@/hooks/useSimpleChat"
import { useApi } from "@/contexts/ApiContext"
import { useSession } from "@/contexts/SessionContext"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, StopCircle, User, Bot, Plus, Wrench, Loader2, CheckCircle2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ChatInterface() {
  const { baseUrl, models, refreshModels } = useApi()
  const { currentSessionId, currentSession, updateSessionMessages, createSession } = useSession()
  
  const handleMessagesChange = useCallback((msgs: any[]) => {
    if (currentSessionId) {
      updateSessionMessages(currentSessionId, msgs)
    }
  }, [currentSessionId, updateSessionMessages])

  useEffect(() => {
    refreshModels()
  }, [])

  return (
    <ChatInstance 
      key={currentSessionId || 'empty'}
      sessionId={currentSessionId}
      initialMessages={currentSession?.messages || []}
      baseUrl={baseUrl}
      models={models}
      onMessagesChange={handleMessagesChange}
      onCreateSession={createSession}
    />
  )
}

function ChatInstance({ 
  sessionId, 
  initialMessages, 
  baseUrl, 
  models,
  onMessagesChange,
  onCreateSession 
}: { 
  sessionId: string | null
  initialMessages: any[]
  baseUrl: string | null
  models: any[]
  onMessagesChange: (messages: any[]) => void
  onCreateSession: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, stop, error } = useSimpleChat({
    api: baseUrl ? `${baseUrl}/chat` : undefined,
    initialMessages,
    id: sessionId || undefined,
    onError: (err) => {
      console.error("Chat error:", err)
      toast.error(err.message || "发送消息失败")
    },
    onFinish: (message) => {
      // We rely on useEffect for syncing
    }
  })

  // Sync messages to store only when chat is stable (ready/idle) to avoid IPC flooding during streaming
  useEffect(() => {
    // Only sync if we have messages and the status indicates we're done streaming/processing
    if (sessionId && messages.length > 0 && (status === 'ready' || status === 'idle')) {
      onMessagesChange(messages)
    }
  }, [messages, sessionId, onMessagesChange, status])

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  const [inputValue, setInputValue] = useState("")
  const [selectedModel, setSelectedModel] = useState<string>("")

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id)
    }
  }, [models, selectedModel])

  const onCustomSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim() || !baseUrl) return

    const text = inputValue
    setInputValue("")

    await sendMessage({
      role: 'user',
      content: text
    }, {
      body: {
        model: selectedModel
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onCustomSubmit()
    }
  }

  if (!sessionId) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center text-muted-foreground">
        <Bot className="h-16 w-16 mb-4 opacity-20" />
        <h2 className="text-xl font-semibold mb-2">欢迎使用运维小助手</h2>
        <p className="mb-4">请从左侧选择对话或开始新对话。</p>
        <Button onClick={onCreateSession}>
          <Plus className="mr-2 h-4 w-4" />
          新建对话
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background/50 font-sans">
      <div className="flex items-center justify-between p-4 border-b border-border/40 bg-background/80 backdrop-blur-md z-10 sticky top-0">
        <div className="font-heading font-semibold text-lg tracking-tight truncate max-w-[200px]">
           对话
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[180px] bg-background/50 border-border/50 backdrop-blur-sm">
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {models.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-8 max-w-3xl mx-auto pb-8">
          {messages.length === 0 ? (
            <div className="flex flex-col h-[40vh] items-center justify-center text-muted-foreground gap-6 mt-[5vh]">
              <div className="p-6 bg-secondary/50 rounded-3xl animate-in fade-in zoom-in duration-500">
                <Bot className="h-10 w-10 opacity-50" />
              </div>
              <div className="text-center space-y-2">
                  <p className="text-lg font-medium text-foreground">欢迎使用运维小助手</p>
                  <p className="text-sm">开始与 {models.find(m => m.id === selectedModel)?.name || 'AI'} 对话...</p>
              </div>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className={`rounded-2xl px-5 py-3.5 max-w-[85%] shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card border border-border/50'
                }`}>
                  {/* Tool call indicators */}
                  {m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mb-2 space-y-1.5 pb-2 border-b border-border/50">
                      {m.toolCalls.map((tc, idx) => (
                        <div key={`${tc.toolName}-${idx}`} className="flex items-center gap-2 text-xs">
                          {tc.status === 'running' ? (
                            <Loader2 className="h-3 w-3 text-yellow-500 animate-spin shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                          )}
                          <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground font-mono truncate">
                            {tc.toolName.replace('__', ' → ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={`prose prose-sm break-words ${m.role === 'user' ? 'prose-invert' : 'dark:prose-invert'} max-w-none`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}
          {(status === 'submitted') && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-xl px-4 py-3 bg-card border shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  思考中...
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
              Error: {error.message}
            </div>
          )}
          {/* Auto-scroll sentinel */}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      <div className="p-4 lg:p-6 border-t border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto">
            <form onSubmit={onCustomSubmit} className="relative flex items-end gap-2 p-2 border border-input/60 rounded-2xl bg-background/50 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
              <Textarea 
                className="min-h-[20px] max-h-[200px] w-full resize-none border-0 shadow-none focus-visible:ring-0 p-3 bg-transparent leading-relaxed custom-scrollbar placeholder:text-muted-foreground/50"
                placeholder="输入消息..." 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!baseUrl || status === 'submitted' || status === 'streaming'}
              />
              <div className="pb-2 pr-2">
                  {status === 'streaming' || status === 'submitted' ? (
                    <Button type="button" size="icon" variant="destructive" className="h-9 w-9 rounded-xl transition-all duration-200 hover:scale-105" onClick={stop}>
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" size="icon" className="h-9 w-9 rounded-xl transition-all duration-200 hover:scale-105 shadow-md" disabled={!inputValue.trim() || !baseUrl}>
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
              </div>
            </form>
            <div className="text-[10px] text-center text-muted-foreground/60 mt-3 font-medium">
                 由运维小助手模型提供支持
            </div>
        </div>
      </div>
    </div>
  )
}
