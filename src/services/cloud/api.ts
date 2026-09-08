import type {
  CloudComment, CloudCommentPageRequest, CloudPage, CloudProfile, CloudPublication,
  CloudPublicationPageRequest, CloudPublicationStats, CloudPublicationWrite, CloudResult, CloudSession, CloudSubscription, CloudUser,
  CloudVoteResult, VoteKind,
} from './types'

export interface CloudAuthApi {
  currentSession(): Promise<CloudResult<CloudSession | null>>
  signInWithPassword(email: string, password: string): Promise<CloudResult<CloudSession>>
  signUpWithPassword(email: string, password: string, displayName: string): Promise<CloudResult<CloudSession | null>>
  signInWithGoogle(redirectTo: string): Promise<CloudResult<void>>
  completeOAuthCallback(callbackUrl: string): Promise<CloudResult<CloudSession>>
  signOut(): Promise<CloudResult<void>>
  sendPasswordReset(email: string, redirectTo: string): Promise<CloudResult<void>>
  updatePassword(password: string): Promise<CloudResult<void>>
  onSessionChange(listener: (session: CloudSession | null) => void): CloudSubscription
}

export interface CloudProfilesApi {
  getProfile(userId: string): Promise<CloudResult<CloudProfile | null>>
  getProfileByTag(tag: string): Promise<CloudResult<CloudProfile | null>>
  provisionProfile(profile: CloudProfile, displayName: string): Promise<CloudResult<CloudProfile>>
  upsertProfile(profile: CloudProfile): Promise<CloudResult<CloudProfile>>
  isTagAvailable(tag: string): Promise<CloudResult<boolean>>
}

export interface CloudPublishingApi {
  getPublication(id: string): Promise<CloudResult<CloudPublication | null>>
  listPublications(page: CloudPublicationPageRequest): Promise<CloudResult<CloudPage<CloudPublication>>>
  upsertPublication(publication: CloudPublicationWrite): Promise<CloudResult<CloudPublication>>
  upsertPublicationHierarchy(publications: CloudPublicationWrite[]): Promise<CloudResult<CloudPublication[]>>
  deletePublication(id: string): Promise<CloudResult<void>>
  subscribeToPublication(id: string, listener: (publication: CloudPublication | null) => void): CloudSubscription
}

export interface CloudCommentsApi {
  listComments(notaId: string, page: CloudCommentPageRequest): Promise<CloudResult<CloudPage<CloudComment>>>
  createComment(comment: Omit<CloudComment, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'dislikeCount' | 'replyCount' | 'isOwner' | 'userVote'>): Promise<CloudResult<CloudComment>>
  updateComment(id: string, content: CloudComment['content']): Promise<CloudResult<CloudComment>>
  deleteComment(id: string): Promise<CloudResult<void>>
  getVote(commentId: string): Promise<CloudResult<VoteKind | null>>
  vote(commentId: string, vote: VoteKind): Promise<CloudResult<CloudVoteResult>>
}

export interface CloudStatisticsApi {
  getPublicationStats(notaId: string): Promise<CloudResult<CloudPublicationStats | null>>
  getVote(notaId: string): Promise<CloudResult<VoteKind | null>>
  recordView(notaId: string, referrer?: string | null): Promise<CloudResult<Pick<CloudPublicationStats, 'viewCount' | 'uniqueViewers'>>>
  vote(notaId: string, vote: VoteKind): Promise<CloudResult<CloudVoteResult>>
  recordClone(notaId: string): Promise<CloudResult<number>>
}

export interface CloudNewsletterApi {
  subscribe(email: string, displayName?: string | null): Promise<CloudResult<void>>
  unsubscribe(): Promise<CloudResult<void>>
}

export interface CloudAnalyticsApi {
  track(event: string, properties?: Record<string, string | number | boolean | null>): void
}

/** The sole provider-neutral boundary for cloud-backed product behavior. */
export interface CloudApi {
  readonly auth: CloudAuthApi
  readonly profiles: CloudProfilesApi
  readonly publishing: CloudPublishingApi
  readonly comments: CloudCommentsApi
  readonly statistics: CloudStatisticsApi
  readonly newsletter: CloudNewsletterApi
  readonly analytics: CloudAnalyticsApi
}
