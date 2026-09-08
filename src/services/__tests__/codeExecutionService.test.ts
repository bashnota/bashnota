import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/jupyter/services/jupyterSecurity', () => ({
  assertJupyterWebSocketAuthenticationSupported: vi.fn(),
  confirmJupyterConnection: vi.fn(),
  confirmJupyterExecution: vi.fn(),
  getJupyterBaseUrl: () => 'http://127.0.0.1:8888',
  getJupyterFetchOptions: (_server: unknown, init: RequestInit) => init,
  getJupyterRequestUrl: (_server: unknown, endpoint: string) => `http://127.0.0.1:8888${endpoint}`,
  getJupyterWebSocketUrl: () => 'ws://127.0.0.1:8888/api/kernels/kernel/channels',
}))

import {
  CodeExecutionService,
  ExecutionCancelledError,
  ExecutionTimeoutError,
} from '@/services/codeExecutionService'

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 3
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.CONNECTING
  sent: string[] = []
  closeCalls = 0
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(_url: string) {
    FakeWebSocket.instances.push(this)
  }

  open() {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  send(payload: string) {
    this.sent.push(payload)
  }

  message(payload: object) {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent)
  }

  disconnect() {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.(new Event('close') as CloseEvent)
  }

  close() {
    this.closeCalls += 1
    this.readyState = FakeWebSocket.CLOSED
  }
}

const server = { ip: '127.0.0.1', port: '8888', token: '' }
const block = { id: 'cell-1', notebookId: 'nota-1', code: 'print(1)' }

function parentMessage(socket: FakeWebSocket, msgType: string, content: object) {
  const request = JSON.parse(socket.sent[0])
  socket.message({
    header: { msg_type: msgType },
    parent_header: { msg_id: request.header.msg_id },
    content,
  })
}

describe('CodeExecutionService bounded lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('times out a never-idle kernel, ignores late messages, and permits a clean reconnect', async () => {
    const service = new CodeExecutionService()
    const states: string[] = []
    const first = service.executeNotebookBlocks(server, 'kernel', [block], undefined, {
      timeoutMs: 5_000,
      onStateChange: state => states.push(state),
    })
    const firstSocket = FakeWebSocket.instances[0]
    firstSocket.open()
    const timeoutResult = first.catch(error => error)

    await vi.advanceTimersByTimeAsync(5_000)
    expect(await timeoutResult).toBeInstanceOf(ExecutionTimeoutError)
    expect(states).toEqual(['queued', 'running', 'timed_out'])
    expect(firstSocket.closeCalls).toBe(1)

    parentMessage(firstSocket, 'status', { execution_state: 'idle' })
    expect(states).toEqual(['queued', 'running', 'timed_out'])

    const second = service.executeNotebookBlocks(server, 'kernel', [block], undefined, { timeoutMs: 5_000 })
    const secondSocket = FakeWebSocket.instances[1]
    secondSocket.open()
    parentMessage(secondSocket, 'stream', { text: '1\n' })
    parentMessage(secondSocket, 'status', { execution_state: 'idle' })

    await expect(second).resolves.toEqual([{ id: 'cell-1', hasError: undefined, output: '1\n' }])
  })

  it('fails truthfully on disconnect and cleans the pending timeout', async () => {
    const service = new CodeExecutionService()
    const states: string[] = []
    const execution = service.executeNotebookBlocks(server, 'kernel', [block], undefined, {
      timeoutMs: 5_000,
      onStateChange: state => states.push(state),
    })
    const socket = FakeWebSocket.instances[0]
    socket.open()
    socket.disconnect()

    await expect(execution).rejects.toThrow('disconnected before execution completed')
    expect(states).toEqual(['queued', 'running', 'failed'])
    await vi.runAllTimersAsync()
    expect(states).toEqual(['queued', 'running', 'failed'])
  })

  it('cancels immediately through AbortSignal and ignores subsequent output', async () => {
    const service = new CodeExecutionService()
    const controller = new AbortController()
    const outputs: string[] = []
    const execution = service.executeNotebookBlocks(
      server,
      'kernel',
      [block],
      (_id, output) => outputs.push(output),
      { signal: controller.signal, timeoutMs: 5_000 },
    )
    const socket = FakeWebSocket.instances[0]
    socket.open()
    controller.abort(new ExecutionCancelledError('Interrupted'))

    await expect(execution).rejects.toThrow('Interrupted')
    parentMessage(socket, 'stream', { text: 'late output' })
    expect(outputs).toEqual([])
  })
})
