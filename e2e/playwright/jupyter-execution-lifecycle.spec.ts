import { expect, test } from './fixtures/consoleGuard'

test('bounds fake Jupyter execution and recovers after timeout, disconnect, and interrupt', async ({ page }) => {
  await page.goto('./')

  const result = await page.evaluate(async () => {
    window.confirm = () => true
    const module = await (new Function(
      'return import("/bashnota/src/services/codeExecutionService.ts")',
    )() as Promise<typeof import('../../src/services/codeExecutionService')>)

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

      message(type: string, content: object) {
        const request = JSON.parse(this.sent[0])
        this.onmessage?.({
          data: JSON.stringify({
            header: { msg_type: type },
            parent_header: { msg_id: request.header.msg_id },
            content,
          }),
        } as MessageEvent)
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

    Object.assign(window, { WebSocket: FakeWebSocket })
    const server = { ip: '127.0.0.1', port: '8888', token: '' }
    const block = { id: 'cell', notebookId: 'nota', code: 'while True: pass' }
    const service = new module.CodeExecutionService()
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const timeoutStates: string[] = []
    const timed = service.executeNotebookBlocks(server, 'kernel', [block], undefined, {
      timeoutMs: 25,
      onStateChange: state => timeoutStates.push(state),
    }).catch(error => error)
    const timedSocket = FakeWebSocket.instances.at(-1)!
    timedSocket.open()
    await wait(35)
    const timeoutError = await timed
    timedSocket.message('status', { execution_state: 'idle' })

    const reconnected = service.executeNotebookBlocks(server, 'kernel', [block], undefined, {
      timeoutMs: 500,
    })
    const reconnectSocket = FakeWebSocket.instances.at(-1)!
    reconnectSocket.open()
    reconnectSocket.message('stream', { text: 'reconnected\n' })
    reconnectSocket.message('status', { execution_state: 'idle' })

    const disconnectStates: string[] = []
    const disconnected = service.executeNotebookBlocks(server, 'kernel', [block], undefined, {
      timeoutMs: 500,
      onStateChange: state => disconnectStates.push(state),
    }).catch(error => error)
    const disconnectSocket = FakeWebSocket.instances.at(-1)!
    disconnectSocket.open()
    disconnectSocket.disconnect()

    const controller = new AbortController()
    const interruptStates: string[] = []
    const interrupted = service.executeNotebookBlocks(server, 'kernel', [block], undefined, {
      timeoutMs: 500,
      signal: controller.signal,
      onStateChange: state => interruptStates.push(state),
    }).catch(error => error)
    const interruptSocket = FakeWebSocket.instances.at(-1)!
    interruptSocket.open()
    controller.abort(new module.ExecutionCancelledError('Interrupted by browser test'))
    const interruptError = await interrupted
    interruptSocket.message('stream', { text: 'late output' })

    return {
      timeoutError: timeoutError.name,
      timeoutStates,
      timeoutCloseCalls: timedSocket.closeCalls,
      reconnectResult: await reconnected,
      disconnectError: (await disconnected).message,
      disconnectStates,
      interruptError: interruptError.message,
      interruptStates,
      interruptCloseCalls: interruptSocket.closeCalls,
    }
  })

  expect(result).toEqual({
    timeoutError: 'ExecutionTimeoutError',
    timeoutStates: ['queued', 'running', 'timed_out'],
    timeoutCloseCalls: 1,
    reconnectResult: [{ id: 'cell', output: 'reconnected\n' }],
    disconnectError: 'Jupyter disconnected before execution completed',
    disconnectStates: ['queued', 'running', 'failed'],
    interruptError: 'Interrupted by browser test',
    interruptStates: ['queued', 'running', 'cancelled'],
    interruptCloseCalls: 1,
  })
})
