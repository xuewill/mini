import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ApiProvider } from '@/contexts/ApiContext'
import { SessionProvider } from '@/contexts/SessionContext'
import { ChatLayout } from '@/layouts/ChatLayout'
import { ChatInterface } from '@/pages/chat/ChatInterface'
import { SettingsLayout } from '@/layouts/SettingsLayout'
import { ModelSettings } from '@/pages/settings/ModelSettings'
import { MCPSettings } from '@/pages/settings/MCPSettings'
import { GeneralSettings } from '@/pages/settings/GeneralSettings'
import { Toaster } from 'sonner'

function App() {
  return (
    <ApiProvider>
      <SessionProvider>
        <HashRouter>
          <Routes>
          {/* Chat Routes */}
          <Route path="/" element={<ChatLayout />}>
            <Route index element={<ChatInterface />} />
            <Route path="chat/:id" element={<ChatInterface />} />
          </Route>

          {/* Settings Routes */}
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="models" replace />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="models" element={<ModelSettings />} />
            <Route path="mcp" element={<MCPSettings />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster position="bottom-right" richColors closeButton theme="system" />
      </SessionProvider>
    </ApiProvider>
  )
}

export default App