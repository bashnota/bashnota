import Dexie, { type Table } from 'dexie'
import type { Nota } from '@/types/nota'

export class NotaDB extends Dexie {
  notas!: Table<Nota>

  constructor() {
    super('notaDB')
    this.version(3).stores({
      notas: '++id, title, parentId, tags, favorite, updatedAt'
    }).upgrade(tx => {
      // Add versions array to existing records
      return tx.table('notas').toCollection().modify(nota => {
        if (!nota.versions) {
          nota.versions = []
        }
      })
    })
  }
}

export const db = new NotaDB()
