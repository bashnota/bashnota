import axios, { AxiosError } from 'axios'
import type { JupyterServer, ExecutionResult, KernelSpec, WSMessage } from '@/types/jupyter'
import { v4 as uuidv4 } from 'uuid'

export class JupyterService {
  /**
   * Parse a Jupyter URL into a JupyterServer object
   * Handles both standard Jupyter URLs and Kaggle Jupyter URLs
   * @param url The Jupyter URL to parse
   * @returns A JupyterServer object or null if parsing fails
   */
  parseJupyterUrl(url: string): JupyterServer | null {
    try {
      // Handle URLs without protocol (add http:// by default)
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `http://${url}`
      }
      
      const urlObj = new URL(url)
      
      // Handle Kaggle Jupyter URLs
      if (urlObj.hostname.includes('kaggle')) {
        // Extract token from query parameters
        const token = urlObj.searchParams.get('token')
        if (!token) {
          console.error('No token found in Kaggle URL')
          return null
        }
        
        // For Kaggle, we use the full hostname as the IP
        // and extract the protocol (http/https)
        const protocol = urlObj.protocol
        const ip = `${protocol}//${urlObj.hostname}`
        
        // Kaggle typically uses port 80 for HTTP and 443 for HTTPS
        // but we'll use the port from the URL if it exists
        const port = urlObj.port || (protocol === 'https:' ? '443' : '80')
        
        return {
          ip,
          port,
          token
        }
      }
      
      // Handle standard Jupyter URLs
      const protocol = urlObj.protocol
      const hostname = urlObj.hostname
      
      // For localhost or IP addresses, we can keep just the hostname
      // For other domains, include the protocol
      const ip = hostname === 'localhost' || this.isIPAddress(hostname) 
        ? hostname 
        : `${protocol}//${hostname}`
      
      const port = urlObj.port || (protocol === 'https:' ? '443' : '80')
      
      // Extract token from query parameters
      const token = urlObj.searchParams.get('token') || ''
      
      return {
        ip,
        port,
        token
      }
    } catch (error) {
      console.error('Error parsing Jupyter URL:', error)
      return null
    }
  }

  // Helper method to check if a string is an IP address
  private isIPAddress(str: string): boolean {
    // Simple IPv4 check
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    return ipv4Regex.test(str)
  }

  private getBaseUrl(server: JupyterServer): string {
    // If the IP already has a protocol, use it as is
    // Otherwise, add http:// protocol for localhost and IP addresses
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
    // For IPs with protocol, extract the hostname
    // Otherwise, use the IP directly (localhost or IP address)
    let baseUrl = server.ip
    let protocol = 'ws'
    
    if (server.ip.startsWith('http')) {
      // For URLs with protocol, determine ws/wss based on http/https
      protocol = server.ip.startsWith('https') ? 'wss' : 'ws'
      baseUrl = server.ip.replace(/^http(s?):\/\//, '')
    }
    
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

  async deleteKernel(server: JupyterServer, kernelId: string): Promise<void> {
    try {
      await axios.delete(this.getUrlWithToken(server, `/kernels/${kernelId}`))
    } catch (error) {
      this.handleError(error, 'Failed to delete kernel')
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
      // First, validate the server parameters
      if (!server.ip) {
        return {
          success: false,
          message: 'Server IP is required',
        }
      }
      
      if (!server.port) {
        return {
          success: false,
          message: 'Server port is required',
        }
      }
      
      // Test the API endpoint
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
            message = 'Server is not reachable. Check IP and port settings.'
          } else if (error.response?.status === 403) {
            message = 'Authentication failed. Please check your token.'
          } else if (error.response?.status === 401) {
            message = 'Unauthorized. Please check your credentials.'
          } else if (error.code === 'ETIMEDOUT') {
            message = 'Connection timed out. Check if server is running.'
          } else if (error.code === 'ENOTFOUND') {
            message = 'Host not found. Check your server address.'
          } else if (error.message) {
            message = `Connection error: ${error.message}`
          }
          console.error('Connection error:', error.message)
        }
        
        return {
          success: false,
          message,
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'An unexpected error occurred while testing the connection',
      }
    }
  }

  async getRunningKernels(server: JupyterServer) {
    try {
      const response = await axios.get(this.getUrlWithToken(server, '/kernels'))
      return response.data.map((kernel: any) => ({
        id: kernel.id,
        name: kernel.name,
        lastActivity: kernel.last_activity,
        executionState: kernel.execution_state,
        connections: kernel.connections
      }))
    } catch (error) {
      this.handleError(error, 'Failed to get running kernels')
    }
  }

  async getActiveSessions(server: JupyterServer) {
    try {
      const response = await axios.get(this.getUrlWithToken(server, '/sessions'))
      return response.data.map((session: any) => ({
        id: session.id,
        name: session.name || session.path.split('/').pop() || 'Untitled',
        path: session.path,
        kernel: {
          id: session.kernel.id,
          name: session.kernel.name,
          lastActivity: session.kernel.last_activity
        }
      }))
    } catch (error) {
      this.handleError(error, 'Failed to get active sessions')
    }
  }
}