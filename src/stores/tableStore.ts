import { defineStore } from 'pinia'
import { openDB, type DBSchema } from 'idb'
import type { TableData } from '@/components/editor/extensions/TableExtension'

interface NotaDBSchema extends DBSchema {
  tables: {
    key: string
    value: TableData
    indexes: {
      'by-nota': string
    }
  }
}

export const useTableStore = defineStore('table', {
  state: () => ({
    db: null as any,
  }),

  actions: {
    async initDB() {
      if (this.db) return

      this.db = await openDB<NotaDBSchema>('nota-db', 1, {
        upgrade(db) {
          const tableStore = db.createObjectStore('tables', {
            keyPath: 'id',
          })
          tableStore.createIndex('by-nota', 'notaId')
        },
      })
    },

    async createTable(table: TableData & { notaId: string }) {
      await this.initDB()
      await this.db.put('tables', table)
      return table
    },

    async getTable(id: string) {
      await this.initDB()
      return await this.db.get('tables', id)
    },

    async updateTable(table: TableData) {
      await this.initDB()
      await this.db.put('tables', table)
    },

    async deleteTable(id: string) {
      await this.initDB()
      await this.db.delete('tables', id)
    },

    async getTablesByNota(notaId: string) {
      await this.initDB()
      return await this.db.getAllFromIndex('tables', 'by-nota', notaId)
    },
  },
}) 