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
}

export interface NotaVersion {
  id: string
  notaId: string
  content: string
  versionName: string
  createdAt: Date | string
}
