import axios, { AxiosError } from 'axios';
import type { JupyterServer, JupyterSession, ExecutionResult } from '@/types/jupyter';

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
      this.handleError(error, 'Failed to delete session');
    }
  }

  async executeCode(server: JupyterServer, sessionId: string, code: string): Promise<{ msg_id: string }> {
    try {
      // First get the kernel ID from the session
      const session = await this.getSessionStatus(server, sessionId);
      const kernelId = session.kernel.id;

      // Execute code using the kernel API
      const response = await axios.post(
        this.getUrlWithToken(server, `/kernels/${kernelId}/execute`),
        {
          code,
          silent: false,
          store_history: true,
          user_expressions: {},
          allow_stdin: false
        },
        {
          ...this.getRequestConfig(server),
          headers: {
            ...this.getHeaders(server),
            'Content-Type': 'application/json'
          }
        }
      );

      const msgId = response.data.msg_id;

      // Wait for execution to complete
      await this.waitForKernelIdle(server, kernelId);

      return { msg_id: msgId };
    } catch (error) {
      console.error('Execute code error:', error);
      this.handleError(error, 'Failed to execute code');
    }
  }

  private async waitForKernelIdle(server: JupyterServer, kernelId: string, timeout = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(
          this.getUrlWithToken(server, `/kernels/${kernelId}`),
          this.getRequestConfig(server)
        );

        if (response.data.execution_state === 'idle') {
          return;
        }

        // Wait a bit before polling again
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn('Error checking kernel status:', error);
        // Continue polling even if we get an error
      }
    }

    throw new Error('Code execution timed out');
  }

  async getExecutionResult(server: JupyterServer, sessionId: string, msgId: string): Promise<ExecutionResult> {
    try {
      // Get kernel ID from session
      const session = await this.getSessionStatus(server, sessionId);
      const kernelId = session.kernel.id;

      // Get execution result from kernel
      const response = await axios.get(
        this.getUrlWithToken(server, `/kernels/${kernelId}/messages`),
        {
          params: { msg_id: msgId },
          ...this.getRequestConfig(server)
        }
      );

      const messages = response.data;
      const result: ExecutionResult = {
        content: {
          execution_count: null,
          data: {},
          stdout: '',
          stderr: '',
          error: null
        }
      };

      // Process messages
      for (const msg of messages) {
        switch (msg.msg_type) {
          case 'execute_result':
          case 'display_data':
            result.content.data = { ...result.content.data, ...msg.content.data };
            result.content.execution_count = msg.content.execution_count;
            break;
          case 'stream':
            if (msg.content.name === 'stdout') {
              result.content.stdout += msg.content.text;
            } else if (msg.content.name === 'stderr') {
              result.content.stderr += msg.content.text;
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
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Get result error:', error.response?.data);
      }
      this.handleError(error, 'Failed to get execution result');
    }
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
} 