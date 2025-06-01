export interface JupyterServer {
  ip: string
  port: string
  token: string
  name?: string
}

// Extended server interface for managed servers with additional metadata
export interface ManagedJupyterServer extends JupyterServer {
  id: string
  name: string
  url: string
  status: 'connected' | 'disconnected' | 'connecting'
}

// File management interfaces
export interface JupyterFile {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  lastModified?: string
  content?: string
}

export interface JupyterDirectory {
  path: string
  files: JupyterFile[]
}

export interface ExecutionResult {
  content: {
    execution_count: number
    data?: {
      'text/plain'?: string
      'text/html'?: string
      'image/png'?: string
    }
    stdout?: string
    stderr?: string
    error?: {
      ename: string
      evalue: string
      traceback: string[]
    }
  }
}

export interface KernelConfig {
  blockId: string
  kernelName: string
  serverId: string
  lastUsed: string
}

export interface NotaConfig {
  kernelPreferences: Record<string, KernelConfig>
  savedSessions: Array<{
    id: string
    name: string
    isShared?: boolean
  }>
  settings?: {
    autoSave: boolean
    defaultKernel?: string
    theme?: 'light' | 'dark' | 'system'
    fontSize?: number
    lineNumbers?: boolean
  }
  // New properties for shared session feature
  sharedSessionMode?: boolean
  sharedSessionId?: string | null
}

export interface KernelSpec {
  name: string
  spec: {
    display_name: string
    language: string
    argv: string[]
    metadata: Record<string, unknown>
  }
}

// Jupyter runtime information interfaces
export interface JupyterKernel {
  id: string
  name: string
  lastActivity: string
  executionState: string
  connections: number
}

export interface JupyterSession {
  id: string
  name: string
  path: string
  kernel: {
    id: string
    name: string
    lastActivity: string
  }
}

export interface WSMessage {
  msg_type: string
  parent_header: {
    msg_id?: string
    [key: string]: any
  }
  header?: {
    msg_id: string
    username: string
    session: string
    msg_type: string
    version: string
    [key: string]: any
  }
  metadata?: Record<string, any>
  content: {
    execution_count?: number
    execution_state?: string
    data?: {
      'text/plain'?: string
      'text/html'?: string
      'image/png'?: string
      [key: string]: any
    }
    name?: string
    text?: string
    ename?: string
    evalue?: string
    traceback?: string[]
    code?: string
    silent?: boolean
    store_history?: boolean
    user_expressions?: Record<string, any>
    allow_stdin?: boolean
    [key: string]: any
  }
  channel?: string
  [key: string]: any
}
