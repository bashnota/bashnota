export interface JupyterServer {
  ip: string
  port: string
  token: string
}

export interface JupyterSession {
  id: string
  kernel: {
    id: string
    name: string
    execution_state: string
  }
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

export interface NotaConfig {
  jupyterServers: JupyterServer[]
  notebooks: Array<{
    notebook: string
    server: string
    kernel: string
  }>
  kernels: Record<string, string[]>
}
