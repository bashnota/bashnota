import { describe, expect, it, vi } from 'vitest'
import { CloudError, type CloudPublication } from '@/services/cloud/types'
import { listAllPublications } from './listAllPublications'

function publication(id: string): CloudPublication {
  return {
    id,
    title: id,
    content: { type: 'doc' },
    authorName: 'Owner',
    authorTag: 'owner',
    isPublic: true,
    isSubPage: false,
    parentId: null,
    tags: [],
    citations: [],
    publishedSubPages: [],
    publishedAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }
}

describe('listAllPublications', () => {
  it('loads every cursor page before exposing more than 100 publications', async () => {
    const first = Array.from({ length: 100 }, (_, index) => publication(`publication-${index}`))
    const second = Array.from({ length: 25 }, (_, index) =>
      publication(`publication-${index + 100}`),
    )
    const listPublications = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: { items: first, nextCursor: 'page-2' } })
      .mockResolvedValueOnce({ ok: true, data: { items: second, nextCursor: null } })

    await expect(
      listAllPublications({ listPublications }, { limit: 100, ownerOnly: true }),
    ).resolves.toEqual([...first, ...second])
    expect(listPublications).toHaveBeenNthCalledWith(1, {
      limit: 100,
      ownerOnly: true,
      cursor: null,
    })
    expect(listPublications).toHaveBeenNthCalledWith(2, {
      limit: 100,
      ownerOnly: true,
      cursor: 'page-2',
    })
  })

  it('rejects the whole walk when a later page fails', async () => {
    const listPublications = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: { items: [publication('first')], nextCursor: 'page-2' },
      })
      .mockResolvedValueOnce({
        ok: false,
        error: new CloudError('unavailable', 'page two unavailable'),
      })

    await expect(listAllPublications({ listPublications }, { limit: 100 })).rejects.toThrow(
      'page two unavailable',
    )
  })

  it('rejects repeated cursors and overlapping publication ids', async () => {
    const repeatedCursor = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: { items: [publication('first')], nextCursor: 'page-2' },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { items: [publication('second')], nextCursor: 'page-2' },
      })

    await expect(
      listAllPublications({ listPublications: repeatedCursor }, { limit: 100 }),
    ).rejects.toThrow('did not advance')

    const duplicateId = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: { items: [publication('same')], nextCursor: 'page-2' },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { items: [publication('same')], nextCursor: null },
      })

    await expect(
      listAllPublications({ listPublications: duplicateId }, { limit: 100 }),
    ).rejects.toThrow('duplicate id')
  })
})
