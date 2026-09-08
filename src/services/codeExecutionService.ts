import type {
  CodeBlock,
  ExecutionState,
  ExecutionResult,
  JupyterMessage,
  MessageStatus,
} from '@/features/editor/types/codeExecution'
import type { JupyterServer } from '@/features/jupyter/types/jupyter'
import { logger } from '@/services/logger'
import {
  assertJupyterWebSocketAuthenticationSupported,
  confirmJupyterConnection,
  confirmJupyterExecution,
  getJupyterBaseUrl,
  getJupyterFetchOptions,
  getJupyterRequestUrl,
  getJupyterWebSocketUrl,
} from '@/features/jupyter/services/jupyterSecurity'

export const DEFAULT_EXECUTION_TIMEOUT_MS = 120_000

export class ExecutionTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Execution timed out after ${Math.round(timeoutMs / 1000)} seconds`)
    this.name = 'ExecutionTimeoutError'
  }
}

export class ExecutionCancelledError extends Error {
  constructor(message = 'Execution was cancelled') {
    super(message)
    this.name = 'ExecutionCancelledError'
  }
}

export interface ExecutionOptions {
  timeoutMs?: number
  signal?: AbortSignal
  onStateChange?: (state: ExecutionState) => void
}

export class CodeExecutionService {
  private getBaseUrl(server: JupyterServer): string {
    confirmJupyterConnection(server)
    return getJupyterBaseUrl(server)
  }

  private getUrl(serverConfig: JupyterServer, endpoint: string): string {
    this.getBaseUrl(serverConfig)
    return getJupyterRequestUrl(serverConfig, endpoint)
  }

  private getWebSocketUrl(serverConfig: JupyterServer, kernelId: string): string {
    return getJupyterWebSocketUrl(serverConfig, kernelId)
  }

  private createExecuteRequestMessage(code: string): JupyterMessage {
    const msgId = `msg-${Date.now()}-${Math.random()}`
    return {
      header: {
        msg_id: msgId,
        username: 'bashbook',
        session: msgId,
        msg_type: 'execute_request',
        version: '5.0',
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
    }
  }

  async createKernel(
    serverConfig: JupyterServer,
    kernelName: string,
    signal?: AbortSignal,
  ): Promise<string> {
    try {
      assertJupyterWebSocketAuthenticationSupported(serverConfig)
      const url = this.getUrl(serverConfig, '/api/kernels')
      logger.log(`Creating kernel '${kernelName}' at ${url}`)

      const response = await fetch(
        url,
        getJupyterFetchOptions(serverConfig, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: kernelName }),
          signal,
        }),
      )

      const responseText = await response.text()

      if (!response.ok) {
        logger.error(`Failed to create kernel: Status ${response.status}`, responseText)
        throw new Error(
          `Failed to create kernel: ${response.status} ${response.statusText}${responseText ? ` - ${responseText}` : ''}`,
        )
      }

      try {
        const data = JSON.parse(responseText)
        logger.log(`Successfully created kernel with ID: ${data.id}`)
        return data.id
      } catch (parseError) {
        logger.error('Failed to parse kernel creation response:', responseText, parseError)
        throw new Error('Invalid response format from Jupyter server')
      }
    } catch (error) {
      logger.error('Error in kernel creation:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Failed to create kernel: ${String(error)}`)
    }
  }

  async deleteKernel(serverConfig: JupyterServer, kernelId: string): Promise<void> {
    const response = await fetch(
      this.getUrl(serverConfig, `/api/kernels/${kernelId}`),
      getJupyterFetchOptions(serverConfig, {
        method: 'DELETE',
      }),
    )

    if (!response.ok) {
      throw new Error(`Failed to delete kernel: ${response.statusText}`)
    }
  }

  async listKernels(serverConfig: JupyterServer): Promise<Array<{ id: string; name: string }>> {
    const response = await fetch(
      this.getUrl(serverConfig, '/api/kernels'),
      getJupyterFetchOptions(serverConfig, {
        method: 'GET',
      }),
    )

    if (!response.ok) {
      throw new Error(`Failed to list kernels: ${response.statusText}`)
    }

    return response.json()
  }

  async interruptKernel(
    serverConfig: JupyterServer,
    kernelId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await fetch(
      this.getUrl(serverConfig, `/api/kernels/${kernelId}/interrupt`),
      getJupyterFetchOptions(serverConfig, { method: 'POST', signal }),
    )

    if (!response.ok) {
      throw new Error(`Failed to interrupt kernel: ${response.status} ${response.statusText}`)
    }
  }

  executeNotebookBlocks(
    serverConfig: JupyterServer,
    kernelId: string,
    codeBlocks: CodeBlock[],
    onOutput?: (blockId: string, output: string) => void,
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult[]> {
    confirmJupyterExecution(serverConfig)
    if (codeBlocks.length === 0) return Promise.resolve([])

    const timeoutMs = options.timeoutMs ?? DEFAULT_EXECUTION_TIMEOUT_MS
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return Promise.reject(new Error('Execution timeout must be a positive number'))
    }

    return new Promise((resolve, reject) => {
      const results: Map<string, string> = new Map()
      const ws = new WebSocket(this.getWebSocketUrl(serverConfig, kernelId))
      let currentBlockIndex = 0
      let settled = false
      const messageStatus = new Map<string, MessageStatus>()
      options.onStateChange?.('queued')

      const cleanup = () => {
        clearTimeout(timeoutId)
        options.signal?.removeEventListener('abort', handleAbort)
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close()
        }
      }

      const finishWithError = (error: Error, state: ExecutionState) => {
        if (settled) return
        settled = true
        options.onStateChange?.(state)
        cleanup()
        reject(error)
      }

      const finishSuccessfully = () => {
        if (settled) return
        settled = true
        options.onStateChange?.('succeeded')
        const executionResults = codeBlocks.map((block) => ({
          id: block.id,
          hasError: block.hasError,
          output: results.get(block.id) || '',
        }))
        cleanup()
        resolve(executionResults)
      }

      const handleAbort = () => {
        const reason = options.signal?.reason
        finishWithError(
          reason instanceof Error ? reason : new ExecutionCancelledError(),
          reason instanceof ExecutionTimeoutError ? 'timed_out' : 'cancelled',
        )
      }

      const timeoutId = setTimeout(() => {
        finishWithError(new ExecutionTimeoutError(timeoutMs), 'timed_out')
      }, timeoutMs)

      if (options.signal?.aborted) {
        handleAbort()
        return
      }
      options.signal?.addEventListener('abort', handleAbort, { once: true })

      ws.onopen = () => {
        if (settled) return
        options.onStateChange?.('running')
        const message = this.createExecuteRequestMessage(codeBlocks[currentBlockIndex].code)
        messageStatus.set(message.header.msg_id, { done: false, output: '' })
        ws.send(JSON.stringify(message))
      }

      ws.onmessage = (event) => {
        if (settled) return
        let msg: Record<string, any>
        try {
          msg = JSON.parse(event.data)
        } catch {
          finishWithError(new Error('Jupyter returned an invalid WebSocket message'), 'failed')
          return
        }
        const msgType = msg.header?.msg_type
        const parentMsgId = msg.parent_header?.msg_id

        if (!parentMsgId || !messageStatus.has(parentMsgId)) return

        const status = messageStatus.get(parentMsgId)!
        const content = msg.content
        const activeBlock = codeBlocks[currentBlockIndex]
        let newOutput = ''

        switch (msgType) {
          case 'stream':
            newOutput = content.text || ''
            status.output += newOutput
            break

          case 'execute_result':
          case 'display_data':
            if (content.data['text/plain']) {
              newOutput += content.data['text/plain'] + '\n'
            }
            if (content.data['text/html']) {
              newOutput += content.data['text/html'] + '\n'
            }
            if (content.data['image/png']) {
              newOutput += `<img src="data:image/png;base64,${content.data['image/png']}" />\n`
            }
            status.output += newOutput
            break

          case 'error':
            newOutput += `Error: ${content.ename}\n${content.evalue}\n${content.traceback.join('\n')}`
            status.output += newOutput
            activeBlock.hasError = true
            break

          case 'status':
            if (content.execution_state === 'idle' && !status.done) {
              status.done = true
              results.set(activeBlock.id, status.output)

              currentBlockIndex++
              if (currentBlockIndex < codeBlocks.length) {
                const nextMessage = this.createExecuteRequestMessage(
                  codeBlocks[currentBlockIndex].code,
                )
                messageStatus.set(nextMessage.header.msg_id, {
                  done: false,
                  output: '',
                })
                ws.send(JSON.stringify(nextMessage))
              } else {
                finishSuccessfully()
              }
            }
            break
        }

        // Stream output if callback is provided
        if (newOutput && onOutput) {
          onOutput(activeBlock.id, newOutput)
        }
        messageStatus.set(parentMsgId, status)
      }

      ws.onerror = (error) => {
        logger.error('WebSocket error:', error)
        finishWithError(new Error('Jupyter WebSocket connection failed'), 'failed')
      }

      ws.onclose = () => {
        if (!settled) finishWithError(new Error('Jupyter disconnected before execution completed'), 'failed')
      }
    })
  }

  async executeCode(
    serverConfig: JupyterServer,
    kernelId: string,
    code: string,
    onOutput?: (output: string) => void,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult> {
    const results = await this.executeNotebookBlocks(
      serverConfig,
      kernelId,
      [{ id: 'single', notebookId: 'temp', code }],
      (_, output) => onOutput?.(output),
      options,
    )
    return results[0]
  }
}
