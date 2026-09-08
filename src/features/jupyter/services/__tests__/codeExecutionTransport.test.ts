import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeExecutionService } from '@/services/codeExecutionService'
import { resetJupyterConfirmationsForTest } from '../jupyterSecurity'

describe('code execution transport', () => {
  const originalWebSocket = globalThis.WebSocket

  beforeEach(() => resetJupyterConfirmationsForTest())

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket
    vi.restoreAllMocks()
  })

  it('uses token-authenticated HTTP to bootstrap a credential-free WebSocket flow', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'kernel-1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const webSocketUrls: string[] = []
    class FakeWebSocket {
      onopen: (() => void) | null = null
      onmessage: ((event: { data: string }) => void) | null = null
      onerror: ((error: unknown) => void) | null = null
      onclose: (() => void) | null = null

      constructor(url: string) {
        webSocketUrls.push(url)
        queueMicrotask(() => this.onopen?.())
      }

      send(raw: string) {
        const request = JSON.parse(raw)
        queueMicrotask(() =>
          this.onmessage?.({
            data: JSON.stringify({
              header: { msg_type: 'status' },
              parent_header: { msg_id: request.header.msg_id },
              content: { execution_state: 'idle' },
            }),
          }),
        )
      }

      close() {}
    }
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const server = { ip: window.location.origin, port: '', token: 'jupyter-secret' }
    const service = new CodeExecutionService()

    const kernelId = await service.createKernel(server, 'python3')
    await service.executeCode(server, kernelId, 'print(1)')

    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`${window.location.origin}/api/kernels`)
    expect(String(url)).not.toContain(server.token)
    expect(new Headers(options?.headers).get('Authorization')).toBe('token jupyter-secret')
    expect(options?.credentials).toBe('include')
    expect(options?.redirect).toBe('error')
    const webSocketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    expect(webSocketUrls).toEqual([
      `${webSocketProtocol}//${window.location.host}/api/kernels/kernel-1/channels`,
    ])
    expect(webSocketUrls[0]).not.toContain(server.token)
  })

  it('fails closed before HTTP bootstrap for a cross-origin token server', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const service = new CodeExecutionService()
    const server = { ip: 'https://jupyter.example', port: '443', token: 'jupyter-secret' }

    await expect(service.createKernel(server, 'python3')).rejects.toThrow(
      'same-origin HTTPS reverse proxy',
    )
    await expect(service.executeCode(server, 'kernel-1', 'print(1)')).rejects.toThrow(
      'same-origin HTTPS reverse proxy',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
