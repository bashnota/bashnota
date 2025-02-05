import Dexie from 'dexie'
import type { Table } from 'dexie'

export interface Nota {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface Page {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export class NotaDB extends Dexie {
  notas!: Table<Nota>
  pages!: Table<Page>

  constructor() {
    super('notadb')
    this.version(1).stores({
      notas: 'id, title, createdAt, updatedAt',
      pages: 'id, title, createdAt, updatedAt'
    })
  }
}

export const db = new NotaDB() 