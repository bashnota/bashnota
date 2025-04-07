import type { NotaConfig } from './jupyter'

export interface Nota {
  id: string
  title: string
  content: string | null
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
  content: string
  versionName: string
  createdAt: Date | string
}
export interface FavoriteBlock {
  id: string
  name: string
  content: string
  type: string
  tags: string[]
  createdAt: Date | string
}

export interface PublishedNota {
  id: string
  title: string
  content: string | null
  updatedAt: string
  publishedAt: string
  authorId: string
  authorName: string
  isPublic: boolean
  isSubPage?: boolean
  parentId?: string | null
  publishedSubPages?: string[]
  citations?: CitationEntry[]
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
