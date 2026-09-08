/**
 * Migration Service - Handles data migration between storage backends
 *
 * Migrates data from IndexedDB (Dexie) to FileSystem storage with
 * progress tracking, verification, and rollback capabilities.
 */

import type { Nota } from '@/features/nota/types/nota'
import type { IStorageBackend } from './storageService'
import { logger } from './logger'

export interface MigrationOptions {
  onProgress?: (progress: MigrationProgress) => void
  batchSize?: number // Number of notas to migrate in each batch (default: 10)
  preserveSource?: boolean // Keep source data after migration (default: true)
  signal?: AbortSignal
}

export interface MigrationProgress {
  phase: 'preparing' | 'migrating' | 'verifying' | 'complete' | 'error'
  current: number
  total: number
  currentItem?: string
  errors: MigrationError[]
}

export interface MigrationError {
  notaId: string
  error: string
  phase: string
}

export interface MigrationReport {
  success: boolean
  migratedCount: number
  errorCount: number
  errors: MigrationError[]
  sourceCount: number
  targetCount: number
}

/**
 * Migration Service
 *
 * Handles migration of notas from one storage backend to another
 */
export class MigrationService {
  private backup: Nota[] = []
  private errors: MigrationError[] = []
  private rollbackJournal = new Map<string, Nota | null>()

  constructor(
    private sourceBackend: IStorageBackend,
    private targetBackend: IStorageBackend,
  ) {}

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise<boolean> {
    try {
      const sourceNotas = await this.sourceBackend.listNotas()
      const targetNotas = await this.targetBackend.listNotas()

      // Migration needed if source has notas but target doesn't
      return sourceNotas.length > 0 && targetNotas.length === 0
    } catch (error) {
      logger.error('[MigrationService] Failed to check migration status:', error)
      return false
    }
  }

  /**
   * Perform migration from source to target backend
   */
  async migrate(options: MigrationOptions = {}): Promise<void> {
    const { onProgress, batchSize = 10, preserveSource = true, signal } = options

    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      throw new RangeError('Migration batchSize must be a positive integer')
    }

    this.errors = []
    this.backup = []
    this.rollbackJournal.clear()
    let migratedCount = 0

