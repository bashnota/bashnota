export class JupyterService {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8888') {
    this.baseUrl = baseUrl
  }

  async executeCode(code: string, language: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language }),
      })
      return await response.json()
    } catch (error) {
      console.error('Failed to execute code:', error)
      throw error
    }
  }
} 