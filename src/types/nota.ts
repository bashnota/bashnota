import type { NotaConfig } from './jupyter'

export interface Page {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  parentId: string | null
  children: string[]
  type: 'page'
}

export interface Nota {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  pages: string[]
  type: 'nota'
  config?: NotaConfig
}

export interface StoredNota {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  pages: string[]
  type: 'nota'
  config?: {
    jupyterServers: Array<{
      ip: string
      port: string
      token: string
    }>
    notebooks: Array<{
      notebook: string
      server: string
      kernel: string
    }>
    kernels: Record<string, string[]>
  }
}

export interface StoredPage {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  parentId: string | null
  children: string[]
  type: 'page'
}
