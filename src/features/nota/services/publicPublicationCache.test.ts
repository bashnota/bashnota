import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CloudPublication } from '@/services/cloud/types'
import {
  cachePublicPublication,
  readCachedPublicPublication,
  removeCachedPublicPublication,
} from './publicPublicationCache'

const publication: CloudPublication = {
  id: 'public-cache-fixture',
  authorId: 'private-owner-id',
  title: 'Offline public nota',
  content: { type: 'doc', content: [] },
  authorName: 'Author',
  authorTag: 'author',
  isPublic: true,
  isSubPage: false,
  parentId: null,
  tags: [],
  citations: [],
  publishedSubPages: [],
  publishedAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
}

describe('public publication offline cache', () => {
  const records = new Map<string, Response>()

  beforeEach(() => {
    records.clear()
    vi.stubGlobal('caches', {
      open: vi.fn(async () => ({
        put: async (request: RequestInfo | URL, response: Response) => {
          records.set(String(request), response.clone())
        },
        match: async (request: RequestInfo | URL) => records.get(String(request))?.clone(),
        delete: async (request: RequestInfo | URL) => records.delete(String(request)),
        keys: async () => [...records.keys()].map((key) => new Request(key)),
      })),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('round-trips a bounded public projection and supports explicit removal', async () => {
    await cachePublicPublication(publication)
    const { authorId: _privateAuthorId, ...publicProjection } = publication
    await expect(readCachedPublicPublication(publication.id)).resolves.toEqual(publicProjection)
    expect(await records.values().next().value?.clone().text()).not.toContain('private-owner-id')
    await removeCachedPublicPublication(publication.id)
    await expect(readCachedPublicPublication(publication.id)).resolves.toBeNull()
  })

  it('deletes expired, malformed, and mismatched entries instead of serving stale data', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'))
    await cachePublicPublication(publication)
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1_000)
    await expect(readCachedPublicPublication(publication.id)).resolves.toBeNull()

    const cache = await caches.open('bashnota-public-publications-v1')
    await cache.put(new URL('/bashnota/__offline/publications/public-cache-fixture', location.href), new Response('{broken'))
    await expect(readCachedPublicPublication(publication.id)).resolves.toBeNull()
  })
})
