import Dexie, { type Table } from 'dexie'
import type { Nota } from '@/types/nota'

export class NotaDB extends Dexie {
  notas!: Table<Nota>

  constructor() {
    super('notaDB')
    this.version(2).stores({
      notas: '++id, title, parentId, tags, favorite, updatedAt',
    })
  }
}

export const db = new NotaDB()
