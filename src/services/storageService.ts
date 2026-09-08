/**
 * Storage Service - Unified storage abstraction layer
 * 
 * Provides a unified interface for storing and retrieving data
 * with automatic backend selection (File System API, IndexedDB, or Memory)
 */

import type { Nota } from '@/features/nota/types/nota'
import { logger } from './logger'

export type StorageBackendType = 'filesystem' | 'indexeddb' | 'memory'
export const StorageBackendTypes = {
  FILESYSTEM: 'filesystem' as const,
  INDEXEDDB: 'indexeddb' as const,
  MEMORY: 'memory' as const
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** A storage authority failed to return its nota library. */
export class StorageReadError extends Error {
  readonly backend: StorageBackendType
  readonly cause: unknown

  constructor(backend: StorageBackendType, cause: unknown) {
    const backendName = backend === 'indexeddb' ? 'IndexedDB' : backend
    super(
      `Unable to read the nota library from ${backendName}. `
      + `Check storage access and retry. ${errorMessage(cause)}`,
    )
    this.name = 'StorageReadError'
    this.backend = backend
    this.cause = cause
  }
}

/** Initialization failed without activating a different storage authority. */
export class StorageInitializationError extends Error {
  readonly requestedBackend?: StorageBackendType
  readonly failures: ReadonlyArray<{ backend: string; error: unknown }>

  constructor(
    requestedBackend: StorageBackendType | undefined,
    failures: ReadonlyArray<{ backend: string; error: unknown }>,
  ) {
    const detail = failures.map(({ backend, error }) => `${backend}: ${errorMessage(error)}`).join('; ')
    super(requestedBackend
      ? `The selected ${requestedBackend} storage backend is unavailable. No fallback was activated.${detail ? ` ${detail}` : ''}`
      : `No storage backend is available.${detail ? ` ${detail}` : ''}`)
    this.name = 'StorageInitializationError'
    this.requestedBackend = requestedBackend
    this.failures = failures
  }
}

/**
 * Storage backend interface that all backends must implement
 */
export interface IStorageBackend {
  readonly type: StorageBackendType
  
  initialize(): Promise<void>
  
  // Nota operations
  readNota(notaId: string): Promise<Nota | null>
  writeNota(nota: Nota): Promise<void>
  deleteNota(notaId: string): Promise<void>
  listNotas(): Promise<Nota[]>
  clearAll(): Promise<void>
  
  // Health check
  isAvailable(): Promise<boolean>
}

/**
 * Memory-based storage backend (for testing and fallback)
 */
export class MemoryBackend implements IStorageBackend {
  readonly type: StorageBackendType = 'memory'
  private notas: Map<string, Nota> = new Map()
  private initialized = false

  async initialize(): Promise<void> {
    this.notas.clear()
    this.initialized = true
    logger.info('[MemoryBackend] Initialized')
  }

  async isAvailable(): Promise<boolean> {
    return true
  }

  async readNota(notaId: string): Promise<Nota | null> {
    this.ensureInitialized()
    const nota = this.notas.get(notaId)
    return nota ? { ...nota } : null
  }

  async writeNota(nota: Nota): Promise<void> {
    this.ensureInitialized()
    this.validateNota(nota)
    
    // Clone to avoid reference issues
    this.notas.set(nota.id, { ...nota })
    logger.debug(`[MemoryBackend] Wrote nota: ${nota.id}`)
  }

  async deleteNota(notaId: string): Promise<void> {
    this.ensureInitialized()
    this.notas.delete(notaId)
    logger.debug(`[MemoryBackend] Deleted nota: ${notaId}`)
  }

  async listNotas(): Promise<Nota[]> {
    this.ensureInitialized()
    return Array.from(this.notas.values()).map(nota => ({ ...nota }))
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized()
    this.notas.clear()
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MemoryBackend not initialized. Call initialize() first.')
    }
  }

  private validateNota(nota: Nota): void {
    if (!nota.id) {
      throw new Error('Nota must have an id')
    }
    if (typeof nota.title !== 'string') {
      throw new Error('Nota must have a title')
    }
  }
}

/**
 * IndexedDB-based storage backend (wraps existing Dexie implementation)
 */
export class IndexedDBBackend implements IStorageBackend {
  readonly type: StorageBackendType = 'indexeddb'
  private db: any = null

  async initialize(): Promise<void> {
    try {
      // Import existing Dexie DB
      const { db } = await import('@/db')
      this.db = db
      logger.info('[IndexedDBBackend] Initialized with existing Dexie DB')
    } catch (error) {
      logger.error('[IndexedDBBackend] Failed to initialize:', error)
      throw new Error('Failed to initialize IndexedDB backend')
    }
  }

  async isAvailable(): Promise<boolean> {
    return 'indexedDB' in window
  }

  async readNota(notaId: string): Promise<Nota | null> {
    try {
      const nota = await this.db.notas.get(notaId)
      return nota || null
    } catch (error) {
      logger.error(`[IndexedDBBackend] Failed to read nota ${notaId}:`, error)
      return null
    }
  }

  async writeNota(nota: Nota): Promise<void> {
    try {
      await this.db.notas.put(nota)
      logger.debug(`[IndexedDBBackend] Wrote nota: ${nota.id}`)
    } catch (error) {
      logger.error(`[IndexedDBBackend] Failed to write nota ${nota.id}:`, error)
      throw error
    }
  }

