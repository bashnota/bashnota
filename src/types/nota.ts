import type { NotaConfig } from './jupyter'

export enum DocumentType {
  PAGE = 'page',
  NOTA = 'nota',
}

interface BaseDocument {
  id: string
  title: string
  content: string
  createdAt: Date | string
  updatedAt: Date | string
  type: DocumentType
}

export interface Page extends BaseDocument {
  parentId: string | null
  children: string[]
  type: DocumentType.PAGE
}

export interface Nota extends BaseDocument {
  pages: string[]
  type: DocumentType.NOTA
  config?: NotaConfig
}
