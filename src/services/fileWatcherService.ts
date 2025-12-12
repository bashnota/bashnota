/**
 * File Watcher Service - Monitors .nota files for changes
 * 
 * Since the File System Access API doesn't have native file watching,
 * we implement a polling-based solution that checks for file modifications.
 */

import { logger } from './logger'
import type { FileSystemBackend } from './fileSystemBackend'

export interface FileWatcherOptions {
  pollInterval?: number // Polling interval in milliseconds (default: 2000)
  onFileChanged?: (notaId: string, content: any) => void
  onFileAdded?: (notaId: string, content: any) => void
  onFileDeleted?: (notaId: string) => void
  onError?: (error: Error) => void
}

interface FileSnapshot {
  name: string
  notaId: string
  lastModified: number
  size: number
}

export class FileWatcherService {
  private backend: FileSystemBackend | null = null
  private isWatching = false
  private pollInterval = 2000 // Default: check every 2 seconds
  private intervalId: NodeJS.Timeout | null = null
  private fileSnapshots: Map<string, FileSnapshot> = new Map()
  private options: FileWatcherOptions = {}

  constructor(options?: FileWatcherOptions) {
    this.options = options || {}
    this.pollInterval = options?.pollInterval || 2000
  }

  /**
   * Set the file system backend to watch
   */
  setBackend(backend: FileSystemBackend): void {
    this.backend = backend
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      logger.warn('[FileWatcher] Already watching')
      return
    }

    if (!this.backend) {
      throw new Error('FileWatcherService: Backend not set')
    }

    logger.info('[FileWatcher] Starting file watcher...')
    this.isWatching = true

    // Initial snapshot
    await this.takeSnapshot()

    // Start polling
    this.intervalId = setInterval(async () => {
      try {
        await this.checkForChanges()
      } catch (error) {
        logger.error('[FileWatcher] Error checking for changes:', error)
        this.options.onError?.(error as Error)
      }
    }, this.pollInterval)

