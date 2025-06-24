import Dexie, { type Table } from 'dexie'
import type { Nota } from '@/types/nota'
import type { FavoriteBlock } from '@/types/nota'
import type { AIConversation } from '@/stores/aiConversationStore'

export class NotaDB extends Dexie {
  notas!: Table<Nota>
  favoriteBlocks!: Table<FavoriteBlock>
  conversations!: Table<AIConversation>

  constructor() {
    super('notaDB')
    // Version 4: Add versions array to existing records
    this.version(4).stores({
      notas: '++id, title, parentId, tags, favorite, updatedAt',
      favoriteBlocks: '++id, name, type, tags, createdAt'
    }).upgrade(tx => {
      return tx.table('notas').toCollection().modify(nota => {
        if (!nota.versions) {
          nota.versions = []
        }
      })
    })
    
    // Version 5: Add conversations table
    this.version(5).stores({
      notas: '++id, title, parentId, tags, favorite, updatedAt',
      favoriteBlocks: '++id, name, type, tags, createdAt',
      conversations: '++id, notaId, blockId, createdAt, updatedAt'
    })
  }
}

export const db = new NotaDB()
