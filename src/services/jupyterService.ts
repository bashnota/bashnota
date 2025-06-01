import axios, { AxiosError } from 'axios'
import type { 
  JupyterServer, 
  ExecutionResult, 
  KernelSpec, 
  WSMessage,
  ManagedJupyterServer,
  JupyterFile,
  JupyterDirectory,
  JupyterKernel,
  JupyterSession
} from '@/types/jupyter'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/services/logger'

export class JupyterService {
  private servers: Map<string, ManagedJupyterServer> = new Map()
  private connectedServers: Set<string> = new Set()

  /**
   * Add a Jupyter server configuration
   */
  addServer(server: Omit<ManagedJupyterServer, 'id' | 'status'>): string {
    const id = crypto.randomUUID()
    const jupyterServer: ManagedJupyterServer = {
      ...server,
      id,
      status: 'disconnected',
    }
    this.servers.set(id, jupyterServer)
    return id
  }

  /**
   * Get all configured servers
   */
  getServers(): ManagedJupyterServer[] {
    return Array.from(this.servers.values())
  }

  /**
   * Get a specific server by ID
   */
  getServer(id: string): ManagedJupyterServer | undefined {
    return this.servers.get(id)
  }

  /**
   * Remove a server configuration
   */
  removeServer(id: string): boolean {
    this.connectedServers.delete(id)
    return this.servers.delete(id)
  }

  /**
   * Get list of connected servers
   */
  getConnectedServers(): ManagedJupyterServer[] {
    return Array.from(this.connectedServers)
      .map(id => this.servers.get(id))
      .filter(Boolean) as ManagedJupyterServer[]
  }

  /**
   * Browse files and directories on a Jupyter server
   */
  async browseDirectory(serverId: string, path: string = ''): Promise<JupyterDirectory> {
    const server = this.servers.get(serverId)
    if (!server) {
      throw new Error('Server not found')
    }

    if (!this.connectedServers.has(serverId)) {
      const connected = await this.testConnectionById(serverId)
      if (!connected) {
        throw new Error('Failed to connect to Jupyter server')
      }
    }

    try {
      const encodedPath = encodeURIComponent(path)
      const response = await this.makeRequest(
        server, 
        `/contents/${encodedPath}`, 
        'GET'
      )

      if (!response.ok) {
        throw new Error(`Failed to browse directory: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.type !== 'directory') {
        throw new Error('Path is not a directory')
      }

      const files: JupyterFile[] = data.content.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        lastModified: item.last_modified,
      }))

      return {
        path: data.path,
        files,
      }
    } catch (error) {
      logger.error('Failed to browse directory:', error)
      throw error
    }
  }

  /**
   * Get file content from Jupyter server
   */
  async getFileContent(serverId: string, filePath: string): Promise<string> {
    const server = this.servers.get(serverId)
    if (!server) {
      throw new Error('Server not found')
    }

    if (!this.connectedServers.has(serverId)) {
      const connected = await this.testConnectionById(serverId)
      if (!connected) {
        throw new Error('Failed to connect to Jupyter server')
      }
    }

    try {
      const encodedPath = encodeURIComponent(filePath)
      const response = await this.makeRequest(
        server, 
        `/contents/${encodedPath}`, 
        'GET'
      )

      if (!response.ok) {
        throw new Error(`Failed to get file content: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.type !== 'file') {
        throw new Error('Path is not a file')
      }

      // Jupyter returns base64 encoded content for binary files
      if (data.format === 'base64') {
        return atob(data.content)
      }
      
      return data.content || ''
    } catch (error) {
      logger.error('Failed to get file content:', error)
      throw error
    }
  }

  /**
   * Check if a file is a CSV file
   */
  isCSVFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.csv')
  }

  /**
   * Filter files to show only CSV files and directories
   */
  filterCSVFiles(files: JupyterFile[]): JupyterFile[] {
    return files.filter(file => 
      file.type === 'directory' || this.isCSVFile(file.name)
    )
  }

  /**
   * Test connection to a managed server by ID
   */
  async testConnectionById(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId)
    if (!server) {
      throw new Error('Server not found')
    }

