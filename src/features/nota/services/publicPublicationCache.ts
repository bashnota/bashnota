import type { CloudPublication } from '@/services/cloud/types'

const CACHE_NAME = 'bashnota-public-publications-v1'
const CACHE_PATH = '__offline/publications/'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000
const MAX_ENTRIES = 40

interface CachedPublication {
  cachedAt: number
  publication: Omit<CloudPublication, 'authorId'>
}

function cacheKey(id: string): string {
  const base = typeof location === 'undefined' ? 'https://bashnota.invalid/' : location.href
  return new URL(`${import.meta.env.BASE_URL}${CACHE_PATH}${encodeURIComponent(id)}`, base).toString()
}

function isPublication(value: unknown, id: string): value is CloudPublication {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CloudPublication>
  return candidate.id === id
    && candidate.isPublic === true
    && typeof candidate.title === 'string'
    && typeof candidate.authorName === 'string'
    && typeof candidate.publishedAt === 'string'
    && typeof candidate.updatedAt === 'string'
}

export async function cachePublicPublication(publication: CloudPublication): Promise<void> {
  if (typeof caches === 'undefined' || !publication.isPublic) return
  // Construct the cached value explicitly instead of trusting every cloud
  // provider to omit private ownership identity from its public projection.
  const { authorId: _privateAuthorId, ...publicPublication } = publication
  const cache = await caches.open(CACHE_NAME)
  await cache.put(cacheKey(publication.id), new Response(JSON.stringify({
    cachedAt: Date.now(),
    publication: publicPublication,
  } satisfies CachedPublication), {
    headers: { 'content-type': 'application/json' },
  }))

  const keys = await cache.keys()
  for (const staleKey of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
    await cache.delete(staleKey)
  }
}

export async function readCachedPublicPublication(id: string): Promise<CloudPublication | null> {
  if (typeof caches === 'undefined') return null
  const cache = await caches.open(CACHE_NAME)
  const response = await cache.match(cacheKey(id))
  if (!response) return null

  try {
    const cached = await response.json() as Partial<CachedPublication>
    if (typeof cached.cachedAt !== 'number'
      || Date.now() - cached.cachedAt > MAX_AGE_MS
      || !isPublication(cached.publication, id)) {
      await cache.delete(cacheKey(id))
      return null
    }
    return cached.publication
  } catch {
    await cache.delete(cacheKey(id))
    return null
  }
}

export async function removeCachedPublicPublication(id: string): Promise<void> {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(CACHE_NAME)
  await cache.delete(cacheKey(id))
}
