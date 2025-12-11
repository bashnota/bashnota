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
  batchSize?: number  // Number of notas to migrate in each batch (default: 10)
  preserveSource?: boolean  // Keep source data after migration (default: true)
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

  constructor(
    private sourceBackend: IStorageBackend,
    private targetBackend: IStorageBackend
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
    const {
      onProgress,
      batchSize = 10,
      preserveSource = true
    } = options

    this.errors = []
    let migratedCount = 0

    try {
      // Phase 1: Preparing
      logger.info('[MigrationService] Starting migration...')
      const sourceNotas = await this.sourceBackend.listNotas()
      const total = sourceNotas.length

      if (total === 0) {
        logger.info('[MigrationService] No notas to migrate')
        this.reportProgress(onProgress, {
          phase: 'complete',
          current: 0,
          total: 0,
          errors: []
        })
        return
      }

      this.reportProgress(onProgress, {
        phase: 'preparing',
        current: 0,
        total,
        errors: []
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
          try {
            await this.targetBackend.writeNota(nota)
            migratedCount++
            
            this.reportProgress(onProgress, {
              phase: 'migrating',
              current: migratedCount,
              total,
              currentItem: nota.title,
              errors: this.errors
            })
          } catch (error: any) {
            const migrationError: MigrationError = {
              notaId: nota.id,
              error: error.message || 'Unknown error',
              phase: 'migration'
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
        errors: this.errors
      })

    } catch (error) {
      logger.error('[MigrationService] Migration failed:', error)
      this.reportProgress(onProgress, {
        phase: 'error',
        current: migratedCount,
        total: 0,
        errors: this.errors
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
      const migratedCount = targetCount
      const errorCount = this.errors.length

      const success = sourceCount === targetCount && errorCount === 0

      logger.info(`[MigrationService] Verification: ${sourceCount} source, ${targetCount} target, ${errorCount} errors`)

      return {
        success,
        migratedCount,
        errorCount,
        errors: this.errors,
        sourceCount,
        targetCount
      }
    } catch (error) {
      logger.error('[MigrationService] Verification failed:', error)
      return {
        success: false,
        migratedCount: 0,
        errorCount: this.errors.length,
        errors: this.errors,
        sourceCount: 0,
        targetCount: 0
      }
    }
  }

  /**
   * Rollback migration (delete target data)
   */
  async rollback(): Promise<void> {
    try {
      logger.warn('[MigrationService] Rolling back migration...')
      
      const targetNotas = await this.targetBackend.listNotas()
      
      for (const nota of targetNotas) {
        try {
          await this.targetBackend.deleteNota(nota.id)
        } catch (error) {
          logger.error(`[MigrationService] Failed to delete nota ${nota.id} during rollback:`, error)
        }
      }

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
    progress: MigrationProgress
  ): void {
    if (callback) {
      callback(progress)
    }
  }
}
