import { describe, expect, it } from 'vitest'
import type { CloudApi, CloudComment, CloudPublication, CloudPublicationWrite, CloudResult, CloudSession } from '..'
import { CloudError } from '..'

export const publication: CloudPublicationWrite = {
  id: 'nota-1', authorId: 'user-1', title: 'A nota', content: { type: 'doc' }, authorName: 'Ada',
  isPublic: true, isSubPage: false, parentId: null, tags: ['research'], citations: [],
  publishedAt: '2026-08-13T00:00:00.000Z', updatedAt: '2026-08-13T00:00:00.000Z',
}
export const comment: CloudComment = {
  id: 'comment-1', notaId: publication.id, authorId: 'user-1', authorName: 'Ada', authorTag: 'ada',
  content: 'hello', parentId: null, createdAt: publication.publishedAt, updatedAt: publication.updatedAt,
  likeCount: 0, dislikeCount: 0, replyCount: 0,
}
export const session: CloudSession = {
  user: { id: 'user-1', email: 'ada@example.test', displayName: 'Ada', photoUrl: null, emailVerified: true, createdAt: publication.publishedAt, lastSignInAt: publication.updatedAt },
  accessToken: 'token', expiresAt: '2026-08-14T00:00:00.000Z',
}
export const ok = <T>(data: T): CloudResult<T> => ({ ok: true, data })

/** Shared provider contract: run unchanged for provider implementations. */
export function cloudContract(name: string, create: () => CloudApi): void {
  describe(`${name} CloudApi contract`, () => {
    it('uses provider-neutral results and ISO timestamps for auth and pages', async () => {
      const api = create()
      const authenticated = await api.auth.currentSession()
      if (!authenticated.ok) throw authenticated.error
      expect(authenticated.data?.user.id).toBe(session.user.id)
      expect(authenticated.data?.user.createdAt).toMatch(/^\d{4}-\d\d-\d\dT/)
      const page = await api.publishing.listPublications({ limit: 1 })
      if (!page.ok) throw page.error
      expect(page.data.items.map(item => item.id)).toEqual([publication.id])
      expect(page.data.nextCursor).toBeTruthy()
    })

    it('uses typed failures instead of provider exceptions', () => {
      const error = new CloudError('forbidden', 'not allowed')
      const result: CloudResult<never> = { ok: false, error }
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('forbidden')
    })

    it('delivers realtime updates until the subscription is removed', async () => {
      const api = create()
      const received: (CloudPublication | null)[] = []
      const subscription = api.publishing.subscribeToPublication(publication.id, value => received.push(value))
      await api.publishing.upsertPublication({ ...publication, title: 'Changed' })
      subscription.unsubscribe()
      await api.publishing.upsertPublication({ ...publication, title: 'Ignored' })
      expect(received.map(value => value?.title)).toContain('Changed')
      expect(received.map(value => value?.title)).not.toContain('Ignored')
    })

    it('keeps profiles, comments, metrics, newsletter, and analytics in the same result boundary', async () => {
      const api = create()
      expect((await api.profiles.getProfile('missing')).ok).toBe(true)
      expect((await api.profiles.isTagAvailable('ada')).ok).toBe(true)
      expect((await api.comments.listComments(publication.id, { limit: 10 })).ok).toBe(true)
      const created = await api.comments.createComment({
        notaId: publication.id, authorId: session.user.id, authorName: 'Ada', authorTag: 'ada', content: 'new', parentId: null,
      })
      expect(created.ok).toBe(true)
      if (!created.ok) throw created.error
      expect((await api.comments.updateComment(created.data.id, 'edited')).ok).toBe(true)
      expect((await api.comments.getVote(created.data.id)).ok).toBe(true)
      expect((await api.comments.vote(created.data.id, 'like')).ok).toBe(true)
      expect((await api.comments.deleteComment(created.data.id)).ok).toBe(true)
      expect((await api.statistics.getPublicationStats(publication.id)).ok).toBe(true)
      expect((await api.statistics.recordView(publication.id)).ok).toBe(true)
      expect((await api.statistics.vote(publication.id, 'like')).ok).toBe(true)
      expect((await api.statistics.recordClone(publication.id)).ok).toBe(true)
      expect((await api.newsletter.subscribe('ada@example.test', 'Ada')).ok).toBe(true)
      expect((await api.newsletter.unsubscribe()).ok).toBe(true)
      api.analytics.track('contract_checked')
    })
  })
}
