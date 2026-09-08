import type { NotaConfig } from '@/features/jupyter/types/jupyter'
import type { NotaBlockStructure } from './blocks';
import type { CloudPublishedContent } from '@/services/cloud/types'

export interface CanonicalBlockSnapshot {
  id: string | number
  type: string
  order: number
  notaId: string
  createdAt: string
  updatedAt: string
  version: number
  [key: string]: unknown
}

/**
 * A historical copy of the canonical normalized block records. This deliberately
 * uses the same records and composite ordering as the live block tables instead
 * of introducing another editor-JSON content representation.
 */
export interface CanonicalNotaContentSnapshot {
  format: 'normalized-blocks-v1'
  blockOrder: string[]
  blocks: CanonicalBlockSnapshot[]
  structureId?: string | number
  structureVersion: number
  capturedAt: string
}

export interface Nota {
  id: string
  title: string
  // Block-based content structure - store just the ID for efficient lookup
  blockStructureId?: string | number
  // Block structure for the nota
  blockStructure?: NotaBlockStructure
  parentId: string | null
  config?: NotaConfig
  favorite?: boolean
  createdAt: Date | string
  updatedAt: Date | string
  tags: string[]
  versions?: NotaVersion[]
  isPublished?: boolean
  publishedAt?: string | null
  citations?: CitationEntry[]
}

export interface NotaVersion {
  id: string
  notaId: string
  // Historical metadata only. History and block structure are stored once, in
  // the containing nota and canonicalContent respectively.
  nota: Omit<Nota, 'versions' | 'blockStructure'>
  canonicalContent?: CanonicalNotaContentSnapshot
  versionName: string
  createdAt: Date | string
}

export type RestoreVersionResult =
  | { kind: 'canonical'; message: string }
  | { kind: 'legacy-metadata-only'; message: string }
export interface FavoriteBlock {
  id: string
  name: string
  content: any // Tiptap JSON content structure
  type: string
  tags: string[]
  createdAt: Date | string
}

export interface PublishedNota {
  id: string
  title: string
  content: CloudPublishedContent | null
  updatedAt: string
  publishedAt: string
  authorId?: string
  authorName: string
  authorTag?: string | null
  isPublic: boolean
  isSubPage?: boolean
  parentId?: string | null
  publishedSubPages?: string[]
  citations?: CitationEntry[]
  // Statistics fields
  viewCount?: number
  uniqueViewers?: number
  lastViewedAt?: string
  referrers?: {[source: string]: number}
  tags?: string[]
  stats?: {
    dailyViews?: {[date: string]: number}
    weeklyViews?: {[week: string]: number}
    monthlyViews?: {[month: string]: number}
  }
  // Voting fields
  likeCount?: number
  dislikeCount?: number
  cloneCount?: number
  // Comment counts
  commentCount?: number
}

// User votes tracking
export interface NotaVote {
  notaId: string
  userId: string
  voteType: 'like' | 'dislike'
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CitationEntry {
  id: string
  key: string
  title: string
  authors: string[]
  year: string
  journal?: string
  volume?: string
  number?: string
  pages?: string
  publisher?: string
  url?: string
  doi?: string
  createdAt: Date | string
}

// Comment interfaces for public notas
export interface Comment {
  id: string
  notaId: string
  content: any // Tiptap JSON content structure
  authorId: string
  authorName: string
  authorTag?: string
  createdAt: string
  updatedAt: string
  parentId: string | null
  likeCount: number
  dislikeCount: number
  replyCount: number
  // Map of user votes (userId: 'like' | 'dislike')
  votes?: Record<string, 'like' | 'dislike'>
  isOwner?: boolean
  canDelete?: boolean
  userVote?: 'like' | 'dislike' | null
}

export interface CommentVote {
  commentId: string
  userId: string
  voteType: 'like' | 'dislike'
  createdAt: string
}

