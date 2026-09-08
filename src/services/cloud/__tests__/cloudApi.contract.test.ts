import type { CloudApi, CloudSubscription } from '..'
import { cloudContract, comment, ok, publication, session } from './cloudApi.contract'

function fakeCloudApi(): CloudApi {
  const listeners = new Set<(value: typeof publication | null) => void>()
  return {
    auth: {
      currentSession: async () => ok(session), signInWithPassword: async () => ok(session), signUpWithPassword: async () => ok(session), signInWithGoogle: async () => ok(undefined), completeOAuthCallback: async () => ok(session), signOut: async () => ok(undefined), sendPasswordReset: async () => ok(undefined), updatePassword: async () => ok(undefined),
      onSessionChange: () => ({ unsubscribe() {} }),
    },
    profiles: { getProfile: async () => ok(null), getProfileByTag: async () => ok(null), provisionProfile: async value => ok(value), upsertProfile: async value => ok(value), isTagAvailable: async () => ok(true) },
    publishing: {
      getPublication: async id => ok(id === publication.id ? publication : null),
      listPublications: async page => ok({ items: [publication].slice(0, page.limit), nextCursor: page.limit === 1 ? 'cursor-2' : null }),
      upsertPublication: async value => { listeners.forEach(listener => listener(value)); return ok(value) },
      upsertPublicationHierarchy: async values => { values.forEach(value => listeners.forEach(listener => listener(value))); return ok(values) },
      deletePublication: async () => ok(undefined),
      subscribeToPublication: (_id, listener) => { listeners.add(listener); return { unsubscribe: () => listeners.delete(listener) } satisfies CloudSubscription },
    },
    comments: { listComments: async () => ok({ items: [comment], nextCursor: null }), createComment: async value => ok({ ...value, id: comment.id, createdAt: publication.publishedAt, updatedAt: publication.updatedAt, likeCount:0, dislikeCount:0, replyCount:0 }), updateComment: async (id,content) => ok({ ...comment,id,content }), deleteComment: async () => ok(undefined), getVote:async()=>ok(null), vote: async () => ok({ likeCount: 1, dislikeCount: 0, userVote: 'like' }) },
    statistics: { getPublicationStats: async () => ok({ viewCount: 1, uniqueViewers: 1, likeCount: 1, dislikeCount: 0, cloneCount: 0, commentCount: 1, lastViewedAt: publication.updatedAt }), getVote: async () => ok('like'), recordView: async () => ok({ viewCount: 2, uniqueViewers: 1 }), vote: async () => ok({ likeCount: 1, dislikeCount: 0, userVote: 'like' }), recordClone: async () => ok(1) },
    newsletter: { subscribe: async () => ok(undefined), unsubscribe: async () => ok(undefined) },
    analytics: { track: () => undefined },
  }
}

cloudContract('fake', fakeCloudApi)
