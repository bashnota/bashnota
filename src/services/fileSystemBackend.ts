/**
 * File System Backend - Storage backend using File System Access API
 * 
 * Uses the browser's File System Access API to store notas as JSON files
 * in a user-selected directory. Falls back to IndexedDB if not available.
 */

import type { Nota } from '@/features/nota/types/nota'
import { logger } from './logger'
import type { IStorageBackend, StorageBackendType } from './storageService'

export class FileSystemBackend implements IStorageBackend {
  readonly type: StorageBackendType = 'filesystem'
  
  private directoryHandle: FileSystemDirectoryHandle | null = null
  private initialized = false

  /**
   * Check if File System Access API is available
   */
  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  }

  /**
   * Initialize the backend and request directory access from user
   */
  async initialize(): Promise<void> {
    try {
      logger.info('[FileSystemBackend] Requesting directory access...')

      // Request directory access from user
      this.directoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      })

      this.initialized = true
      logger.info('[FileSystemBackend] Initialized successfully')
    } catch (error) {
      logger.error('[FileSystemBackend] Failed to initialize:', error)
      throw new Error('Failed to initialize FileSystemBackend: User may have denied access')
    }
  }

  /**
   * Read a nota from a JSON file
   */
  async readNota(notaId: string): Promise<Nota | null> {
    this.ensureInitialized()

    try {
      const fileName = this.getNotaFileName(notaId)
      const fileHandle = await this.directoryHandle!.getFileHandle(fileName, { create: false })
      
      const file = await fileHandle.getFile()
      const content = await file.text()
      
      const nota = JSON.parse(content)
      
      // Convert date strings back to Date objects
      if (nota.createdAt) nota.createdAt = new Date(nota.createdAt)
      if (nota.updatedAt) nota.updatedAt = new Date(nota.updatedAt)
      
      logger.debug(`[FileSystemBackend] Read nota: ${notaId}`)
      return nota
    } catch (error: any) {
      if (error.name === 'NotFoundError' || error.message?.includes('NotFoundError')) {
        return null
      }
      
      logger.error(`[FileSystemBackend] Failed to read nota ${notaId}:`, error)
      return null
    }
  }

  /**
   * Write a nota to a JSON file
   */
  async writeNota(nota: Nota): Promise<void> {
    this.ensureInitialized()

    try {
      const fileName = this.getNotaFileName(nota.id)
      
      // Get or create file handle
      const fileHandle = await this.directoryHandle!.getFileHandle(fileName, { create: true })
      
      // Create writable stream
      const writable = await fileHandle.createWritable()
      
      // Write nota as JSON
      const content = JSON.stringify(nota, null, 2)
      await writable.write(content)
      await writable.close()
      
      logger.debug(`[FileSystemBackend] Wrote nota: ${nota.id}`)
    } catch (error) {
      logger.error(`[FileSystemBackend] Failed to write nota ${nota.id}:`, error)
      throw error
    }
  }

  /**
   * Delete a nota file
   */
  async deleteNota(notaId: string): Promise<void> {
    this.ensureInitialized()

    try {
      const fileName = this.getNotaFileName(notaId)
      await this.directoryHandle!.removeEntry(fileName)
      
      logger.debug(`[FileSystemBackend] Deleted nota: ${notaId}`)
    } catch (error: any) {
      if (error.name === 'NotFoundError' || error.message?.includes('NotFoundError')) {
        // File doesn't exist, that's fine
        return
      }
      
      logger.error(`[FileSystemBackend] Failed to delete nota ${notaId}:`, error)
      throw error
    }
  }

  /**
   * List all notas in the directory
   */
  async listNotas(): Promise<Nota[]> {
    this.ensureInitialized()

    const notas: Nota[] = []

    try {
      // Iterate through all files in the directory
      for await (const entry of this.directoryHandle!.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          try {
            const fileHandle = entry as FileSystemFileHandle
            const file = await fileHandle.getFile()
            const content = await file.text()
            const nota = JSON.parse(content)
            
            // Convert date strings back to Date objects
            if (nota.createdAt) nota.createdAt = new Date(nota.createdAt)
            if (nota.updatedAt) nota.updatedAt = new Date(nota.updatedAt)
            
            notas.push(nota)
          } catch (error) {
            logger.warn(`[FileSystemBackend] Failed to parse file ${entry.name}, skipping`)
          }
        }
      }

      logger.debug(`[FileSystemBackend] Listed ${notas.length} notas`)
      return notas
    } catch (error) {
      logger.error('[FileSystemBackend] Failed to list notas:', error)
      return []
    }
  }

  /**
   * Ensure the backend is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.directoryHandle) {
      throw new Error('FileSystemBackend not initialized. Call initialize() first.')
    }
  }

  /**
   * Get the file name for a nota
   */
  private getNotaFileName(notaId: string): string {
    // Sanitize the ID to ensure it's a valid filename
    const sanitized = notaId.replace(/[^a-zA-Z0-9-_]/g, '_')
    return `${sanitized}.json`
  }
}
