import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryBackend } from '@/services/storageService'
import { CodeExecutionService } from '@/services/codeExecutionService'
import { createNotaFixture } from '@/test/fixtures/nota'
import { createFakeJupyterServer } from '@/test/fixtures/jupyterServer'
import { installDeterministicRuntime, type DeterministicRuntime } from '@/test/fixtures/determinism'
import type { JupyterServer } from '@/features/jupyter/types/jupyter'
import { logger } from '@/services/logger'

const REGRESSION_BUDGET_MS = 5_000
let runtime: DeterministicRuntime

describe('critical workflow performance budgets', () => {
  beforeEach(() => {
    runtime = installDeterministicRuntime()
    vi.spyOn(logger, 'info').mockImplementation(() => undefined)
    vi.spyOn(logger, 'debug').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('persists and enumerates a large document library within budget', async () => {
    const backend = new MemoryBackend()
    await backend.initialize()
    const blockOrder = Array.from({ length: 400 }, (_, index) => `paragraph-${index}`)
    const started = performance.now()

    await Promise.all(
      Array.from({ length: 1_000 }, () => {
        const id = runtime.nextId('large-library')
        return backend.writeNota(
          createNotaFixture({
            id,
            blockStructure: {
              notaId: id,
              blockOrder,
              version: 1,
              lastModified: new Date(),
            },
          }),
        )
      }),
    )
    const notas = await backend.listNotas()

    expect(notas).toHaveLength(1_000)
    expect(notas[999].blockStructure?.blockOrder).toHaveLength(400)
    expect(performance.now() - started).toBeLessThan(REGRESSION_BUDGET_MS)
  })

  it('streams many blocks and a large output through the Jupyter parser within budget', async () => {
    const fixture = createFakeJupyterServer()
    const url = new URL(fixture.origin)
    const config: JupyterServer = { ip: url.hostname, port: url.port, token: 'fixture-token' }
    vi.stubGlobal('fetch', fixture.fetch)
    vi.stubGlobal('WebSocket', fixture.WebSocket)
    vi.stubGlobal('location', { origin: fixture.origin })
    vi.stubGlobal('window', { confirm: () => true })
    const blocks = Array.from({ length: 250 }, (_, index) => ({
      id: runtime.nextId('block'),
      notebookId: 'performance-fixture',
      code: index === 249 ? 'x'.repeat(1_000_000) : `print(${index})`,
    }))
    const started = performance.now()

    const results = await new CodeExecutionService().executeNotebookBlocks(
      config,
      'kernel-fixture',
      blocks,
    )

    expect(results).toHaveLength(250)
    expect(results[249].output.length).toBeGreaterThan(2_000_000)
    expect(fixture.executions).toHaveLength(250)
    expect(performance.now() - started).toBeLessThan(REGRESSION_BUDGET_MS)
  })
})
