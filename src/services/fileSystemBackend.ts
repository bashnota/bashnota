/**
 * File System Backend - Storage backend using File System Access API
 * 
 * Uses the browser's File System Access API to store notas as JSON files
 * in a user-selected directory. Falls back to IndexedDB if not available.
 */

import type { Nota } from '@/features/nota/types/nota'
import { logger } from './logger'
import type { IStorageBackend, StorageBackendType } from './storageService'

// Version of the .nota file format
const NOTA_FILE_FORMAT_VERSION = '1.0'

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
   * Read a nota from a .nota or .json file
   */
  async readNota(notaId: string): Promise<Nota | null> {
    this.ensureInitialized()

    try {
      // Try .nota extension first, then fall back to .json
      const extensions = ['.nota', '.json']
      
      for (const ext of extensions) {
        try {
          const sanitized = notaId.replace(/[^a-zA-Z0-9-_]/g, '_')
          const fileName = `${sanitized}${ext}`
          const fileHandle = await this.directoryHandle!.getFileHandle(fileName, { create: false })
          
          const file = await fileHandle.getFile()
          const content = await file.text()
          
          const data = JSON.parse(content)
          
          // Handle both exported .nota format and direct nota format
          const nota = data.nota || data
          
          // Convert date strings back to Date objects
          if (nota.createdAt) nota.createdAt = new Date(nota.createdAt)
          if (nota.updatedAt) nota.updatedAt = new Date(nota.updatedAt)
          
          logger.debug(`[FileSystemBackend] Read nota: ${notaId} from ${fileName}`)
          return nota
        } catch (error: any) {
          if (error.name === 'NotFoundError' || error.message?.includes('NotFoundError')) {
            // Try next extension
            continue
          }
          throw error
        }
      }
      
      // File not found with any extension
      return null
    } catch (error: any) {
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
      
      // Wrap nota in the standard .nota file format
      const exportData = {
        version: NOTA_FILE_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        nota: nota
      }
      
      // Write nota as JSON
      const content = JSON.stringify(exportData, null, 2)
      await writable.write(content)
      await writable.close()
      
      logger.debug(`[FileSystemBackend] Wrote nota: ${nota.id}`)
    } catch (error) {
      logger.error(`[FileSystemBackend] Failed to write nota ${nota.id}:`, error)
      throw error
    }
  }

  /**
   * Delete a nota file (tries both .nota and .json extensions)
   */
  async deleteNota(notaId: string): Promise<void> {
    this.ensureInitialized()

    try {
      const sanitized = notaId.replace(/[^a-zA-Z0-9-_]/g, '_')
      const extensions = ['.nota', '.json']
      let deleted = false
      
      for (const ext of extensions) {
        try {
          const fileName = `${sanitized}${ext}`
          await this.directoryHandle!.removeEntry(fileName)
          logger.debug(`[FileSystemBackend] Deleted nota: ${notaId} (${fileName})`)
          deleted = true
        } catch (error: any) {
          if (error.name === 'NotFoundError' || error.message?.includes('NotFoundError')) {
            // File doesn't exist with this extension, try next one
            continue
          }
          throw error
        }
      }
      
      if (!deleted) {
        logger.debug(`[FileSystemBackend] Nota file not found: ${notaId} (already deleted or never existed)`)
      }
    } catch (error: any) {
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
      // Type assertion needed as FileSystemDirectoryHandle.entries() is not in all type definitions
      const handle = this.directoryHandle as any
      for await (const [name, entry] of handle.entries()) {
        if (entry.kind === 'file' && (name.endsWith('.nota') || name.endsWith('.json'))) {
          try {
            const fileHandle = entry as FileSystemFileHandle
            const file = await fileHandle.getFile()
            const content = await file.text()
            const data = JSON.parse(content)
            
            // Handle both exported .nota format and direct nota format
            const nota = data.nota || data
            
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
    return `${sanitized}.nota`
  }

  /**
   * Watch for changes to .nota files in the directory
   */
  async watchDirectory(callback: (notaId: string) => void): Promise<void> {
    this.ensureInitialized()

    try {
      // Note: File System Access API doesn't have built-in watch functionality
      // This is a placeholder for future implementation using alternative approaches
      logger.info('[FileSystemBackend] Directory watching not yet implemented')
      // TODO: Implement file watching using polling or other mechanisms
    } catch (error) {
      logger.error('[FileSystemBackend] Failed to watch directory:', error)
    }
  }

  /**
   * Read a .nota file by path (for direct file access)
   */
  async readNotaFile(fileHandle: FileSystemFileHandle): Promise<Nota | null> {
    try {
      const file = await fileHandle.getFile()
      const content = await file.text()
      
      const data = JSON.parse(content)
      
      // Handle both exported .nota format and direct nota format
      const nota = data.nota || data
      
      // Convert date strings back to Date objects
      if (nota.createdAt) nota.createdAt = new Date(nota.createdAt)
      if (nota.updatedAt) nota.updatedAt = new Date(nota.updatedAt)
      
      logger.debug(`[FileSystemBackend] Read .nota file: ${nota.id}`)
      return nota
    } catch (error) {
      logger.error('[FileSystemBackend] Failed to read .nota file:', error)
      return null
    }
  }

  /**
   * Get the directory handle (for advanced operations)
   */
  getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.directoryHandle
  }
}
