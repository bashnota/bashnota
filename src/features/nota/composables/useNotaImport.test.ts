import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { db } from '@/db'
import { useNotaStore } from '@/features/nota/stores/nota'

const { push, toast } = vi.hoisted(() => ({
  push: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/services/toast', () => ({ toast }))

import { useNotaImport } from './useNotaImport'

function installFilePicker(file: File): void {
  vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
    if (tagName !== 'input') return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    const input = {
      type: '',
      accept: '',
      value: '',
      onchange: null as ((event: unknown) => void) | null,
      oncancel: null as (() => void) | null,
      click() {
        this.onchange?.({ target: { files: [file] } })
      },
    }
    return input as unknown as HTMLInputElement
  }) as typeof document.createElement)
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  setActivePinia(createPinia())
  push.mockReset()
  toast.mockReset()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await db.delete()
})

describe('Jupyter notebook import durability', () => {
  it('commits every converted cell before reporting success', async () => {
    const file = new File([JSON.stringify({
      metadata: { title: 'Atomic notebook' },
      cells: [
        { cell_type: 'markdown', source: ['# Heading'] },
        { cell_type: 'code', source: ['print(42)'], outputs: [] },
      ],
    })], 'atomic.ipynb', { type: 'application/json' })
    installFilePicker(file)

    await expect(useNotaImport().importJupyterNotebook()).resolves.toBe(true)

    const [nota] = await db.notas.toArray()
    expect(nota.title).toBe('Atomic notebook')
    const [structure] = await db.blockStructures.where('notaId').equals(nota.id).toArray()
    expect(structure.blockOrder).toHaveLength(2)
    expect(await db.getAllBlocksForNota(nota.id)).toHaveLength(2)
    expect(useNotaStore().items.map(({ id }) => id)).toEqual([nota.id])
    expect(push).toHaveBeenCalledWith(`/nota/${nota.id}`)
    expect(toast).toHaveBeenCalledWith('Notebook "Atomic notebook" imported successfully')
  })

  it('reports failure and leaves no nota or cells when the atomic commit fails', async () => {
    const file = new File([JSON.stringify({
      metadata: { title: 'Atomic notebook' },
      cells: [
        { cell_type: 'markdown', source: ['# Heading'] },
        { cell_type: 'code', source: ['print(42)'], outputs: [] },
      ],
    })], 'atomic.ipynb', { type: 'application/json' })
    installFilePicker(file)
    vi.spyOn(db.notas, 'put').mockImplementation(() => {
      throw new Error('injected notebook metadata failure')
    })

    await expect(useNotaImport().importJupyterNotebook()).resolves.toBe(false)

    expect(await db.notas.count()).toBe(0)
    expect(await db.blockStructures.count()).toBe(0)
    const blockCounts = await Promise.all(db.tables
      .filter((table) => table.name.endsWith('Blocks'))
      .map((table) => table.count()))
    expect(blockCounts.every((count) => count === 0)).toBe(true)
    expect(useNotaStore().items).toEqual([])
    expect(push).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('Failed to import the notebook file', {
      description: 'injected notebook metadata failure',
    })
    expect(toast).not.toHaveBeenCalledWith(expect.stringContaining('imported successfully'))
  })
})
