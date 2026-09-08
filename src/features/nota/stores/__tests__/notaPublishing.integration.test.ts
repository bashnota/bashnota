import 'fake-indexeddb/auto'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createPinia, setActivePinia } from 'pinia'

const state = vi.hoisted(() => ({
  client: null as SupabaseClient | null,
  api: null as ReturnType<typeof import('@/services/cloud/supabasePublishing').createSupabasePublishingApi> | null,
  userId: '',
  contents: new Map<string, any>(),
}))

vi.mock('@/features/auth/stores/auth', () => ({
  useAuthStore: () => ({ currentUser: { uid: state.userId, displayName: 'Hierarchy Owner' } }),
}))
vi.mock('@/features/nota/stores/blockStore', () => ({
  useBlockStore: () => ({
    getTiptapContent: (id: string) => state.contents.get(id) ?? null,
    loadNotaBlocks: vi.fn(),
  }),
}))
vi.mock('@/services/cloud', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/cloud')>()
  return {
    ...original,
    getPublicationCloudApi: async () => {
      if (!state.api) throw new Error('integration publication API is not initialized')
      return state.api
    },
  }
})
vi.mock('@/services/cloud/supabaseImageStorage', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/cloud/supabaseImageStorage')>()
  return {
    ...original,
    uploadPublishedImageAsset: (dataUrl: string) => original.uploadPublishedImageAsset(dataUrl, state.client!),
    deletePublishedImages: (paths: readonly string[]) => original.deletePublishedImages(paths, state.client!),
    cleanupOrphanedPublishedImages: () => original.cleanupOrphanedPublishedImages(state.client!),
  }
})
vi.mock('vue-sonner', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() })
  return { toast }
})

import { createSupabasePublishingApi } from '@/services/cloud/supabasePublishing'
import { PUBLISHED_IMAGE_BUCKET } from '@/services/cloud/supabaseImageStorage'
import { CloudError } from '@/services/cloud/types'
import { useNotaStore } from '@/features/nota/stores/nota'
import type { Nota } from '@/features/nota/types/nota'

const enabled = process.env.RUN_SUPABASE_PUBLISHING_INTEGRATION === 'true'
const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const suffix = randomUUID().replace(/-/g, '').slice(0, 12)
const rootId = `store-root-${suffix}`
const childId = `store-child-${suffix}`
const grandchildId = `store-grandchild-${suffix}`
const timestamp = new Date('2026-08-26T12:00:00.000Z')
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

const nota = (id: string, parentId: string | null, title: string): Nota => ({
  id, parentId, title, tags: [], createdAt: timestamp, updatedAt: timestamp,
})

describe.skipIf(!enabled)('nota store against local publishable-key Supabase', () => {
  beforeAll(async () => {
    state.client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const password = `Hierarchy-${suffix}!`
    const signup = await state.client.auth.signUp({ email: `hierarchy-${suffix}@example.test`, password })
    expect(signup.error).toBeNull()
    state.userId = signup.data.user!.id
    state.api = createSupabasePublishingApi(state.client)
  })

  afterAll(async () => {
    if (!state.client || !state.userId) return
    await state.client.rpc('unpublish_nota', { p_id: rootId })
    const listed = await state.client.storage.from(PUBLISHED_IMAGE_BUCKET).list(state.userId)
    const paths = (listed.data ?? []).map(object => `${state.userId}/${object.name}`)
    if (paths.length > 0) await state.client.functions.invoke('published-images', {
      body: { action: 'delete', paths },
    })
    await state.client.auth.signOut()
  })

  it('rolls back, cleans images, retries, and coalesces a concurrent hierarchy publish', async () => {
    setActivePinia(createPinia())
    const store = useNotaStore()
    store.items = [
      nota(rootId, null, 'Store Root'),
      nota(childId, rootId, ''),
      nota(grandchildId, childId, 'Store Grandchild'),
    ]
    state.contents.set(rootId, {
      type: 'doc',
      content: [{ type: 'imageBlock', attrs: { src: png } }],
    })
    state.contents.set(childId, { type: 'doc', content: [{ type: 'paragraph' }] })
    state.contents.set(grandchildId, { type: 'doc', content: [{ type: 'paragraph' }] })

    await expect(store.publishNota(rootId, true)).rejects.toThrow()
    expect(store.publishedNotas).toEqual([])
    expect(store.items.every(item => !item.isPublished)).toBe(true)
    expect((await state.client!.rpc('query_publications', { p_id: rootId, p_limit: 1 })).data).toEqual([])
    expect((await state.client!.storage.from(PUBLISHED_IMAGE_BUCKET).list(state.userId)).data).toEqual([])

    store.items.find(item => item.id === childId)!.title = 'Store Child'
    await expect(store.publishNota(rootId, true)).resolves.toMatchObject({ id: rootId })
    expect(store.publishedNotas).toEqual([rootId, childId, grandchildId])
    expect(store.items.every(item => item.isPublished)).toBe(true)

    const edgeRead = await state.client!.from('published_nota_edges')
      .select('parent_id,child_id,ordinal')
      .in('parent_id', [rootId, childId])
      .order('parent_id')
      .order('ordinal')
    expect(edgeRead.error).toBeNull()
    expect(edgeRead.data).toEqual([
      { parent_id: childId, child_id: grandchildId, ordinal: 0 },
      { parent_id: rootId, child_id: childId, ordinal: 0 },
    ])

    const original = state.api!.publishing.upsertPublicationHierarchy.bind(state.api!.publishing)
    const commit = vi.spyOn(state.api!.publishing, 'upsertPublicationHierarchy').mockImplementation(original)
    commit.mockImplementationOnce(async (values) => {
      const committed = await original(values)
      expect(committed.ok).toBe(true)
      return { ok: false, error: new CloudError('unavailable', 'injected response loss after commit') }
    })
    await expect(store.publishNota(rootId, true)).resolves.toMatchObject({ id: rootId })
    const objectsAfterReconciliation = await state.client!.storage.from(PUBLISHED_IMAGE_BUCKET).list(state.userId)
    expect(objectsAfterReconciliation.error).toBeNull()
    expect(objectsAfterReconciliation.data!.length).toBeGreaterThan(0)

    commit.mockClear()
    await expect(Promise.all([
      store.publishNota(rootId, true),
      store.publishNota(rootId, true),
    ])).resolves.toMatchObject([{ id: rootId }, { id: rootId }])
    expect(commit).toHaveBeenCalledOnce()
  }, 30_000)
})
