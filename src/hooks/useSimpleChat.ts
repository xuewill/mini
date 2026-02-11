import { useState, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

export interface ToolCallInfo {
  toolName: string
  status: 'running' | 'done'
}

export interface Message {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallInfo[]
}

export interface UseSimpleChatOptions {
  api?: string
  initialMessages?: Message[]
  id?: string
  onFinish?: (message: Message) => void
  onError?: (error: Error) => void
}

// Marker protocol for tool call status
const TOOL_START_PREFIX = '__TOOL_START__:'
const TOOL_END_PREFIX = '__TOOL_END__:'

/**
 * Parse raw streaming text to separate tool markers from display text.
 * Tool markers: `\n__TOOL_START__:toolName\n` and `\n__TOOL_END__:toolName\n`
 */
function processStreamChunk(
  raw: string,
  toolCalls: ToolCallInfo[]
): { displayText: string; toolCalls: ToolCallInfo[] } {
  const lines = raw.split('\n')
  const textParts: string[] = []
  const updatedTools = [...toolCalls]

  for (const line of lines) {
    if (line.startsWith(TOOL_START_PREFIX)) {
      const toolName = line.slice(TOOL_START_PREFIX.length).trim()
      // Add or update tool call status
      const existing = updatedTools.find(t => t.toolName === toolName && t.status === 'running')
      if (!existing) {
        updatedTools.push({ toolName, status: 'running' })
      }
    } else if (line.startsWith(TOOL_END_PREFIX)) {
      const toolName = line.slice(TOOL_END_PREFIX.length).trim()
      const tool = updatedTools.find(t => t.toolName === toolName && t.status === 'running')
      if (tool) {
        tool.status = 'done'
      }
    } else {
      textParts.push(line)
    }
  }

  return {
    displayText: textParts.join('\n'),
    toolCalls: updatedTools,
  }
}

/**
 * Simple chat hook with tool call marker parsing.
 * Tool calls execute server-side via MCP Manager — the stream includes
 * tool status markers that are parsed out and exposed as `toolCalls` on messages.
 */
export function useSimpleChat({
  api,
  initialMessages = [],
  id,
  onFinish,
  onError
}: UseSimpleChatOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<Error | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setStatus('ready')
    }
  }, [])

  const sendMessage = useCallback(async (message: { role: 'user', content: string }, options?: { body?: any }) => {
    if (!api) {
      const err = new Error('API endpoint not provided')
      setError(err)
      onError?.(err)
      return
    }

    setStatus('submitted')
    setError(undefined)

    const userMessage: Message = {
      id: uuidv4(),
      role: message.role,
      content: message.content
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)

    try {
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      console.log('useSimpleChat: Fetching:', api)
      
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          id,
          ...options?.body
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        let errorMessage = `API error: ${response.status} ${response.statusText}`
        try {
          const errBody = await response.json()
          if (errBody.error) errorMessage = errBody.error
        } catch { /* use default */ }
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const assistantMessageId = uuidv4()
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        toolCalls: []
      }])
      
      setStatus('streaming')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let rawAccumulated = ''
      let currentToolCalls: ToolCallInfo[] = []

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          rawAccumulated += chunk

          // Parse tool markers from accumulated raw text
          const { displayText, toolCalls: updatedToolCalls } = processStreamChunk(rawAccumulated, [])
          currentToolCalls = updatedToolCalls

          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: displayText.trim(), toolCalls: currentToolCalls }
              : m
          ))
        }
      } catch (streamErr: any) {
        if (streamErr.name !== 'AbortError') {
          console.error('Stream reading error:', streamErr)
        }
      }

      // Final parse
      const { displayText, toolCalls: finalToolCalls } = processStreamChunk(rawAccumulated, [])

      setStatus('ready')

      const finalMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: displayText.trim(),
        toolCalls: finalToolCalls
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantMessageId ? finalMessage : m
      ))

      onFinish?.(finalMessage)

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatus('ready')
        return
      }
      console.error('Chat error:', err)
      setError(err)
      setStatus('error')
      onError?.(err)
    } finally {
      abortControllerRef.current = null
    }
  }, [api, messages, id, onFinish, onError])

  return {
    messages,
    setMessages,
    sendMessage,
    stop,
    status,
    error
  }
}
