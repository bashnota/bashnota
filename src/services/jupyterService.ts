import axios, { AxiosError } from 'axios'
import type { JupyterServer, JupyterSession, ExecutionResult } from '@/types/jupyter'

export class JupyterService {
  private getBaseUrl(server: JupyterServer): string {
    const protocol = server.ip.startsWith('http') ? '' : 'http://'
    return `${protocol}${server.ip}:${server.port}/api`
  }

  private getUrlWithToken(server: JupyterServer, endpoint: string): string {
    return `${this.getBaseUrl(server)}${endpoint}`
  }

  private getHeaders(server: JupyterServer) {
    return {
      Authorization: `token ${server.token}`,
      'Content-Type': 'application/json',
    }
  }

  private getRequestConfig(server: JupyterServer) {
    return {
      headers: this.getHeaders(server),
      withCredentials: false, // Change this to false since we're using token auth
    }
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

      const { kernelspecs } = response.data
      return Object.entries(kernelspecs).map(([_, spec]: [string, any]) => ({
        name: spec.name,
        display_name: spec.spec.display_name,
        language: spec.spec.language,
        path: spec.spec.path,
      }))
    } catch (error) {
      this.handleError(error, 'Failed to get available kernels')
    }
  }

  async validateKernel(server: JupyterServer, kernelName: string): Promise<boolean> {
    try {
      const kernels = await this.getAvailableKernels(server)
      return kernels.some((kernel) => kernel.name === kernelName)
    } catch (error) {
      console.error('Failed to validate kernel:', error)
      return false
    }
  }

  async createSession(server: JupyterServer, kernelName: string): Promise<JupyterSession> {
    try {
      // First start a kernel
      const kernelResponse = await axios.post(
        this.getUrlWithToken(server, '/kernels'),
        { name: kernelName },
        this.getRequestConfig(server),
      )

      const kernel = kernelResponse.data

      // Then create a session using that kernel
      const sessionResponse = await axios.post(
        this.getUrlWithToken(server, '/sessions'),
        {
          kernel: {
            id: kernel.id,
            name: kernelName,
          },
          name: `bashnota-session-${Date.now()}`,
          path: `bashnota-${Date.now()}.ipynb`,
          type: 'notebook',
        },
        this.getRequestConfig(server),
      )

      return sessionResponse.data
    } catch (error) {
      console.error('Session creation error:', error)
      this.handleError(error, 'Failed to create session')
    }
  }

  async listSessions(server: JupyterServer) {
    try {
      const response = await axios.get(this.getUrlWithToken(server, '/sessions'))
      return response.data
    } catch (error) {
      console.error('Failed to list sessions:', error)
      throw error
    }
  }

  async getSessionStatus(server: JupyterServer, sessionId: string) {
    try {
      const response = await axios.get(this.getUrlWithToken(server, `/sessions/${sessionId}`))
      return response.data
    } catch (error) {
      console.error('Failed to get session status:', error)
      throw error
    }
  }

  async listKernels(server: JupyterServer) {
    try {
      const response = await axios.get(this.getUrlWithToken(server, '/kernels'))
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to list kernels')
    }
  }

  async deleteSession(server: JupyterServer, sessionId: string): Promise<void> {
    try {
      await axios.delete(this.getUrlWithToken(server, `/sessions/${sessionId}`))
    } catch (error) {
      this.handleError(error, 'Failed to delete session')
    }
  }

  async executeCode(server: JupyterServer, sessionId: string, code: string) {
    try {
      const response = await axios.post(
        this.getUrlWithToken(server, `/sessions/${sessionId}/execute`),
        { code },
        this.getRequestConfig(server),
      )
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to execute code')
    }
  }

  async getExecutionResult(
    server: JupyterServer,
    sessionId: string,
    msgId: string,
  ): Promise<ExecutionResult> {
    try {
      const session = await this.getSessionStatus(server, sessionId)
      const kernelId = session.kernel.id

      const response = await axios.get(
        this.getUrlWithToken(server, `/kernels/${kernelId}/messages`),
        {
          params: { msg_id: msgId },
          headers: this.getHeaders(server),
          withCredentials: true,
        },
      )

      const messages = response.data
      const result: ExecutionResult = {
        content: {
          execution_count: null,
          data: {},
          stdout: '',
          stderr: '',
          error: null,
        },
      }

      messages.forEach((msg: any) => {
        if (msg.msg_type === 'execute_result' || msg.msg_type === 'display_data') {
          result.content.data = { ...result.content.data, ...msg.content.data }
          result.content.execution_count = msg.content.execution_count
        } else if (msg.msg_type === 'stream') {
          if (msg.content.name === 'stdout') {
            result.content.stdout += msg.content.text
          } else if (msg.content.name === 'stderr') {
            result.content.stderr += msg.content.text
          }
        } else if (msg.msg_type === 'error') {
          result.content.error = {
            ename: msg.content.ename,
            evalue: msg.content.evalue,
            traceback: msg.content.traceback,
          }
        }
      })

      return result
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Get result error:', error.response?.data)
      }
      this.handleError(error, 'Failed to get execution result')
    }
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

  async createKernel(server: JupyterServer, kernelName: string) {
    try {
      const response = await axios.post(this.getUrlWithToken(server, '/kernels'), {
        name: kernelName,
      })
      return {
        success: true,
        data: response.data,
        message: 'Kernel created successfully',
      }
    } catch (error) {
      this.handleError(error, 'Failed to create kernel')
    }
  }

  async deleteKernel(server: JupyterServer, kernelId: string) {
    try {
      await axios.delete(this.getUrlWithToken(server, `/kernels/${kernelId}`))
      return { success: true, message: 'Kernel deleted successfully' }
    } catch (error) {
      this.handleError(error, 'Failed to delete kernel')
    }
  }

  async fetchKernels(server: JupyterServer) {
    try {
      const [specsResponse, kernelsResponse] = await Promise.all([
        axios.get(this.getUrlWithToken(server, '/kernelspecs')),
        axios.get(this.getUrlWithToken(server, '/kernels')),
      ])

      const { kernelspecs } = specsResponse.data
      const runningKernels = kernelsResponse.data

      return {
        kernelSpecs: Object.entries(kernelspecs).map(([_, spec]: [string, any]) => ({
          name: spec.name,
          display_name: spec.spec.display_name,
          language: spec.spec.language,
          path: spec.spec.path,
        })),
        runningKernels,
      }
    } catch (error) {
      this.handleError(error, 'Failed to fetch kernel information')
    }
  }

  async startKernel(server: JupyterServer, name: string, path?: string) {
    try {
      const response = await axios.post(this.getUrlWithToken(server, '/kernels'), { name, path })
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to start kernel')
    }
  }

  async restartKernel(server: JupyterServer, kernelId: string): Promise<boolean> {
    try {
      await axios.post(this.getUrlWithToken(server, `/kernels/${kernelId}/restart`), {})
      return true
    } catch (error) {
      console.error('Failed to restart kernel:', error)
      return false
    }
  }

  async validateConfig(server: JupyterServer): Promise<boolean> {
    try {
      await axios.get(this.getUrlWithToken(server, '/kernels'))
      return true
    } catch (error) {
      console.error('Failed to validate config:', error)
      return false
    }
  }
}
