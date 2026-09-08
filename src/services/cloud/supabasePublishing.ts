import type { SupabaseClient } from '@supabase/supabase-js'
import type { CloudPublishingApi, CloudStatisticsApi } from './api'
import { CloudError, type CloudJson, type CloudPublication, type CloudResult, normalizeCloudPublishedContent } from './types'
import { mapSupabaseError } from './supabaseAuthProfiles'
import { getSupabaseBrowserClient } from './supabaseBrowser'
import { deletePublishedImages } from './supabaseImageStorage'
import { logger } from '@/services/logger'

const ok = <T>(data: T): CloudResult<T> => ({ ok: true, data })
const fail = <T>(error: unknown): CloudResult<T> => ({ ok: false, error: mapSupabaseError(error) })

type Row = Record<string, unknown>
const publication = (row: Row): CloudPublication => ({
  id: String(row.id), title: String(row.title ?? ''),
  content: normalizeCloudPublishedContent(row.content), authorName: String(row.author_name ?? ''),
  authorTag: typeof row.author_tag === 'string' ? row.author_tag : null,
  isPublic: true, isSubPage: row.is_sub_page === true,
  parentId: typeof row.parent_id === 'string' ? row.parent_id : null,
  tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
  citations: Array.isArray(row.published_nota_citations) ? row.published_nota_citations as CloudJson[] : [],
  publishedSubPages: Array.isArray(row.published_sub_pages) ? row.published_sub_pages.map(String) : [],
  publishedAt: String(row.published_at ?? ''), updatedAt: String(row.updated_at ?? ''),
  viewCount: Number(row.view_count ?? 0), uniqueViewers: Number(row.unique_viewers ?? 0),
  likeCount: Number(row.like_count ?? 0), dislikeCount: Number(row.dislike_count ?? 0),
  cloneCount: Number(row.clone_count ?? 0), commentCount: Number(row.comment_count ?? 0),
  lastViewedAt: typeof row.last_viewed_at === 'string' ? row.last_viewed_at : null,
})

function cursor(value: string | null | undefined): { at: string | null, id: string | null } {
  if (!value) return { at: null, id: null }
  try { const parsed = JSON.parse(atob(value)); return { at: String(parsed.at), id: String(parsed.id) } }
  catch { throw new CloudError('invalid', 'Invalid publication cursor.') }
}

export function normalizeReferrer(value?: string | null): string | null {
  if (!value) return null
  let host = value
  try { host = new URL(value).hostname } catch { /* already a host key */ }
  host = host.toLowerCase().replace(/\.$/, '')
  return /^[a-z0-9.-]{1,253}$/.test(host) ? host : null
}

