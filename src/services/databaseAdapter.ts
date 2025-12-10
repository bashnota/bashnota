import { db } from '@/db'
import { StorageService } from './storageService'
import type { Nota } from '@/features/nota/types/nota'
import type { IStorageBackend } from './storageService'

/**
 * DatabaseAdapter bridges the old Dexie database API with the new StorageService
 * This allows gradual migration without breaking existing functionality
 */
export class DatabaseAdapter {
  private storage: StorageService
  private useNewStorage: boolean

  constructor(storage: StorageService, useNewStorage = false) {
    this.storage = storage
    this.useNewStorage = useNewStorage
  }

  /**
   * Get a nota by ID
   * Routes to new storage or old Dexie DB based on feature flag
   */
  async getNota(id: string): Promise<Nota | undefined> {
    if (this.useNewStorage) {
      return await this.storage.readNota(id)
    }
    return await db.notas.get(id)
  }

  /**
   * Get all notas
   */
  async getAllNotas(): Promise<Nota[]> {
    if (this.useNewStorage) {
      return await this.storage.listNotas()
    }
    return await db.notas.toArray()
  }

  /**
   * Add or update a nota
   */
  async saveNota(nota: Nota): Promise<void> {
    if (this.useNewStorage) {
      await this.storage.writeNota(nota)
    } else {
      await db.notas.put(nota)
    }
  }

  /**
   * Delete a nota
   */
  async deleteNota(id: string): Promise<void> {
    if (this.useNewStorage) {
      await this.storage.deleteNota(id)
    } else {
      await db.notas.delete(id)
    }
  }

  /**
   * Batch operations
   */
  async saveNotas(notas: Nota[]): Promise<void> {
    if (this.useNewStorage) {
      await this.storage.writeMany(notas)
    } else {
      await db.notas.bulkPut(notas)
    }
  }

  /**
   * Toggle between old and new storage
   */
  setUseNewStorage(use: boolean): void {
    this.useNewStorage = use
  }

  /**
   * Check if using new storage
   */
  isUsingNewStorage(): boolean {
    return this.useNewStorage
  }

  /**
   * Get the underlying storage service (for direct access if needed)
   */
  getStorageService(): StorageService {
    return this.storage
  }
}

/**
 * Global database adapter instance
 * Will be initialized in main.ts
 */
export let dbAdapter: DatabaseAdapter | null = null

/**
 * Initialize the database adapter
 */
export async function initializeDatabaseAdapter(
  useNewStorage = false
): Promise<DatabaseAdapter> {
  const storage = new StorageService()
  await storage.initialize()
  
  dbAdapter = new DatabaseAdapter(storage, useNewStorage)
  return dbAdapter
}

/**
 * Get the database adapter instance
 * Throws if not initialized
 */
export function useDatabaseAdapter(): DatabaseAdapter {
  if (!dbAdapter) {
    throw new Error('DatabaseAdapter not initialized. Call initializeDatabaseAdapter() first.')
  }
  return dbAdapter
}
