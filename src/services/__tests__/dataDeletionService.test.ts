import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db'
import { createNotaFixture } from '@/test/fixtures/nota'
import { initializeDatabaseAdapter } from '../databaseAdapter'
import { deleteAllData, prepareDataDeletion } from '../dataDeletionService'

describe('complete data deletion coordinator', () => {
  beforeEach(async () => {
    await db.open()
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()))
    })
    localStorage.clear()
    sessionStorage.clear()
    vi.stubGlobal('caches', {
      keys: vi.fn(async () => []),
      delete: vi.fn(async () => true),
    })
    await initializeDatabaseAdapter(true, 'indexeddb')
  })

  afterEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()))
    })
    db.close()
    vi.unstubAllGlobals()
  })

  it('clears every owned Dexie table and browser setting after a reload-like reopen', async () => {
    await db.notas.put(createNotaFixture({ id: 'erase-me' }))
    await db.textBlocks.put({
      id: 'block-to-erase', type: 'text', notaId: 'erase-me', order: 0,
      content: 'erase me', createdAt: new Date(), updatedAt: new Date(),
    } as never)
    localStorage.setItem('editor-settings', '{"fontSize":18}')
    sessionStorage.setItem('temporary-data', 'erase me')

    const plan = await prepareDataDeletion()
    expect(plan.activeBackend).toBe('indexeddb')
    expect(plan.authorities.map((authority) => authority.id)).toEqual(['indexeddb', 'browser-storage'])
    const report = await deleteAllData(plan)

    expect(report.complete).toBe(true)
    expect(report.results.every((result) => result.status === 'cleared')).toBe(true)
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    db.close()
    await db.open()
    expect(await Promise.all(db.tables.map((table) => table.count()))).toEqual(db.tables.map(() => 0))
  })

  it('reports browser cache failure without claiming the successful IndexedDB clear failed', async () => {
    await db.notas.put(createNotaFixture({ id: 'erase-despite-cache-error' }))
    vi.stubGlobal('caches', {
      keys: vi.fn(async () => ['bashnota-cache']),
      delete: vi.fn(async () => false),
    })

    const report = await deleteAllData(await prepareDataDeletion())

    expect(report.complete).toBe(false)
    expect(report.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'indexeddb', status: 'cleared' }),
      expect.objectContaining({ id: 'browser-storage', status: 'failed' }),
    ]))
    expect(await db.notas.count()).toBe(0)
  })
})
