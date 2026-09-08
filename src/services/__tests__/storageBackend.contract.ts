import { expect, it } from 'vitest'
import type { IStorageBackend } from '../storageService'
import { createNotaFixture } from '@/test/fixtures/nota'

export interface StorageContractHarness {
  create(): Promise<IStorageBackend>
  cleanup?(): Promise<void>
}

/**
 * The minimum observable contract shared by every nota storage authority.
 * Backends may differ internally, but callers must be able to rely on these
 * CRUD and overwrite semantics when switching storage mode.
 */
export function storageBackendContract(harness: StorageContractHarness): void {
  it('writes, reads, lists, overwrites, and deletes a nota', async () => {
    const backend = await harness.create()
    const nota = createNotaFixture()

    try {
      await backend.writeNota(nota)
      expect(await backend.readNota(nota.id)).toMatchObject({
        id: nota.id,
        title: nota.title,
        tags: nota.tags,
      })
      expect((await backend.listNotas()).map((entry) => entry.id)).toContain(nota.id)

      await backend.writeNota({ ...nota, title: 'Updated deterministic title' })
      expect((await backend.readNota(nota.id))?.title).toBe('Updated deterministic title')

      await backend.deleteNota(nota.id)
      expect(await backend.readNota(nota.id)).toBeNull()
      expect((await backend.listNotas()).map((entry) => entry.id)).not.toContain(nota.id)
    } finally {
      await harness.cleanup?.()
    }
  })

  it('treats deletion of a missing nota as idempotent', async () => {
    const backend = await harness.create()
    try {
      await expect(backend.deleteNota('nota-fixture-missing')).resolves.toBeUndefined()
    } finally {
      await harness.cleanup?.()
    }
  })

  it('clears and verifies the complete backend authority', async () => {
    const backend = await harness.create()
    try {
      await backend.writeNota(createNotaFixture({ id: 'nota-to-clear' }))
      await backend.clearAll()
      expect(await backend.listNotas()).toEqual([])
    } finally {
      await harness.cleanup?.()
    }
  })
}
