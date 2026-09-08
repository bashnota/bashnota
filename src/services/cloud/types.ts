/** Provider-neutral values exposed to product code. */
export type CloudTimestamp = string
export type CloudJson = string | number | boolean | null | { [key: string]: CloudJson } | CloudJson[]
/** Canonical provider-neutral representation of a published ProseMirror doc. */
export type CloudPublishedContent = { [key: string]: CloudJson }
export type VoteKind = 'like' | 'dislike'

export interface CloudUser {
  id: string
  email: string | null
  displayName: string | null
  photoUrl: string | null
  emailVerified: boolean
  createdAt: CloudTimestamp | null
  lastSignInAt: CloudTimestamp | null
}

export interface CloudSession {
  user: CloudUser
  accessToken: string | null
  expiresAt: CloudTimestamp | null
}

export interface CloudProfile {
  userId: string
  userTag: string
  displayName: string
  photoUrl: string
  updatedAt: CloudTimestamp
}

export interface CloudPublication {
  id: string
  /** Private ownership identity. Public projections deliberately omit it. */
  authorId?: string
  title: string
  content: CloudPublishedContent | null
  authorName: string
  isPublic: boolean
  isSubPage: boolean
  parentId: string | null
  tags: string[]
  citations: CloudJson[]
  publishedAt: CloudTimestamp
  updatedAt: CloudTimestamp
  authorTag?: string | null
  publishedSubPages?: string[]
  viewCount?: number
  uniqueViewers?: number
  likeCount?: number
  dislikeCount?: number
  cloneCount?: number
  commentCount?: number
  lastViewedAt?: CloudTimestamp | null
}

export type CloudPublicationWrite = Omit<CloudPublication, 'authorId'> & { authorId: string }

/** Accept one legacy JSON string at provider/UI ingress, never double-parse. */
export function normalizeCloudPublishedContent(value: unknown): CloudPublishedContent | null {
  let candidate = value
  if (typeof candidate === 'string') {
    try { candidate = JSON.parse(candidate) } catch { return null }
  }
  return candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate as CloudPublishedContent : null
}

export interface CloudComment {
  id: string
  notaId: string
  /** Private provider identity is absent from public Supabase projections. */
  authorId?: string
  authorName: string
  authorTag: string | null
  content: CloudJson
  parentId: string | null
  createdAt: CloudTimestamp
  updatedAt: CloudTimestamp
  likeCount: number
  dislikeCount: number
  replyCount: number
  isOwner?: boolean
  /** Caller-specific deletion capability; does not reveal either private owner ID. */
  canDelete?: boolean
  userVote?: VoteKind | null
}

export interface CloudVoteResult {
  likeCount: number
  dislikeCount: number
  userVote: VoteKind | null
}

export interface CloudPublicationStats {
  viewCount: number
  uniqueViewers: number
  likeCount: number
  dislikeCount: number
  cloneCount: number
  commentCount: number
  lastViewedAt: CloudTimestamp | null
}

export interface CloudPage<T> {
  items: T[]
  nextCursor: string | null
  totalCount?: number
}

export interface CloudPageRequest {
  limit: number
  cursor?: string | null
}

export interface CloudCommentPageRequest extends CloudPageRequest {
  parentId?: string | null
}

export interface CloudPublicationPageRequest extends CloudPageRequest {
  authorId?: string | null
  authorTag?: string | null
  ownerOnly?: boolean
}

export interface CloudSubscription {
  unsubscribe(): void
}

export type CloudResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CloudError }

/** Stable errors callers may branch on, independent of any backend SDK. */
export class CloudError extends Error {
  constructor(
    public readonly code: 'unauthenticated' | 'forbidden' | 'not-found' | 'conflict' | 'invalid' | 'unavailable' | 'unknown',
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'CloudError'
  }
}

export const cloudNow = (): CloudTimestamp => new Date().toISOString()
