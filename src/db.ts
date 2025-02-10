import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { Nota } from './types/nota'

export class NotaDB extends Dexie {
  notas!: Table<Nota>

  constructor() {
    super('notadb')
    this.version(1).stores({
      notas: 'id, title, createdAt, updatedAt',
    })
  }
}

export const db = new NotaDB()
