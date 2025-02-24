import type { JupyterServer } from './jupyter'

export interface Terminal {
  name: string
  last_activity: string
}

export interface TerminalState {
  id: string
  name: string
  serverConfig: JupyterServer
  lastActivity: string
  isConnected: boolean
  output: string[]
} 