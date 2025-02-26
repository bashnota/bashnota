import Dexie, { type Table } from 'dexie'
import type { Nota } from '@/types/nota'
import type { FavoriteBlock } from '@/types/nota'

export class NotaDB extends Dexie {
  notas!: Table<Nota>
  favoriteBlocks!: Table<FavoriteBlock>

  constructor() {
    super('notaDB')
    this.version(4).stores({
      notas: '++id, title, parentId, tags, favorite, updatedAt',
      favoriteBlocks: '++id, name, type, tags, createdAt'
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
