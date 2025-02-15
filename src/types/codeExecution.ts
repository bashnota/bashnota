import type { JupyterServer } from './jupyter'

export interface CodeCell {
  id: string
  code: string
  serverConfig?: JupyterServer
  kernelName: string
  sessionId: string
  output: string
  isExecuting: boolean
  hasError: boolean
  error: Error | null
}

export interface KernelSession {
  id: string
  kernelId: string
  serverConfig: JupyterServer
  kernelName: string
  cells: string[]
  name: string
}

export interface CodeBlock {
  id: string
  notebookId: string
  hasError?: boolean
  code: string
}

export interface ExecutionResult {
  id: string
  hasError?: boolean
  output: string
}

export interface JupyterMessage {
  header: {
    msg_id: string
    username: string
    session: string
    msg_type: string
    version: string
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parent_header: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>
  channel: string
}

export interface MessageStatus {
  done: boolean
  output: string
}

export interface SessionManager {
  sessions: Map<string, KernelSession>
  activeSession: string | null
  createSession(name: string): string
  deleteSession(id: string): void
  setActiveSession(id: string): void
}
