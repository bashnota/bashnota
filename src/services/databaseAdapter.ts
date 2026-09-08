import { db } from '@/db'
import { StorageService, type IStorageBackend } from './storageService'
import type { Nota } from '@/features/nota/types/nota'

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
      const result = await this.storage.readNota(id)
      return result ?? undefined
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
    await withDatabaseMutation(() => {
      const authority = dbAdapter
      return authority && authority !== this
        ? authority.saveNotaWithinMutation(nota)
        : this.saveNotaWithinMutation(nota)
    })
  }

  /** Save while the caller already owns the global/per-nota mutation guard. */
  async saveNotaWithinMutation(nota: Nota): Promise<void> {
    if (this.useNewStorage) await this.storage.writeNota(nota)
    else await db.notas.put(nota)
  }

  /**
   * Delete a nota
   */
  async deleteNota(id: string): Promise<void> {
    await withDatabaseMutation(async () => {
      const authority = dbAdapter
      if (authority && authority !== this) await authority.deleteNotaWithinMutation(id)
      else await this.deleteNotaWithinMutation(id)
    })
  }

  async deleteNotaWithinMutation(id: string): Promise<void> {
    if (this.useNewStorage) await this.storage.deleteNota(id)
    else await db.notas.delete(id)
  }

  /**
   * Batch operations
   */
  async saveNotas(notas: Nota[]): Promise<void> {
    await withDatabaseMutation(async () => {
      const authority = dbAdapter
      if (authority && authority !== this) await authority.saveNotasWithinMutation(notas)
      else await this.saveNotasWithinMutation(notas)
    })
  }

  async saveNotasWithinMutation(notas: Nota[]): Promise<void> {
    if (this.useNewStorage) await this.storage.writeMany(notas)
    else await db.notas.bulkPut(notas)
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

let authorityTransition: Promise<void> | null = null
let releaseAuthorityTransition: (() => void) | null = null
let transitionQueue: Promise<void> = Promise.resolve()
let activeMutations = 0
const mutationDrainWaiters = new Set<() => void>()
const notaMutationQueues = new Map<string, Promise<unknown>>()

/** Serialize an application mutation against an authority transition. */
export async function withDatabaseMutation<T>(mutation: () => Promise<T>): Promise<T> {
  while (authorityTransition) await authorityTransition
  activeMutations += 1
  try {
    return await mutation()
  } finally {
    activeMutations -= 1
    if (activeMutations === 0) {
      for (const resolve of mutationDrainWaiters) resolve()
      mutationDrainWaiters.clear()
    }
  }
}

/** Serialize the canonical rows, metadata snapshot, file commit, and rollback for one nota. */
export async function withNotaPersistence<T>(notaId: string, mutation: () => Promise<T>): Promise<T> {
  const previous = notaMutationQueues.get(notaId) ?? Promise.resolve()
  const current = previous.catch(() => undefined).then(() => withDatabaseMutation(mutation))
  notaMutationQueues.set(notaId, current)
  try {
    return await current
  } finally {
    if (notaMutationQueues.get(notaId) === current) notaMutationQueues.delete(notaId)
  }
}

/**
 * Block new mutations, drain in-flight ones, and keep the source quiescent
 * until a verified backend has been installed (or migration has rolled back).
 */
export async function runDatabaseAuthorityTransition<T>(transition: () => Promise<T>): Promise<T> {
  const previousTransition = transitionQueue
  let releaseQueue!: () => void
  transitionQueue = new Promise<void>((resolve) => { releaseQueue = resolve })
  await previousTransition

  authorityTransition = new Promise<void>((resolve) => { releaseAuthorityTransition = resolve })
  if (activeMutations > 0) {
    await new Promise<void>((resolve) => mutationDrainWaiters.add(resolve))
  }

  try {
    return await transition()
  } finally {
    releaseAuthorityTransition?.()
    releaseAuthorityTransition = null
    authorityTransition = null
    releaseQueue()
  }
}

/** Build an adapter without publishing it as the process-wide authority. */
export async function createDatabaseAdapter(
  useNewStorage = false,
  preferredBackend?: 'indexeddb' | 'filesystem'
): Promise<DatabaseAdapter> {
  const storage = new StorageService()
  await storage.initialize(preferredBackend)
  const activeBackend = storage.getBackendType()
  // A resolved non-Dexie backend is authoritative regardless of the migration
  // feature flag. Routing it through the legacy branch would make the reported
  // backend disagree with every nota read and write.
  return new DatabaseAdapter(storage, useNewStorage || activeBackend !== 'indexeddb')
}

/** Build an adapter around a migration target that is already verified. */
export function createDatabaseAdapterForBackend(
  backend: IStorageBackend,
  useNewStorage = true,
): DatabaseAdapter {
  const storage = new StorageService()
  storage.useInitializedBackend(backend)
  return new DatabaseAdapter(storage, useNewStorage)
}

/** Atomically replace the process-wide adapter after migration verification. */
export function installDatabaseAdapter(adapter: DatabaseAdapter): void {
  dbAdapter = adapter
}

/**
 * Initialize the database adapter
 */
export async function initializeDatabaseAdapter(
  useNewStorage = false,
  preferredBackend?: 'indexeddb' | 'filesystem'
): Promise<DatabaseAdapter> {
  const adapter = await createDatabaseAdapter(useNewStorage, preferredBackend)
  installDatabaseAdapter(adapter)
  return adapter
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
