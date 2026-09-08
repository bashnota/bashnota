import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSupabasePublishingApi, normalizeReferrer } from '../supabasePublishing'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import NotaContentViewer from '@/features/editor/components/NotaContentViewer.vue'


const row = {
  id: 'nota-1', title: 'Public', content: { type: 'doc' }, author_name: 'Author',
  author_tag: 'stable_tag', is_sub_page: false, parent_id: null,
  published_sub_pages: ['child-b', 'child-a'], published_nota_citations: [{ id: 'b' }, { id: 'a' }],
  tags: ['safe'], published_at: '2026-08-13T00:00:00Z', updated_at: '2026-08-13T00:00:00Z',
  view_count: 2, unique_viewers: 1, like_count: 0, dislike_count: 0,
  clone_count: 0, comment_count: 0, last_viewed_at: null,
}

describe('Supabase publishing boundary', () => {
  afterEach(() => vi.useRealTimers())

  it('normalizes URL referrers to a bounded dotted host', () => {
    const long = `${'a'.repeat(80)}.deep.analytics.example.com`
    expect(normalizeReferrer(`https://${long}/private/path?q=secret`)).toBe(long)
    expect(normalizeReferrer('javascript:alert(1)')).toBeNull()
    expect(normalizeReferrer('host/with/path')).toBeNull()
  })

  it('maps only the safe RPC projection and preserves ordered arrays', async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: [row], error: null }) }
    const api = createSupabasePublishingApi(client as never)
    const result = await api.publishing.getPublication('nota-1')
    expect(result).toMatchObject({ ok: true, data: {
      id: 'nota-1', authorTag: 'stable_tag', content: { type: 'doc' },
      publishedSubPages: ['child-b', 'child-a'], citations: [{ id: 'b' }, { id: 'a' }],
    } })
    if (!result.ok || !result.data) throw new Error('expected publication')
    expect(result.data).not.toHaveProperty('authorId')
    expect(client.rpc).toHaveBeenCalledWith('query_publications', { p_id: 'nota-1', p_limit: 1 })
  })

  it('normalizes one legacy JSON string but refuses double-encoded content', async () => {
    const legacy = { ...row, content: JSON.stringify({ type: 'doc', content: [] }) }
    const client = { rpc: vi.fn().mockResolvedValue({ data: [legacy], error: null }) }
    const api = createSupabasePublishingApi(client as never)
    await expect(api.publishing.getPublication('nota-1')).resolves.toMatchObject({
      ok: true, data: { content: { type: 'doc', content: [] } },
    })
    legacy.content = JSON.stringify(legacy.content)
    await expect(api.publishing.getPublication('nota-1')).resolves.toMatchObject({ ok: true, data: { content: null } })
  })

  it('refresh polling never records a duplicate view', async () => {
    vi.useFakeTimers()
    const client = { rpc: vi.fn().mockResolvedValue({ data: [row], error: null }) }
    const api = createSupabasePublishingApi(client as never)
    const listener = vi.fn()
    const subscription = api.publishing.subscribeToPublication('nota-1', listener)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(client.rpc).toHaveBeenCalledTimes(2)
    expect(client.rpc.mock.calls.every(call => call[0] === 'query_publications')).toBe(true)
    subscription.unsubscribe()
  })

  it('sends a normalized host to the single atomic view RPC', async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: [{ view_count: 3, unique_viewers: 1 }], error: null }) }
    const api = createSupabasePublishingApi(client as never)
    await expect(api.statistics.recordView('nota-1', 'https://reader.example.com/a')).resolves
      .toEqual({ ok: true, data: { viewCount: 3, uniqueViewers: 1 } })
    expect(client.rpc).toHaveBeenCalledWith('record_nota_view', {
      p_nota_id: 'nota-1', p_referrer_key: 'reader.example.com',
    })
  })

  it('publishes, reads, and mounts canonical Supabase content', async () => {
    const contentDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Supabase provider render' }] }] }
    const client = { rpc: vi.fn(async (name: string) => ({ data: name === 'publish_nota' ? [row] : [{ ...row, content: contentDocument }], error: null })) }
    const api = createSupabasePublishingApi(client as never)
    const published = await api.publishing.upsertPublication({
      id: 'nota-1', authorId: 'owner', title: 'Public', content: contentDocument,
      authorName: 'Author', isPublic: true, isSubPage: false, parentId: null,
      tags: [], citations: [], publishedAt: row.published_at, updatedAt: row.updated_at,
    })
    if (!published.ok) throw published.error
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
    await router.push('/'); await router.isReady()
    const wrapper = mount(NotaContentViewer, {
      attachTo: document.body,
      props: { content: published.data.content, readonly: true, isPublished: true },
      global: { plugins: [createPinia(), router] },
    })
    await nextTick(); await nextTick()
    expect(wrapper.text()).toContain('Supabase provider render')
    wrapper.unmount()
  })

  it('publishes a complete hierarchy through one atomic RPC and preserves response order', async () => {
    const child = { ...row, id: 'child-1', title: 'Child', is_sub_page: true, parent_id: 'nota-1', published_sub_pages: [] }
    const client = { rpc: vi.fn().mockResolvedValue({ data: [row, child], error: null }) }
    const api = createSupabasePublishingApi(client as never)
    const values = [
      {
        id: 'nota-1', authorId: 'owner', title: 'Public', content: { type: 'doc' },
        authorName: 'Author', isPublic: true, isSubPage: false, parentId: null,
        tags: [], citations: [], publishedSubPages: ['child-1'],
        publishedAt: row.published_at, updatedAt: row.updated_at,
      },
      {
        id: 'child-1', authorId: 'owner', title: 'Child', content: { type: 'doc' },
        authorName: 'Author', isPublic: true, isSubPage: true, parentId: 'nota-1',
        tags: [], citations: [], publishedSubPages: [],
        publishedAt: row.published_at, updatedAt: row.updated_at,
      },
    ]

    await expect(api.publishing.upsertPublicationHierarchy(values)).resolves.toMatchObject({
      ok: true,
      data: [{ id: 'nota-1', authorId: 'owner' }, { id: 'child-1', authorId: 'owner' }],
    })
    expect(client.rpc).toHaveBeenCalledOnce()
    expect(client.rpc).toHaveBeenCalledWith('publish_nota_hierarchy', {
      p_publications: expect.arrayContaining([
        expect.objectContaining({ id: 'nota-1', child_ids: ['child-1'] }),
        expect.objectContaining({ id: 'child-1', parent_id: 'nota-1' }),
      ]),
    })
  })

  it('deletes only the exact image paths released by authoritative unpublish', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { removed: ['owner/image.png'] }, error: null })
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: ['owner/image.png'], error: null }),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner' } }, error: null }) },
      functions: { invoke },
    }
    const api = createSupabasePublishingApi(client as never)
    await expect(api.publishing.deletePublication('nota-1')).resolves.toEqual({ ok: true, data: undefined })
    expect(invoke).toHaveBeenCalledWith('published-images', {
      body: { action: 'delete', paths: ['owner/image.png'] },
    })
  })
})