    try {
      // Phase 1: Preparing
      logger.info('[MigrationService] Starting migration...')
      const sourceNotas = await this.sourceBackend.listNotas()
      const targetNotas = await this.targetBackend.listNotas()
      const originalTargetById = new Map(targetNotas.map((nota) => [nota.id, nota]))
      const total = sourceNotas.length

      if (total === 0) {
        logger.info('[MigrationService] No notas to migrate')
        this.reportProgress(onProgress, {
          phase: 'complete',
          current: 0,
          total: 0,
          errors: [],
        })
        return
      }

      this.reportProgress(onProgress, {
        phase: 'preparing',
        current: 0,
        total,
        errors: [],
      })

      // Backup source data
      if (preserveSource) {
        this.backup = [...sourceNotas]
      }

      // Phase 2: Migrating
      logger.info(`[MigrationService] Migrating ${total} notas in batches of ${batchSize}`)

      for (let i = 0; i < sourceNotas.length; i += batchSize) {
        const batch = sourceNotas.slice(i, Math.min(i + batchSize, sourceNotas.length))

        // Migrate batch
        for (const nota of batch) {
          this.throwIfAborted(signal)

          const validationError = this.validateNota(nota)
          if (validationError) {
            this.errors.push({
              notaId: typeof nota?.id === 'string' ? nota.id : '<invalid>',
              error: validationError,
              phase: 'validation',
            })
            continue
          }

          if (!this.rollbackJournal.has(nota.id)) {
            this.rollbackJournal.set(nota.id, originalTargetById.get(nota.id) ?? null)
          }

          try {
            await this.targetBackend.writeNota(nota)
            migratedCount++

            this.reportProgress(onProgress, {
              phase: 'migrating',
              current: migratedCount,
              total,
              currentItem: nota.title,
              errors: this.errors,
            })
          } catch (error: any) {
            const migrationError: MigrationError = {
              notaId: nota.id,
              error: error.message || 'Unknown error',
              phase: 'migration',
            }
            this.errors.push(migrationError)
            logger.error(`[MigrationService] Failed to migrate nota ${nota.id}:`, error)
          }
        }
      }

      // Phase 3: Complete
      if (this.errors.length > 0) {
        logger.warn(`[MigrationService] Migration completed with ${this.errors.length} errors`)
      } else {
        logger.info('[MigrationService] Migration completed successfully')
      }

      this.reportProgress(onProgress, {
        phase: 'complete',
        current: migratedCount,
        total,
        errors: this.errors,
      })
    } catch (error) {
      logger.error('[MigrationService] Migration failed:', error)
      this.reportProgress(onProgress, {
        phase: 'error',
        current: migratedCount,
        total: 0,
        errors: this.errors,
      })
      throw error
    }
  }

  /**
   * Verify migration integrity
   */
  async verify(): Promise<MigrationReport> {
    try {
      const sourceNotas = await this.sourceBackend.listNotas()
      const targetNotas = await this.targetBackend.listNotas()

      const sourceCount = sourceNotas.length
      const targetCount = targetNotas.length
      const targetIds = new Set(targetNotas.map((nota) => nota.id))
      const migratedCount = sourceNotas.filter((nota) => targetIds.has(nota.id)).length
      const errorCount = this.errors.length

      const success = migratedCount === sourceCount && errorCount === 0

      logger.info(
        `[MigrationService] Verification: ${sourceCount} source, ${targetCount} target, ${errorCount} errors`,
      )

      return {
        success,
        migratedCount,
        errorCount,
        errors: this.errors,
        sourceCount,
        targetCount,
      }
    } catch (error) {
      logger.error('[MigrationService] Verification failed:', error)
      return {
        success: false,
        migratedCount: 0,
        errorCount: this.errors.length,
        errors: this.errors,
        sourceCount: 0,
        targetCount: 0,
      }
    }
  }

  /**
   * Rollback migration (delete target data)
   */
  async rollback(): Promise<void> {
    try {
      logger.warn('[MigrationService] Rolling back migration...')

      for (const [notaId, originalNota] of this.rollbackJournal) {
        try {
          if (originalNota) {
            await this.targetBackend.writeNota(originalNota)
          } else {
            await this.targetBackend.deleteNota(notaId)
          }
        } catch (error) {
          logger.error(
            `[MigrationService] Failed to restore nota ${notaId} during rollback:`,
            error,
          )
        }
      }

      this.rollbackJournal.clear()

      logger.info('[MigrationService] Rollback completed')
    } catch (error) {
      logger.error('[MigrationService] Rollback failed:', error)
      throw error
    }
  }

  /**
   * Get backup of source data
   */
  getBackup(): Nota[] {
    return [...this.backup]
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    callback: ((progress: MigrationProgress) => void) | undefined,
    progress: MigrationProgress,
  ): void {
    if (callback) {
      callback(progress)
    }
  }

  private throwIfAborted(signal: AbortSignal | undefined): void {
    if (!signal?.aborted) return

    const error = new Error('Migration interrupted')
    error.name = 'AbortError'
    throw error
  }

  private validateNota(nota: Nota): string | null {
    if (!nota || typeof nota !== 'object') return 'Nota must be an object'
    if (typeof nota.id !== 'string' || nota.id.trim() === '')
      return 'Nota id must be a non-empty string'
    if (typeof nota.title !== 'string') return 'Nota title must be a string'
    if (!Array.isArray(nota.tags) || nota.tags.some((tag) => typeof tag !== 'string')) {
      return 'Nota tags must be an array of strings'
    }
    if (nota.parentId !== null && typeof nota.parentId !== 'string') {
      return 'Nota parentId must be a string or null'
    }
    if (!this.isValidDate(nota.createdAt) || !this.isValidDate(nota.updatedAt)) {
      return 'Nota timestamps must be valid dates'
    }
    return null
  }

  private isValidDate(value: Date | string): boolean {
    return (
      (value instanceof Date || typeof value === 'string') &&
      !Number.isNaN(new Date(value).getTime())
    )
  }
}