  async deleteNota(notaId: string): Promise<void> {
    try {
      await this.db.notas.delete(notaId)
      logger.debug(`[IndexedDBBackend] Deleted nota: ${notaId}`)
    } catch (error) {
      logger.error(`[IndexedDBBackend] Failed to delete nota ${notaId}:`, error)
      throw error
    }
  }

  async listNotas(): Promise<Nota[]> {
    try {
      const notas = await this.db.notas.toArray()
      return notas
    } catch (error) {
      logger.error('[IndexedDBBackend] Failed to list notas:', error)
      throw new StorageReadError(this.type, error)
    }
  }

  async clearAll(): Promise<void> {
    await this.db.notas.clear()
  }
}

/**
 * Unified Storage Service
 * 
 * Automatically selects the best available backend and provides
 * a consistent interface for storage operations
 */
export class StorageService {
  private backend: IStorageBackend | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Adopt a backend that has already been initialized and verified by a
   * migration. This avoids reopening the filesystem directory between target
   * verification and the authority swap.
   */
  useInitializedBackend(backend: IStorageBackend): void {
    this.backend = backend
    this.initPromise = Promise.resolve()
  }

  /**
   * Initialize the storage service with optional preferred backend
   */
  async initialize(preferredBackend?: StorageBackendType): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this.doInitialize(preferredBackend)
    return this.initPromise
  }

  private async doInitialize(preferredBackend?: StorageBackendType): Promise<void> {
    logger.info('[StorageService] Initializing...', { preferredBackend })

    // Dynamically import FileSystemBackend to avoid issues in test environment
    let FileSystemBackend: any = null
    try {
      const fsModule = await import('./fileSystemBackend')
      FileSystemBackend = fsModule.FileSystemBackend
    } catch (error) {
      logger.debug('[StorageService] FileSystemBackend not available')
    }

    // Determine backend order based on preference
    let backends: any[]
    
    if (preferredBackend === 'filesystem') {
      if (!FileSystemBackend) {
        throw new Error('Filesystem storage was selected, but its backend could not be loaded.')
      }
      // Explicit preferences are authoritative. Never expose another backend
      // under the selected mode, because that can strand writes.
      backends = [FileSystemBackend]
    } else if (preferredBackend === 'indexeddb') {
      backends = [IndexedDBBackend]
    } else {
      // Auto-select (default behavior)
      // Only try FileSystemBackend if a persisted handle exists
      let shouldTryFileSystem = false
      if (FileSystemBackend) {
        try {
          shouldTryFileSystem = await FileSystemBackend.hasPersistedHandle()
          logger.debug('[StorageService] FileSystemBackend persisted handle check:', shouldTryFileSystem)
        } catch (error) {
          logger.debug('[StorageService] Failed to check for persisted handle:', error)
        }
      }
      
      backends = [
        shouldTryFileSystem ? FileSystemBackend : null,  // Try filesystem only if handle exists
        IndexedDBBackend,   // Fallback: IndexedDB
        MemoryBackend       // Last resort: In-memory
      ].filter(Boolean)
    }

    const failures: Array<{ backend: string; error: unknown }> = []
    for (const BackendClass of backends) {
      try {
        const backend = new BackendClass()
        
        // Check if backend is available
        const isAvailable = await backend.isAvailable()
        if (!isAvailable) {
          logger.debug(`[StorageService] ${backend.type} backend not available`)
          failures.push({ backend: backend.type, error: new Error('not available in this browser') })
          continue
        }

        // Try to initialize
        await backend.initialize()
        this.backend = backend
        
        logger.info(`[StorageService] Initialized with ${backend.type} backend`)
        return
      } catch (error) {
        const backendName = BackendClass?.name ?? preferredBackend ?? 'backend'
        failures.push({ backend: backendName, error })
        logger.warn(`[StorageService] Failed to initialize ${backendName}:`, error)
        continue
      }
    }

    throw new StorageInitializationError(preferredBackend, failures)
  }

  /**
   * Get the type of the current backend
   */
  getBackendType(): StorageBackendType {
    if (!this.backend) {
      throw new Error('Storage service not initialized')
    }
    return this.backend.type
  }

  getBackend(): IStorageBackend {
    if (!this.backend) throw new Error('Storage service not initialized')
    return this.backend
  }

  /**
   * Read a nota by ID
   */
  async readNota(notaId: string): Promise<Nota | null> {
    await this.ensureInitialized()
    return this.backend!.readNota(notaId)
  }

  /**
   * Write a nota
   */
  async writeNota(nota: Nota): Promise<void> {
    await this.ensureInitialized()
    return this.backend!.writeNota(nota)
  }

  /**
   * Delete a nota
   */
  async deleteNota(notaId: string): Promise<void> {
    await this.ensureInitialized()
    return this.backend!.deleteNota(notaId)
  }

  /**
   * List all notas
   */
  async listNotas(): Promise<Nota[]> {
    await this.ensureInitialized()
    return this.backend!.listNotas()
  }

  /**
   * Write multiple notas in batch
   */
  async writeMany(notas: Nota[]): Promise<void> {
    await this.ensureInitialized()
    // Execute all writes concurrently
    await Promise.all(notas.map(nota => this.backend!.writeNota(nota)))
  }

  /**
   * Read multiple notas in batch
   */
  async readMany(notaIds: string[]): Promise<(Nota | null)[]> {
    await this.ensureInitialized()
    // Execute all reads concurrently
    return Promise.all(notaIds.map(id => this.backend!.readNota(id)))
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.backend) {
      await this.initialize()
    }
  }
}

// Export singleton instance
export const storageService = new StorageService()
