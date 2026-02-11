import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react"
import { v4 as uuidv4 } from 'uuid'

export interface Message {
  id: string
  role: 'system' | 'user' | 'assistant' | 'data' | 'tool'
  content: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  messages: Message[]
}

interface SessionContextType {
  sessions: ChatSession[]
  currentSessionId: string | null
  currentSession: ChatSession | null
  createSession: () => Promise<string>
  selectSession: (id: string) => void
  deleteSession: (id: string) => Promise<void>
  updateSessionMessages: (id: string, messages: Message[]) => Promise<void>
  refreshSessions: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const currentSession = sessions.find(s => s.id === currentSessionId) || null

  const refreshSessions = async () => {
    // @ts-ignore
    if (window.ipcRenderer) {
      // @ts-ignore
      const loaded = await window.ipcRenderer.invoke('get-sessions')
      setSessions(loaded)
    }
  }

  useEffect(() => {
    refreshSessions()
  }, [])

  const createSession = useCallback(async () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: '新对话',
      createdAt: new Date().toISOString(),
      messages: []
    }
    // @ts-ignore
    await window.ipcRenderer.invoke('create-session', newSession)
    await refreshSessions()
    setCurrentSessionId(newSession.id)
    return newSession.id
  }, [])

  const deleteSession = useCallback(async (id: string) => {
    // @ts-ignore
    await window.ipcRenderer.invoke('delete-session', id)
    await refreshSessions()
    setCurrentSessionId(prev => (prev === id ? null : prev))
  }, [])

  const updateSessionMessages = useCallback(async (id: string, messages: Message[]) => {
    // Optimistic update
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, messages } : s
    ))
    
    // @ts-ignore
    await window.ipcRenderer.invoke('update-session', { id, messages })
  }, [])

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id)
  }, [])

  const value = useMemo(() => ({
    sessions,
    currentSessionId,
    currentSession,
    createSession,
    selectSession,
    deleteSession,
    updateSessionMessages,
    refreshSessions
  }), [sessions, currentSessionId, currentSession, createSession, selectSession, deleteSession, updateSessionMessages])

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}
