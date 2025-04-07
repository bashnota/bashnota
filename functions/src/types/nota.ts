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
