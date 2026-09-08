import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CodeExecutionService } from '@/services/codeExecutionService'
import { createFakeJupyterServer, type FakeJupyterServer } from '@/test/fixtures/jupyterServer'
import type { JupyterServer } from '@/features/jupyter/types/jupyter'

describe('Jupyter HTTP and WebSocket protocol', () => {
  let fixture: FakeJupyterServer
  let config: JupyterServer

  beforeEach(() => {
    fixture = createFakeJupyterServer()
    const url = new URL(fixture.origin)
    config = { ip: url.hostname, port: url.port, token: 'fixture-token' }
    vi.stubGlobal('fetch', fixture.fetch)
    vi.stubGlobal('WebSocket', fixture.WebSocket)
    vi.stubGlobal('location', { origin: fixture.origin })
    vi.stubGlobal('window', { confirm: () => true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('creates, lists, executes on, and deletes a controlled kernel', async () => {
    const service = new CodeExecutionService()

    await expect(service.createKernel(config, 'python3')).resolves.toBe('kernel-fixture')
    await expect(service.listKernels(config)).resolves.toEqual([
      { id: 'kernel-fixture', name: 'python3' },
    ])

    const streamed: string[] = []
    await expect(
      service.executeCode(config, 'kernel-fixture', 'print(42)', (chunk) => streamed.push(chunk)),
    ).resolves.toMatchObject({
      id: 'single',
      output: 'stdout:print(42)\nresult:print(42)\n',
    })
    await expect(service.deleteKernel(config, 'kernel-fixture')).resolves.toBeUndefined()

    expect(streamed).toEqual(['stdout:print(42)\n', 'result:print(42)\n'])
    expect(fixture.executions).toEqual(['print(42)'])
    expect(fixture.requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'POST /api/kernels',
      'GET /api/kernels',
      'DELETE /api/kernels/kernel-fixture',
    ])
    expect(
      fixture.requests.every(({ authorization }) => authorization === 'token fixture-token'),
    ).toBe(true)
  })

  it('rejects invalid HTTP credentials without leaking them into the URL', async () => {
    const service = new CodeExecutionService()
    const invalid = { ...config, token: 'wrong-secret' }

    await expect(service.createKernel(invalid, 'python3')).rejects.toThrow('403')
    expect(fixture.requests[0].path).toBe('/api/kernels')
    expect(fixture.requests[0].path).not.toContain('wrong-secret')
  })
})
