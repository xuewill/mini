import { createContext, useContext, useEffect, useState, ReactNode } from "react"

interface ModelConfig {
  id: string
  name: string
  enabled: boolean
}

interface ApiContextType {
  baseUrl: string | null
  port: number | null
  models: ModelConfig[]
  refreshModels: () => Promise<void>
}

const ApiContext = createContext<ApiContextType | undefined>(undefined)

export function ApiProvider({ children }: { children: ReactNode }) {
  const [port, setPort] = useState<number | null>(null)
  const [models, setModels] = useState<ModelConfig[]>([])

  const refreshModels = async () => {
    // @ts-ignore
    if (window.ipcRenderer) {
      // @ts-ignore
      const data = await window.ipcRenderer.invoke('get-settings')
      if (data.openai && data.openai.models) {
        setModels(data.openai.models.filter((m: any) => m.enabled))
      }
    }
  }

  useEffect(() => {
    // @ts-ignore
    if (window.ipcRenderer) {
      // @ts-ignore
      // @ts-ignore
      console.log('ApiContext: Requesting port from IPC...')
      window.ipcRenderer.invoke('get-port').then((p: number) => {
        console.log('ApiContext: Received API Port:', p)
        setPort(p)
      }).catch((e: any) => console.error('ApiContext: Failed to get port:', e))
      refreshModels()
    }
  }, [])

  const baseUrl = port ? `http://127.0.0.1:${port}/api` : null

  return (
    <ApiContext.Provider value={{ baseUrl, port, models, refreshModels }}>
      {children}
    </ApiContext.Provider>
  )
}

export function useApi() {
  const context = useContext(ApiContext)
  if (context === undefined) {
    throw new Error("useApi must be used within an ApiProvider")
  }
  return context
}
