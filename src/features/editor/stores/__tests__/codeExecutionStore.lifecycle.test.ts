import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const serviceHarness = vi.hoisted(() => ({
  interruptStarted: false,
  releaseInterrupt: undefined as (() => void) | undefined,
}))

vi.mock('@/services/codeExecutionService', () => {
  class ExecutionTimeoutError extends Error {
    constructor(timeoutMs: number) {
      super(`Execution timed out after ${timeoutMs / 1000} seconds`)
      this.name = 'ExecutionTimeoutError'
    }
  }
  class ExecutionCancelledError extends Error {
    constructor(message = 'Execution was cancelled') {
      super(message)
      this.name = 'ExecutionCancelledError'
    }
  }
  return {
    DEFAULT_EXECUTION_TIMEOUT_MS: 120_000,
    ExecutionTimeoutError,
    ExecutionCancelledError,
    CodeExecutionService: class {
      createKernel = vi.fn()
      deleteKernel = vi.fn()
      executeNotebookBlocks = vi.fn((
        _server: unknown,
        _kernel: string,
        _blocks: unknown[],
        _output: unknown,
        options: { signal: AbortSignal; onStateChange: (state: string) => void },
      ) => {
        options.onStateChange('queued')
        options.onStateChange('running')
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true })
        })
      })
      interruptKernel = vi.fn(async () => {
        serviceHarness.interruptStarted = true
        await new Promise<void>(resolve => { serviceHarness.releaseInterrupt = resolve })
      })
    },
  }
})

vi.mock('@/features/nota/stores/nota', () => ({
  useNotaStore: () => ({
    getCurrentNota: vi.fn(),
    updateNotaConfig: vi.fn(),
  }),
}))
vi.mock('@/features/jupyter/stores/jupyterStore', () => ({
  useJupyterStore: () => ({
    jupyterServers: [{ ip: '127.0.0.1', port: '8888', token: '' }],
  }),
}))
vi.mock('@/features/jupyter/services/jupyterExecutionGuidance', () => ({
  showJupyterExecutionGuidance: vi.fn(),
}))
vi.mock('@/services/logger', () => ({
  logger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { useCodeExecutionStore } from '../codeExecutionStore'

function configuredStore() {
  const store = useCodeExecutionStore()
  const server = { ip: '127.0.0.1', port: '8888', token: '' }
  store.kernelSessions.set('session', {
    id: 'session',
    kernelId: 'kernel',
    serverConfig: server,
    kernelName: 'python3',
    cells: ['cell'],
    name: 'Session',
  })
  store.addCell({
    id: 'cell',
    code: 'while True: pass',
    serverConfig: server,
    kernelName: 'python3',
    sessionId: 'session',
    output: '',
  })
  return store
}

describe('code execution store lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    serviceHarness.interruptStarted = false
    serviceHarness.releaseInterrupt = undefined
    vi.useRealTimers()
  })

  it('exposes interrupting and cancelled states while stopping a running kernel', async () => {
    const store = configuredStore()
    const execution = store.executeCell('cell')
    await vi.waitFor(() => expect(store.getCellById('cell')?.executionState).toBe('running'))

    const interrupt = store.interruptCell('cell')
    await vi.waitFor(() => expect(serviceHarness.interruptStarted).toBe(true))
    expect(store.getCellById('cell')?.executionState).toBe('interrupting')

    serviceHarness.releaseInterrupt?.()
    await expect(interrupt).resolves.toBe(true)
    await execution

    expect(store.getCellById('cell')).toMatchObject({
      executionState: 'cancelled',
      isExecuting: false,
      hasError: true,
      output: 'Execution interrupted by user',
    })
  })

  it('applies the configured deadline and leaves the cell recoverable', async () => {
    vi.useFakeTimers()
    const store = configuredStore()
    store.setExecutionTimeoutSeconds(5)

    const execution = store.executeCell('cell')
    await vi.advanceTimersByTimeAsync(5_000)
    await execution

    expect(store.getCellById('cell')).toMatchObject({
      executionState: 'timed_out',
      isExecuting: false,
      hasError: true,
      output: 'Execution timed out after 5 seconds',
    })
    expect(localStorage.getItem('code-execution-timeout-seconds')).toBe('5')
  })
})
