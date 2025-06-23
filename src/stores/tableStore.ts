import { defineStore } from 'pinia'
import { openDB, type DBSchema } from 'idb'
import type { TableData } from '@/components/editor/blocks/table-block/TableExtension'

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
    initialized: false,
    error: null as Error | null,
  }),

  actions: {
    async initDB() {
      if (this.initialized) return

      try {
        this.db = await openDB<NotaDBSchema>('nota-db', 1, {
          upgrade(db) {
            // Check if store already exists
            if (!db.objectStoreNames.contains('tables')) {
              const tableStore = db.createObjectStore('tables', {
                keyPath: 'id',
              })
              tableStore.createIndex('by-nota', 'notaId')
            }
          },
        })
        this.initialized = true
        this.error = null
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Unknown error initializing database')
        throw this.error
      }
    },

    async createTable(table: TableData & { notaId: string }) {
      try {
        await this.initDB()
        await this.db.put('tables', table)
        return table
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to create table')
        throw this.error
      }
    },

    async getTable(id: string) {
      try {
        await this.initDB()
        const table = await this.db.get('tables', id)
        return table
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to get table')
        throw this.error
      }
    },

    async updateTable(table: TableData) {
      try {
        await this.initDB()
        await this.db.put('tables', table)
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to update table')
        throw this.error
      }
    },

    async deleteTable(id: string) {
      try {
        await this.initDB()
        await this.db.delete('tables', id)
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to delete table')
        throw this.error
      }
    },

    async getTablesByNota(notaId: string) {
      try {
        await this.initDB()
        const tables = await this.db.getAllFromIndex('tables', 'by-nota', notaId)
        return tables
      } catch (err) {
        this.error = err instanceof Error ? err : new Error('Failed to get tables by nota')
        throw this.error
      }
    },
  },
}) 