    try {
      server.status = 'connecting'
      this.servers.set(serverId, { ...server })

      const result = await this.testConnection({
        ip: server.ip,
        port: server.port,
        token: server.token
      })
      
      if (result.success) {
        server.status = 'connected'
        this.connectedServers.add(serverId)
      } else {
        server.status = 'disconnected'
        this.connectedServers.delete(serverId)
      }
      
      this.servers.set(serverId, { ...server })
      return result.success
    } catch (error) {
      server.status = 'disconnected'
      this.connectedServers.delete(serverId)
      this.servers.set(serverId, { ...server })
      logger.error('Connection test failed:', error)
      return false
    }
  }

  /**
   * Make HTTP request to managed Jupyter server
   */
  private async makeRequest(
    server: ManagedJupyterServer, 
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<Response> {
    const baseUrl = server.url || `http://${server.ip}:${server.port}`
    const url = `${baseUrl.replace(/\/$/, '')}/api${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (server.token) {
      headers['Authorization'] = `token ${server.token}`
    }

    const options: RequestInit = {
      method,
      headers,
      mode: 'cors',
    }

    if (body && method === 'POST') {
      options.body = JSON.stringify(body)
    }

    return fetch(url, options)
  }

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
          logger.error('No token found in Kaggle URL')
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
      logger.error('Error parsing Jupyter URL:', error)
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
      logger.error('Execute code error:', error)
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
          result.content.execution_count = msg.content.execution_count || 0
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

  async testConnection(server: JupyterServer): Promise<{ success: boolean; message: string }> {
    try {
      const protocol = server.ip.startsWith('http') ? '' : 'http://';
      const baseUrl = `${protocol}${server.ip}:${server.port}`;
      const url = server.token ? `${baseUrl}/api?token=${server.token}` : `${baseUrl}/api`;
      
      logger.log(`Testing connection to Jupyter server at ${baseUrl}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        // Add timeout to prevent long waiting periods
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Connection test failed (${response.status}):`, errorText);
        return {
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      logger.log('Connection test successful', data);
      
      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error) {
      let errorMessage = 'Connection failed';
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Could not connect to server. Please check the server address, port, and ensure the server is running.';
      } else if (error instanceof DOMException && error.name === 'TimeoutError') {
        errorMessage = 'Connection timed out. Server might be overloaded or unreachable.';
      } else if (error instanceof Error) {
        errorMessage = `Connection error: ${error.message}`;
      }
      
      logger.error('Jupyter connection test error:', error);
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  async getRunningKernels(server: JupyterServer): Promise<JupyterKernel[]> {
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

  async getActiveSessions(server: JupyterServer): Promise<JupyterSession[]> {
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

  /**
   * Browse files and directories on a Jupyter server (direct server access)
   */
  async browseDirectoryDirect(server: JupyterServer, path: string = ''): Promise<JupyterDirectory> {
    try {
      const encodedPath = encodeURIComponent(path)
      const url = this.getUrlWithToken(server, `/contents/${encodedPath}`)
      
      const response = await axios.get(url)
      const data = response.data
      
      if (data.type !== 'directory') {
        throw new Error('Path is not a directory')
      }

      const files: JupyterFile[] = data.content.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        lastModified: item.last_modified,
      }))

      return {
        path: data.path,
        files,
      }
    } catch (error) {
      logger.error('Failed to browse directory:', error)
      this.handleError(error, 'Failed to browse directory')
    }
  }

  /**
   * Get file content from Jupyter server (direct server access)
   */
  async getFileContentDirect(server: JupyterServer, filePath: string): Promise<string> {
    try {
      const encodedPath = encodeURIComponent(filePath)
      const url = this.getUrlWithToken(server, `/contents/${encodedPath}`)
      
      const response = await axios.get(url)
      const data = response.data
      
      if (data.type !== 'file') {
        throw new Error('Path is not a file')
      }

      // Jupyter returns base64 encoded content for binary files
      if (data.format === 'base64') {
        return atob(data.content)
      }
      
      return data.content || ''
    } catch (error) {
      logger.error('Failed to get file content:', error)
      this.handleError(error, 'Failed to get file content')
    }
  }
}

// Create and export a singleton instance of the JupyterService
export const jupyterService = new JupyterService()

// Re-export types for convenience
export type {
  JupyterFile,
  JupyterDirectory,
  ManagedJupyterServer,
  JupyterKernel,
  JupyterSession
} from '@/types/jupyter'