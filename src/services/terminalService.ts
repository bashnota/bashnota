import type { JupyterServer } from '@/types/jupyter'
import type { Terminal } from '@/types/terminal'

export class TerminalService {
  private getBaseUrl(server: JupyterServer): string {
    const protocol = server.ip.startsWith('http') ? '' : 'http://'
    return `${protocol}${server.ip}:${server.port}/api`
  }

  private getUrlWithToken(serverConfig: JupyterServer, endpoint: string): string {
    const url = `${this.getBaseUrl(serverConfig)}${endpoint}`
    if (serverConfig.token) {
      return `${url}?token=${serverConfig.token}`
    }
    return url
  }

  private getWebSocketUrl(server: JupyterServer, terminalId: string): string {
    const baseUrl = this.getBaseUrl(server).replace('/api', '')
    
    const wsBase = baseUrl
      .replace('http://', 'ws://')
      .replace('https://', 'wss://')
    
    let url = `${wsBase}/terminals/websocket/${terminalId}`
    
    if (server.token) {
      url += `?token=${server.token}`
    }
    
    return url
  }

  async listTerminals(server: JupyterServer): Promise<Terminal[]> {
    const response = await fetch(this.getUrlWithToken(server, '/terminals'))
    if (!response.ok) {
      throw new Error(`Failed to list terminals: ${response.statusText}`)
    }
    return response.json()
  }

  async createTerminal(server: JupyterServer): Promise<Terminal> {
    const response = await fetch(this.getUrlWithToken(server, '/terminals'), {
      method: 'POST'
    })
    if (!response.ok) {
      throw new Error(`Failed to create terminal: ${response.statusText}`)
    }
    return response.json()
  }

  async getTerminal(server: JupyterServer, terminalId: string): Promise<Terminal> {
    const response = await fetch(this.getUrlWithToken(server, `/terminals/${terminalId}`))
    if (!response.ok) {
      throw new Error(`Failed to get terminal: ${response.statusText}`)
    }
    return response.json()
  }

  async deleteTerminal(server: JupyterServer, terminalId: string): Promise<void> {
    const response = await fetch(this.getUrlWithToken(server, `/terminals/${terminalId}`), {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`Failed to delete terminal: ${response.statusText}`)
    }
  }

  connectToTerminal(server: JupyterServer, terminalId: string): WebSocket {
    const ws = new WebSocket(this.getWebSocketUrl(server, terminalId))
    return ws
  }
} 