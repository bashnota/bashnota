import axios, { AxiosError } from 'axios';
import type { JupyterServer, JupyterSession, ExecutionResult } from '@/types/jupyter';
import { v4 as uuidv4 } from 'uuid';

export class JupyterService {
  private websockets: Map<string, WebSocket> = new Map();

  private getBaseUrl(server: JupyterServer): string {
    const protocol = server.ip.startsWith('http') ? '' : 'http://'
    return `${protocol}${server.ip}:${server.port}/api`
  }

  private getUrlWithToken(server: JupyterServer, endpoint: string): string {
    return `${this.getBaseUrl(server)}${endpoint}`
  }

  private getHeaders(server: JupyterServer) {
    return {
      'Authorization': `token ${server.token}`,
      'Content-Type': 'application/json',
    }
  }

  private getRequestConfig(server: JupyterServer) {
    return {
      headers: this.getHeaders(server),
      withCredentials: false
    }
  }

  private handleError(error: unknown, message: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED') {
        throw new Error('Server is not reachable');
      } else if (axiosError.response?.status === 403) {
        throw new Error('Invalid token');
      } else if (axiosError.code === 'ETIMEDOUT') {
        throw new Error('Connection timed out');
      }
      throw new Error(`${message}: ${axiosError.message}`);
    }
    throw error;
  }

  async getAvailableKernels(server: JupyterServer) {
    try {
      const response = await axios.get(
        this.getUrlWithToken(server, '/kernelspecs')
      );
      
      const { kernelspecs } = response.data;
      return Object.entries(kernelspecs).map(([_, spec]: [string, any]) => ({
        name: spec.name,
        display_name: spec.spec.display_name,
        language: spec.spec.language,
        path: spec.spec.path
      }));
    } catch (error) {
      this.handleError(error, 'Failed to get available kernels');
    }
  }

  async validateKernel(server: JupyterServer, kernelName: string): Promise<boolean> {
    try {
      const kernels = await this.getAvailableKernels(server);
      return kernels.some(kernel => kernel.name === kernelName);
    } catch (error) {
      console.error('Failed to validate kernel:', error);
      return false;
    }
  }

  async createSession(server: JupyterServer, kernelName: string): Promise<JupyterSession> {
    try {
      // First start a kernel
      const kernelResponse = await axios.post(
        this.getUrlWithToken(server, '/kernels'),
        { name: kernelName },
        this.getRequestConfig(server)
      );
      
      const kernel = kernelResponse.data;
      
      // Then create a session using that kernel
      const sessionResponse = await axios.post(
        this.getUrlWithToken(server, '/sessions'),
        {
          kernel: {
            id: kernel.id,
            name: kernelName
          },
          name: `bashnota-session-${Date.now()}`,
          path: `bashnota-${Date.now()}.ipynb`,
          type: 'notebook'
        },
        this.getRequestConfig(server)
      );

      return sessionResponse.data;
    } catch (error) {
      console.error('Session creation error:', error);
      this.handleError(error, 'Failed to create session');
    }
  }

  async listSessions(server: JupyterServer) {
    try {
      const response = await axios.get(
        this.getUrlWithToken(server, '/sessions')
      );
      return response.data;
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw error;
    }
  }

  async getSessionStatus(server: JupyterServer, sessionId: string) {
    try {
      const response = await axios.get(
        this.getUrlWithToken(server, `/sessions/${sessionId}`)
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get session status:', error);
      throw error;
    }
  }

  async listKernels(server: JupyterServer) {
    try {
      const response = await axios.get(
        this.getUrlWithToken(server, '/kernels')
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to list kernels');
    }
  }

  async deleteSession(server: JupyterServer, sessionId: string): Promise<void> {
    try {
      await axios.delete(
        this.getUrlWithToken(server, `/sessions/${sessionId}`)
      );
    } catch (error) {
      console.warn('Delete session error:', error);
      // Don't throw error since this is cleanup
    }
  }

  private getWebSocketUrl(server: JupyterServer, kernelId: string): string {
    const protocol = server.ip.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = server.ip.startsWith('http') ? server.ip.replace(/^http(s?):\/\//, '') : server.ip;
    return `${protocol}://${baseUrl}:${server.port}/api/kernels/${kernelId}/channels`;
  }

  async executeCode(server: JupyterServer, sessionId: string, code: string): Promise<ExecutionResult> {
    try {
      // Create a new kernel
      const kernelResponse = await axios.post(
        this.getUrlWithToken(server, '/kernels'),
        { name: 'python3' },
        this.getRequestConfig(server)
      );
      
      const kernelId = kernelResponse.data.id;

      try {
        // Connect to WebSocket
        const ws = new WebSocket(this.getWebSocketUrl(server, kernelId));
        const msgId = uuidv4();

        // Wait for execution results
        const result = await new Promise<ExecutionResult>((resolve, reject) => {
          const messages: any[] = [];

          ws.onopen = () => {
            // Send execute request
            ws.send(JSON.stringify({
              header: {
                msg_id: msgId,
                username: 'bashnota',
                session: uuidv4(),
                msg_type: 'execute_request',
                version: '5.2'
              },
              parent_header: {},
              metadata: {},
              content: {
                code,
                silent: false,
                store_history: true,
                user_expressions: {},
                allow_stdin: false
              },
              channel: 'shell'
            }));
          };

          ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.parent_header.msg_id === msgId) {
              messages.push(msg);

              // Check if execution is complete
              if (msg.msg_type === 'status' && msg.content.execution_state === 'idle') {
                ws.close();
                resolve(this.processMessages(messages));
              }
              // Check for errors
              else if (msg.msg_type === 'error') {
                ws.close();
                resolve(this.processMessages(messages));
              }
            }
          };

          ws.onerror = (error) => {
            reject(new Error('WebSocket error: ' + error));
          };

          // Set timeout
          setTimeout(() => {
            ws.close();
            resolve(this.processMessages(messages));
          }, 10000);
        });

        return result;
      } finally {
        // Clean up the kernel
        await this.deleteKernel(server, kernelId);
      }
    } catch (error) {
      console.error('Execute code error:', error);
      throw error;
    }
  }

  private async deleteKernel(server: JupyterServer, kernelId: string): Promise<void> {
    try {
      await axios.delete(
        this.getUrlWithToken(server, `/kernels/${kernelId}`),
        this.getRequestConfig(server)
      );
    } catch (error) {
      console.warn('Failed to delete kernel:', error);
    }
  }

  private processMessages(messages: any[]): ExecutionResult {
    const result: ExecutionResult = {
      content: {
        execution_count: null,
        data: {},
        stdout: '',
        stderr: '',
        error: null
      }
    };

    for (const msg of messages) {
      switch (msg.msg_type) {
        case 'execute_input':
          result.content.execution_count = msg.content.execution_count;
          break;
        case 'stream':
          if (msg.content.name === 'stdout') {
            result.content.stdout += msg.content.text;
          } else if (msg.content.name === 'stderr') {
            result.content.stderr += msg.content.text;
          }
          break;
        case 'execute_result':
        case 'display_data':
          result.content.data = { ...result.content.data, ...msg.content.data };
          if (msg.content.execution_count !== undefined) {
            result.content.execution_count = msg.content.execution_count;
          }
          break;
        case 'error':
          result.content.error = {
            ename: msg.content.ename,
            evalue: msg.content.evalue,
            traceback: msg.content.traceback
          };
          break;
      }
    }

    return result;
  }

  async testConnection(server: JupyterServer) {
    try {
      const response = await axios.get(
        this.getUrlWithToken(server, '/kernels')
      );
      return {
        success: true,
        version: response.data.version,
        message: 'Connected successfully'
      };
    } catch (error) {
      let message = 'Connection failed';
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          message = 'Server is not reachable';
        } else if (error.response?.status === 403) {
          message = 'Invalid token';
        } else if (error.code === 'ETIMEDOUT') {
          message = 'Connection timed out';
        }
        console.error('Connection error:', error.message);
      }
      return {
        success: false,
        message
      };
    }
  }

  async createKernel(server: JupyterServer, kernelName: string) {
    try {
      const response = await axios.post(
        this.getUrlWithToken(server, '/kernels'),
        { name: kernelName }
      );
      return { 
        success: true, 
        data: response.data,
        message: 'Kernel created successfully' 
      };
    } catch (error) {
      this.handleError(error, 'Failed to create kernel');
    }
  }

  async deleteKernel(server: JupyterServer, kernelId: string) {
    try {
      await axios.delete(
        this.getUrlWithToken(server, `/kernels/${kernelId}`)
      );
      return { success: true, message: 'Kernel deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Failed to delete kernel');
    }
  }

  async fetchKernels(server: JupyterServer) {
    try {
      const [specsResponse, kernelsResponse] = await Promise.all([
        axios.get(this.getUrlWithToken(server, '/kernelspecs')),
        axios.get(this.getUrlWithToken(server, '/kernels'))
      ]);

      const { kernelspecs } = specsResponse.data;
      const runningKernels = kernelsResponse.data;

      return {
        kernelSpecs: Object.entries(kernelspecs).map(([_, spec]: [string, any]) => ({
          name: spec.name,
          display_name: spec.spec.display_name,
          language: spec.spec.language,
          path: spec.spec.path,
        })),
        runningKernels
      };
    } catch (error) {
      this.handleError(error, 'Failed to fetch kernel information');
    }
  }

  async startKernel(server: JupyterServer, name: string, path?: string) {
    try {
      const response = await axios.post(
        this.getUrlWithToken(server, '/kernels'),
        { name, path }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to start kernel');
    }
  }

  async restartKernel(server: JupyterServer, kernelId: string): Promise<boolean> {
    try {
      await axios.post(
        this.getUrlWithToken(server, `/kernels/${kernelId}/restart`),
        {}
      );
      return true;
    } catch (error) {
      console.error('Failed to restart kernel:', error);
      return false;
    }
  }

  async validateConfig(server: JupyterServer): Promise<boolean> {
    try {
      await axios.get(this.getUrlWithToken(server, '/kernels'));
      return true;
    } catch (error) {
      console.error('Failed to validate config:', error);
      return false;
    }
  }

  // Update cleanup method
  async cleanup() {
    for (const [kernelId, ws] of this.websockets.entries()) {
      if (ws.readyState === 1) { // WebSocket.OPEN = 1
        ws.close();
      }
      this.websockets.delete(kernelId);
    }
  }
} 