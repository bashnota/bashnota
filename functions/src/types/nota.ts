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
}
