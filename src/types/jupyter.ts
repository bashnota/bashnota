export interface JupyterServer {
  ip: string
  port: string
  token: string
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

export interface CloudProvider {
  id: string
  name: string
  logo: string
  description: string
}

export interface VMConfiguration {
  name: string
  provider: string
  region: string
  instanceType: string
  diskSize: number
  sshKey?: string
  username?: string
  password?: string
}

export interface CloudVM extends VMConfiguration {
  id: string
  status: 'creating' | 'running' | 'stopped' | 'error'
  ipAddress?: string
  createdAt: string
  jupyterUrl?: string
  jupyterToken?: string
}

export interface NotaConfig {
  jupyterServers: Array<{
    ip: string
    port: string
    token: string
  }>
  kernels: Record<string, KernelSpec[]>
  kernelPreferences: Record<string, KernelConfig>
  savedSessions: Array<{
    id: string
    name: string
  }>
  cloudVMs?: CloudVM[]
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

export interface WSMessage {
  msg_type: string
  content: {
    execution_count: number
    data?: {
      'text/plain'?: string
      'text/html'?: string
      'image/png'?: string
    }
    name?: string
    text?: string
    ename?: string
    evalue?: string
    traceback?: string[]
  }
}