    logger.info(`[FileWatcher] Started watching (polling every ${this.pollInterval}ms)`)
  }

  /**
   * Stop watching for file changes
   */
  stop(): void {
    if (!this.isWatching) {
      return
    }

    logger.info('[FileWatcher] Stopping file watcher...')
    this.isWatching = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.fileSnapshots.clear()
    logger.info('[FileWatcher] File watcher stopped')
  }

  /**
   * Check if the watcher is currently active
   */
  isActive(): boolean {
    return this.isWatching
  }

  /**
   * Take a snapshot of current files
   */
  private async takeSnapshot(): Promise<void> {
    if (!this.backend) return

    const directoryHandle = this.backend.getDirectoryHandle()
    if (!directoryHandle) return

    try {
      const newSnapshots = new Map<string, FileSnapshot>()

      // Iterate through all .nota files
      const handle = directoryHandle as any
      for await (const [name, entry] of handle.entries()) {
        if (entry.kind === 'file' && (name.endsWith('.nota') || name.endsWith('.json'))) {
          try {
            const fileHandle = entry as FileSystemFileHandle
            const file = await fileHandle.getFile()
            
            // Extract nota ID from filename
            const notaId = name.replace(/\.(nota|json)$/, '').replace(/_/g, '-')
            
            newSnapshots.set(name, {
              name,
              notaId,
              lastModified: file.lastModified,
              size: file.size
            })
          } catch (error) {
            logger.warn(`[FileWatcher] Failed to read file ${name}:`, error)
          }
        }
      }

      this.fileSnapshots = newSnapshots
      logger.debug(`[FileWatcher] Snapshot taken: ${this.fileSnapshots.size} files`)
    } catch (error) {
      logger.error('[FileWatcher] Failed to take snapshot:', error)
      throw error
    }
  }

  /**
   * Check for changes since last snapshot
   */
  private async checkForChanges(): Promise<void> {
    if (!this.backend) return

    const directoryHandle = this.backend.getDirectoryHandle()
    if (!directoryHandle) return

    try {
      const currentSnapshots = new Map<string, FileSnapshot>()
      const changedFiles: string[] = []
      const addedFiles: string[] = []

      // Get current state
      const handle = directoryHandle as any
      for await (const [name, entry] of handle.entries()) {
        if (entry.kind === 'file' && (name.endsWith('.nota') || name.endsWith('.json'))) {
          try {
            const fileHandle = entry as FileSystemFileHandle
            const file = await fileHandle.getFile()
            
            const notaId = name.replace(/\.(nota|json)$/, '').replace(/_/g, '-')
            
            const snapshot: FileSnapshot = {
              name,
              notaId,
              lastModified: file.lastModified,
              size: file.size
            }

            currentSnapshots.set(name, snapshot)

            // Check if file is new or modified
            const oldSnapshot = this.fileSnapshots.get(name)
            if (!oldSnapshot) {
              // New file
              addedFiles.push(name)
            } else if (
              oldSnapshot.lastModified !== snapshot.lastModified ||
              oldSnapshot.size !== snapshot.size
            ) {
              // Modified file
              changedFiles.push(name)
            }
          } catch (error) {
            logger.warn(`[FileWatcher] Failed to read file ${name}:`, error)
          }
        }
      }

      // Check for deleted files
      const deletedFiles: string[] = []
      for (const [name, snapshot] of this.fileSnapshots.entries()) {
        if (!currentSnapshots.has(name)) {
          deletedFiles.push(name)
        }
      }

      // Update snapshot
      this.fileSnapshots = currentSnapshots

      // Notify about changes
      if (changedFiles.length > 0) {
        logger.info(`[FileWatcher] Files changed: ${changedFiles.join(', ')}`)
        for (const name of changedFiles) {
          const snapshot = currentSnapshots.get(name)
          if (snapshot) {
            try {
              const nota = await this.backend.readNota(snapshot.notaId)
              if (nota) {
                this.options.onFileChanged?.(snapshot.notaId, nota)
              }
            } catch (error) {
              logger.error(`[FileWatcher] Failed to read changed file ${name}:`, error)
            }
          }
        }
      }

      if (addedFiles.length > 0) {
        logger.info(`[FileWatcher] Files added: ${addedFiles.join(', ')}`)
        for (const name of addedFiles) {
          const snapshot = currentSnapshots.get(name)
          if (snapshot) {
            try {
              const nota = await this.backend.readNota(snapshot.notaId)
              if (nota) {
                this.options.onFileAdded?.(snapshot.notaId, nota)
              }
            } catch (error) {
              logger.error(`[FileWatcher] Failed to read added file ${name}:`, error)
            }
          }
        }
      }

      if (deletedFiles.length > 0) {
        logger.info(`[FileWatcher] Files deleted: ${deletedFiles.join(', ')}`)
        for (const name of deletedFiles) {
          const oldSnapshot = this.fileSnapshots.get(name)
          if (oldSnapshot) {
            this.options.onFileDeleted?.(oldSnapshot.notaId)
          }
        }
      }
    } catch (error) {
      logger.error('[FileWatcher] Failed to check for changes:', error)
      throw error
    }
  }

  /**
   * Update the polling interval
   */
  setPollInterval(interval: number): void {
    this.pollInterval = interval
    
    // Restart if already watching
    if (this.isWatching) {
      this.stop()
      this.start().catch(error => {
        logger.error('[FileWatcher] Failed to restart with new interval:', error)
      })
    }
  }

  /**
   * Get the current polling interval
   */
  getPollInterval(): number {
    return this.pollInterval
  }
}

// Singleton instance
let fileWatcherInstance: FileWatcherService | null = null

/**
 * Get the file watcher instance
 */
export function getFileWatcher(options?: FileWatcherOptions): FileWatcherService {
  if (!fileWatcherInstance) {
    fileWatcherInstance = new FileWatcherService(options)
  }
  return fileWatcherInstance
}

/**
 * Reset the file watcher instance (useful for testing)
 */
export function resetFileWatcher(): void {
  if (fileWatcherInstance) {
    fileWatcherInstance.stop()
    fileWatcherInstance = null
  }
}
