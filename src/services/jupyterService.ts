import axios, { AxiosError } from 'axios'
import type { JupyterServer, ExecutionResult, KernelSpec, WSMessage } from '@/types/jupyter'
import { v4 as uuidv4 } from 'uuid'

export class JupyterService {
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

  private handleError(error: unknown, message: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      if (axiosError.code === 'ECONNREFUSED') {
        throw new Error('Server is not reachable')
      } else if (axiosError.response?.status === 403) {
        throw new Error('Invalid token')
      } else if (axiosError.code === 'ETIMEDOUT') {
        throw new Error('Connection timed out')
      }
      throw new Error(`${message}: ${axiosError.message}`)
    }
    throw error
  }

  async getAvailableKernels(server: JupyterServer) {
    try {
      const response = await axios.get(this.getUrlWithToken(server, '/kernelspecs'))

      const { kernelspecs } = response.data as Record<string, KernelSpec>
      return Object.entries(kernelspecs).map(([name, spec]: [string, KernelSpec]) => ({
        name: name,
        spec: { ...spec.spec },
      }))
    } catch (error) {
      this.handleError(error, 'Failed to get available kernels')
    }
  }

  private getWebSocketUrl(server: JupyterServer, kernelId: string): string {
    const protocol = server.ip.startsWith('https') ? 'wss' : 'ws'
    const baseUrl = server.ip.startsWith('http')
      ? server.ip.replace(/^http(s?):\/\//, '')
      : server.ip
    return `${protocol}://${baseUrl}:${server.port}/api/kernels/${kernelId}/channels`
  }

  async executeCode(
    server: JupyterServer,
    kernelName: string,
    code: string,
  ): Promise<ExecutionResult> {
    try {
      // Create a new kernel
      const kernelResponse = await axios.post(this.getUrlWithToken(server, '/kernels'), {
        name: kernelName,
      })

      const kernelId = kernelResponse.data.id

      try {
        // Connect to WebSocket
        const ws = new WebSocket(this.getWebSocketUrl(server, kernelId))
        const msgId = uuidv4()

        // Wait for execution results
        const result = await new Promise<ExecutionResult>((resolve, reject) => {
          const messages: WSMessage[] = []

          ws.onopen = () => {
            // Send execute request
            ws.send(
              JSON.stringify({
                header: {
                  msg_id: msgId,
                  username: 'bashnota',
                  session: uuidv4(),
                  msg_type: 'execute_request',
                  version: '5.2',
                },
                parent_header: {},
                metadata: {},
                content: {
                  code,
                  silent: false,
                  store_history: true,
                  user_expressions: {},
                  allow_stdin: false,
                },
                channel: 'shell',
              }),
            )
          }

          ws.onmessage = (event) => {
            const msg = JSON.parse(event.data)
            if (msg.parent_header.msg_id === msgId) {
              messages.push(msg)

              // Check if execution is complete
              if (msg.msg_type === 'status' && msg.content.execution_state === 'idle') {
                ws.close()
                resolve(this.processMessages(messages))
              }
              // Check for errors
              else if (msg.msg_type === 'error') {
                ws.close()
                resolve(this.processMessages(messages))
              }
            }
          }

          ws.onerror = (error) => {
            reject(new Error('WebSocket error: ' + error))
          }

          // Set timeout
          setTimeout(() => {
            ws.close()
            resolve(this.processMessages(messages))
          }, 10000)
        })

        return result
      } finally {
        // Clean up the kernel
        await this.deleteKernel(server, kernelId)
      }
    } catch (error) {
      console.error('Execute code error:', error)
      throw error
    }
  }

  private async deleteKernel(server: JupyterServer, kernelId: string): Promise<void> {
    try {
      await axios.delete(this.getUrlWithToken(server, `/kernels/${kernelId}`))
    } catch (error) {
      console.warn('Failed to delete kernel:', error)
    }
  }

  private processMessages(messages: WSMessage[]): ExecutionResult {
    const result: ExecutionResult = {
      content: {
        execution_count: 0,
        data: {},
        stdout: '',
        stderr: '',
      },
    }

    for (const msg of messages) {
      switch (msg.msg_type) {
        case 'execute_input':
          result.content.execution_count = msg.content.execution_count
          break
        case 'stream':
          if (msg.content.name === 'stdout') {
            result.content.stdout += msg.content.text || ''
          } else if (msg.content.name === 'stderr') {
            result.content.stderr += msg.content.text || ''
          }
          break
        case 'execute_result':
        case 'display_data':
          result.content.data = { ...result.content.data, ...msg.content.data }
          if (msg.content.execution_count !== undefined) {
            result.content.execution_count = msg.content.execution_count
          }
          break
        case 'error':
          result.content.error = {
            ename: msg.content.ename || '',
            evalue: msg.content.evalue || '',
            traceback: msg.content.traceback || [],
          }
          break
      }
    }

    return result
  }

  async testConnection(server: JupyterServer) {
    try {
      const response = await axios.get(this.getUrlWithToken(server, '/kernels'))
      return {
        success: true,
        version: response.data.version,
        message: 'Connected successfully',
      }
    } catch (error) {
      let message = 'Connection failed'
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          message = 'Server is not reachable'
        } else if (error.response?.status === 403) {
          message = 'Invalid token'
        } else if (error.code === 'ETIMEDOUT') {
          message = 'Connection timed out'
        }
        console.error('Connection error:', error.message)
      }
      return {
        success: false,
        message,
      }
    }
  }
}