export function createSupabasePublishingApi(client: SupabaseClient): {
  publishing: CloudPublishingApi, statistics: CloudStatisticsApi
} {
  const publishing: CloudPublishingApi = {
    async getPublication(id) {
      try {
        const { data, error } = await client.rpc('query_publications', { p_id: id, p_limit: 1 })
        if (error) return fail(error)
        return ok(data?.[0] ? publication(data[0] as Row) : null)
      } catch (error) { return fail(error) }
    },
    async listPublications(page) {
      try {
        const before = cursor(page.cursor)
        const { data, error } = await client.rpc('query_publications', {
          p_author_id: page.authorId ?? null, p_author_tag: page.authorTag ?? null, p_owner_only: page.ownerOnly ?? false,
          p_limit: page.limit, p_before_published_at: before.at, p_before_id: before.id,
        })
        if (error) return fail(error)
        const items = (data ?? []).map((row: Row) => publication(row))
        const last = items.at(-1)
        return ok({ items, nextCursor: items.length === page.limit && last
          ? btoa(JSON.stringify({ at: last.publishedAt, id: last.id })) : null })
      } catch (error) { return fail(error) }
    },
    async upsertPublication(value) {
      try {
        const { data, error } = await client.rpc('publish_nota', {
          p_id: value.id, p_title: value.title, p_content: value.content,
          p_author_name: value.authorName, p_is_sub_page: value.isSubPage,
          p_parent_id: value.parentId, p_citations: value.citations,
          p_tags: value.tags, p_child_ids: value.publishedSubPages ?? [],
        })
        if (error) return fail(error)
        if (!data?.[0]) return fail(new CloudError('unknown', 'Publish returned no row.'))
        const refreshed = await publishing.getPublication(value.id)
        if (!refreshed.ok) return refreshed
        return refreshed.data ? ok({ ...refreshed.data, authorId: value.authorId })
          : fail(new CloudError('unknown', 'Published projection was not readable.'))
      } catch (error) { return fail(error) }
    },
    async upsertPublicationHierarchy(values) {
      try {
        if (values.length === 0) return fail(new CloudError('invalid', 'A publication hierarchy cannot be empty.'))
        const { data, error } = await client.rpc('publish_nota_hierarchy', {
          p_publications: values.map(value => ({
            id: value.id,
            title: value.title,
            content: value.content,
            author_name: value.authorName,
            is_sub_page: value.isSubPage,
            parent_id: value.parentId,
            citations: value.citations,
            tags: value.tags,
            child_ids: value.publishedSubPages ?? [],
          })),
        })
        if (error) return fail(error)
        const authorById = new Map(values.map(value => [value.id, value.authorId]))
        const rows = (data ?? []).map((row: Row) => ({
          ...publication(row),
          authorId: authorById.get(String(row.id)),
        }))
        if (rows.length !== values.length) {
          return fail(new CloudError('unknown', 'Publish hierarchy returned an incomplete projection.'))
        }
        return ok(rows)
      } catch (error) { return fail(error) }
    },
    async deletePublication(id) {
      try {
        const { data, error } = await client.rpc('unpublish_nota', { p_id: id })
        if (error) return fail(error)
        if (Array.isArray(data) && data.every(path => typeof path === 'string') && data.length > 0) {
          // The publication deletion is already committed. A transient object
          // cleanup failure is left for the bounded orphan sweep, not reported
          // as a failed unpublish that callers might dangerously retry.
          await deletePublishedImages(data, client).catch(cleanupError => {
            logger.error('Published nota was deleted but image cleanup was deferred:', cleanupError)
          })
        }
        return ok(undefined)
      }
      catch (error) { return fail(error) }
    },
    subscribeToPublication(id, listener) {
      // Projection polling deliberately refreshes content without recording a
      // view. Realtime base-table payloads would expose migration-only fields.
      let active = true
      const refresh = () => { void publishing.getPublication(id).then(result => { if (active && result.ok) listener(result.data) }) }
      const timer = globalThis.setInterval(refresh, 30_000)
      return { unsubscribe() { active = false; globalThis.clearInterval(timer) } }
    },
  }
  const statistics: CloudStatisticsApi = {
    async getPublicationStats(id) {
      const result = await publishing.getPublication(id)
      return !result.ok ? result : ok(result.data ? {
        viewCount: result.data.viewCount ?? 0, uniqueViewers: result.data.uniqueViewers ?? 0,
        likeCount: result.data.likeCount ?? 0, dislikeCount: result.data.dislikeCount ?? 0,
        cloneCount: result.data.cloneCount ?? 0, commentCount: result.data.commentCount ?? 0,
        lastViewedAt: result.data.lastViewedAt ?? null,
      } : null)
    },
    async getVote(id) {
      try {
        const { data, error } = await client.rpc('get_nota_vote', { p_nota_id: id })
        return error ? fail(error) : ok(data === 'like' || data === 'dislike' ? data : null)
      } catch (error) { return fail(error) }
    },
    async recordView(id, referrer) {
      try { const { data, error } = await client.rpc('record_nota_view', { p_nota_id: id, p_referrer_key: normalizeReferrer(referrer) })
        return error ? fail(error) : ok({ viewCount: Number(data?.[0]?.view_count ?? 0), uniqueViewers: Number(data?.[0]?.unique_viewers ?? 0) })
      } catch (error) { return fail(error) }
    },
    async vote(id, vote) {
      try {
        const { data,error } = await client.rpc('toggle_nota_vote',{p_nota_id:id,p_vote:vote})
        if(error)return fail(error)
        const row=data as Record<string,unknown>
        return ok({likeCount:Number(row?.like_count??0),dislikeCount:Number(row?.dislike_count??0),
          userVote:row?.user_vote==='like'||row?.user_vote==='dislike'?row.user_vote:null})
      } catch (error) { return fail(error) }
    },
    async recordClone(id) {
      try { const { data, error } = await client.rpc('record_nota_clone', { p_nota_id: id }); return error ? fail(error) : ok(Number(data)) }
      catch (error) { return fail(error) }
    },
  }
  return { publishing, statistics }
}

export async function getSupabasePublishingApi() {
  return createSupabasePublishingApi(await getSupabaseBrowserClient())
}
