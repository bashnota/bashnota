export interface FakeJupyterServer {
  origin: string
  requests: Array<{ method: string; path: string; authorization?: string }>
  executions: string[]
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
  WebSocket: typeof WebSocket
}

/**
 * A deterministic in-memory Jupyter HTTP/channels server. It implements the
 * browser transport interfaces so protocol tests also work in sandboxes that
 * prohibit binding loopback ports.
 */
export function createFakeJupyterServer(token = 'fixture-token'): FakeJupyterServer {
  const origin = 'http://127.0.0.1:18888'
  const requests: FakeJupyterServer['requests'] = []
  const executions: string[] = []

  class FixtureWebSocket {
    static readonly OPEN = 1
    readonly url: string
    readyState = FixtureWebSocket.OPEN
    onopen: ((event: Event) => void) | null = null
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    onclose: ((event: CloseEvent) => void) | null = null

    constructor(url: string | URL) {
      this.url = String(url)
      if (this.url !== `${origin.replace('http:', 'ws:')}/api/kernels/kernel-fixture/channels`) {
        queueMicrotask(() => this.onerror?.(new Event('error')))
        return
      }
      queueMicrotask(() => this.onopen?.(new Event('open')))
    }

    send(bytes: string): void {
      const request = JSON.parse(bytes)
      const parent_header = { msg_id: request.header.msg_id }
      executions.push(request.content.code)
      const reply = (header: object, content: object) =>
        queueMicrotask(() =>
          this.onmessage?.(
            new MessageEvent('message', {
              data: JSON.stringify({ header, parent_header, content }),
            }),
          ),
        )
      reply({ msg_type: 'stream' }, { name: 'stdout', text: `stdout:${request.content.code}\n` })
      reply(
        { msg_type: 'display_data' },
        { data: { 'text/plain': `result:${request.content.code}` } },
      )
      reply({ msg_type: 'status' }, { execution_state: 'idle' })
    }

    close(): void {
      this.readyState = 3
      queueMicrotask(() => this.onclose?.(new CloseEvent('close')))
    }
  }

  return {
    origin,
    requests,
    executions,
    WebSocket: FixtureWebSocket as unknown as typeof WebSocket,
    async fetch(input, init = {}) {
      const url = new URL(String(input))
      const headers = new Headers(init.headers)
      requests.push({
        method: init.method ?? 'GET',
        path: url.pathname,
        authorization: headers.get('authorization') ?? undefined,
      })
      if (headers.get('authorization') !== `token ${token}`) {
        return Response.json({ message: 'invalid token' }, { status: 403, statusText: 'Forbidden' })
      }
      if (init.method === 'POST' && url.pathname === '/api/kernels') {
        return Response.json({ id: 'kernel-fixture', name: 'python3' }, { status: 201 })
      }
      if ((init.method ?? 'GET') === 'GET' && url.pathname === '/api/kernels') {
        return Response.json([{ id: 'kernel-fixture', name: 'python3' }])
      }
      if (init.method === 'DELETE' && url.pathname === '/api/kernels/kernel-fixture') {
        return new Response(null, { status: 204 })
      }
      return Response.json({ message: 'not found' }, { status: 404, statusText: 'Not Found' })
    },
  }
}
