/**
 * File System Backend - Storage backend using File System Access API
 * 
 * Uses the browser's File System Access API to store notas as JSON files
 * in a user-selected directory. Falls back to IndexedDB if not available.
 */

import type { CanonicalNotaContentSnapshot, Nota } from '@/features/nota/types/nota'
import { logger } from './logger'
import type { IStorageBackend, StorageBackendType } from './storageService'
import * as DirectoryStorage from './directoryHandleStorage'

// Version of the .nota file format
const NOTA_FILE_FORMAT = 'bashnota-filesystem-nota'
const NOTA_FILE_FORMAT_VERSION = 2

export interface FileSystemNotaDocument {
  format: typeof NOTA_FILE_FORMAT
  version: typeof NOTA_FILE_FORMAT_VERSION
  exportedAt: string
  /** Unique optimistic-concurrency generation; absent on older v2 files. */
  revision?: string
  nota: Nota
  canonicalContent: CanonicalNotaContentSnapshot
}

export interface CanonicalContentPersistence {
  capture(nota: Nota): Promise<CanonicalNotaContentSnapshot>
  validate(notaId: string, snapshot: CanonicalNotaContentSnapshot): Promise<void>
  hydrate(entries: ReadonlyArray<{ notaId: string; snapshot: CanonicalNotaContentSnapshot }>): Promise<void>
}

const defaultCanonicalContentPersistence: CanonicalContentPersistence = {
  async capture(nota) {
    const { captureCanonicalContent } = await import('@/features/nota/services/versionHistoryPersistence')
    return captureCanonicalContent(nota.id)
  },
  async validate(notaId, snapshot) {
    const { validateCanonicalSnapshot } = await import('@/features/nota/services/versionHistoryPersistence')
    validateCanonicalSnapshot(notaId, snapshot)
  },
  async hydrate(entries) {
    const { restoreCanonicalContents } = await import('@/features/nota/services/versionHistoryPersistence')
    await restoreCanonicalContents(entries)
  },
}

function reviveNota(value: Nota): Nota {
  const nota = structuredClone(value)
  nota.createdAt = new Date(nota.createdAt)
  nota.updatedAt = new Date(nota.updatedAt)
  if (nota.blockStructure) nota.blockStructure.lastModified = new Date(nota.blockStructure.lastModified)
  nota.citations = nota.citations?.map((citation) => ({
    ...citation,
    createdAt: new Date(citation.createdAt),
  }))
  nota.versions = nota.versions?.map((version) => ({
    ...version,
    createdAt: new Date(version.createdAt),
    nota: reviveNota(version.nota as Nota) as typeof version.nota,
  }))
  return nota
}

function isFileSystemNotaDocument(value: unknown): value is FileSystemNotaDocument {
  if (!value || typeof value !== 'object') return false
  const document = value as Partial<FileSystemNotaDocument>
  return document.format === NOTA_FILE_FORMAT
    && document.version === NOTA_FILE_FORMAT_VERSION
    && typeof document.exportedAt === 'string'
    && !!document.nota
    && !!document.canonicalContent
}

function validateNotaMetadata(nota: Nota, fileName: string): void {
  if (typeof nota.id !== 'string' || nota.id.length === 0 || typeof nota.title !== 'string') {
    throw new Error(`${fileName} has invalid nota identity or title`)
  }
  if (nota.parentId !== null && typeof nota.parentId !== 'string') {
    throw new Error(`${fileName} has an invalid parent id`)
  }
  if (!Array.isArray(nota.tags) || nota.tags.some((tag) => typeof tag !== 'string')) {
    throw new Error(`${fileName} has invalid tags`)
  }
  for (const [label, value] of [['createdAt', nota.createdAt], ['updatedAt', nota.updatedAt]] as const) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new Error(`${fileName} has invalid ${label}`)
  }
  for (const version of nota.versions ?? []) {
    if (!version || typeof version.id !== 'string' || version.notaId !== nota.id
      || typeof version.versionName !== 'string'
      || !(version.createdAt instanceof Date) || Number.isNaN(version.createdAt.getTime())) {
      throw new Error(`${fileName} has invalid version history metadata`)
    }
  }
}

function safeNotaId(notaId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(notaId)) {
    throw new Error(`Nota id ${JSON.stringify(notaId)} cannot be represented as a collision-free filename`)
  }
  return notaId
}

function mergeOrdinaryWriteMetadata(incoming: Nota, current?: Nota): Nota {
  if (!current) return incoming

  // Ordinary saves carry a whole Nota snapshot even when their intent is only
  // to persist editor content or one metadata field. History has its own
  // guarded mutation contract, so a snapshot captured before this lock must
  // never remove or replace a history entry that another tab committed.
  return {
    ...incoming,
    createdAt: current.createdAt,
    // History appends and deletions use a generation-guarded write. Treating
    // the locked document as the sole history authority here also avoids
    // resurrecting an entry that another tab intentionally deleted.
    versions: current.versions,
  }
}

function newDocumentRevision(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`
}

export interface FileSystemMutationLocks {
  request<T>(name: string, mutation: () => Promise<T>): Promise<T>
}

/** Deterministic origin-lock shim for tests and non-browser single contexts. */
export class InMemoryFileSystemMutationLocks implements FileSystemMutationLocks {
  private queues = new Map<string, Promise<unknown>>()

  async request<T>(name: string, mutation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(name) ?? Promise.resolve()
    const current = previous.catch(() => undefined).then(mutation)
    this.queues.set(name, current)
    try {
      return await current
    } finally {
      if (this.queues.get(name) === current) this.queues.delete(name)
    }
  }
}

const testMutationLocks = new InMemoryFileSystemMutationLocks()
const browserMutationLocks: FileSystemMutationLocks = {
  request<T>(name: string, mutation: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(name, { mode: 'exclusive' }, mutation)
    }
    // Unit tests and server-side tools cannot have competing browser tabs.
    if (import.meta.env.MODE === 'test' || typeof window === 'undefined') {
      return testMutationLocks.request(name, mutation)
    }
    return Promise.reject(new Error(
      'Filesystem storage requires Web Locks to prevent another tab from overwriting this nota.',
    ))
  },
}

export class FileSystemBackend implements IStorageBackend {
  readonly type: StorageBackendType = 'filesystem'
  
  private directoryHandle: FileSystemDirectoryHandle | null = null
  private initialized = false
  private writeQueues = new Map<string, Promise<void>>()

  constructor(
    private readonly canonicalContent: CanonicalContentPersistence = defaultCanonicalContentPersistence,
    private readonly mutationLocks: FileSystemMutationLocks = browserMutationLocks,
  ) {}

  private withNotaMutationLock<T>(notaId: string, mutation: () => Promise<T>): Promise<T> {
    return this.mutationLocks.request(`bashnota:filesystem:nota:${safeNotaId(notaId)}`, mutation)
  }

  async createNotaDocument(nota: Nota): Promise<FileSystemNotaDocument> {
    let canonicalContent: CanonicalNotaContentSnapshot
    try {
      canonicalContent = await this.canonicalContent.capture(nota)
    } catch (error) {
      if (nota.blockStructure?.blockOrder.length) throw error
      canonicalContent = {
        format: 'normalized-blocks-v1',
        blockOrder: [],
        blocks: [],
        structureVersion: nota.blockStructure?.version ?? 1,
        capturedAt: nota.blockStructure
          ? new Date(nota.blockStructure.lastModified).toISOString()
          : new Date().toISOString(),
      }
    }
    return {
      format: NOTA_FILE_FORMAT,
      version: NOTA_FILE_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      revision: newDocumentRevision(),
      nota: structuredClone(nota),
      canonicalContent,
    }
  }

  private enqueueDocumentWrite(
    notaId: string,
    documentFactory: () => Promise<FileSystemNotaDocument>,
  ): Promise<void> {
    const previous = this.writeQueues.get(notaId) ?? Promise.resolve()
    const write = previous.catch(() => undefined).then(() => this.withNotaMutationLock(notaId, async () => {
      const document = await documentFactory()
      if (document.nota.id !== notaId) throw new Error('Filesystem nota document identity mismatch')
      validateNotaMetadata(document.nota, `${notaId}.nota`)
      await this.canonicalContent.validate(notaId, document.canonicalContent)
      await this.writeRaw(this.getNotaFileName(notaId), JSON.stringify(document, null, 2))
      logger.debug(`[FileSystemBackend] Wrote nota: ${notaId}`)
    })).catch((error) => {
      logger.error(`[FileSystemBackend] Failed to write nota ${notaId}:`, error)
      throw error
    }).finally(() => {
      if (this.writeQueues.get(notaId) === write) this.writeQueues.delete(notaId)
    })
    this.writeQueues.set(notaId, write)
    return write
  }

  private enqueueDelete(notaId: string): Promise<void> {
    const previous = this.writeQueues.get(notaId) ?? Promise.resolve()
    const deletion = previous.catch(() => undefined).then(() => this.withNotaMutationLock(notaId, async () => {
      const extensions = ['.nota', '.json']
      let deleted = false
      for (const ext of extensions) {
        try {
          const fileName = `${safeNotaId(notaId)}${ext}`
          await this.directoryHandle!.removeEntry(fileName)
          logger.debug(`[FileSystemBackend] Deleted nota: ${notaId} (${fileName})`)
          deleted = true
        } catch (error: any) {
          if (error.name === 'NotFoundError' || error.message?.includes('NotFoundError')) continue
          throw error
        }
      }
      if (!deleted) logger.debug(`[FileSystemBackend] Nota file not found: ${notaId} (already deleted or never existed)`)
    })).catch((error) => {
      logger.error(`[FileSystemBackend] Failed to delete nota ${notaId}:`, error)
      throw error
    }).finally(() => {
      if (this.writeQueues.get(notaId) === deletion) this.writeQueues.delete(notaId)
    })
    this.writeQueues.set(notaId, deletion)
    return deletion
  }

  async writeNotaDocument(document: FileSystemNotaDocument): Promise<void> {
    this.ensureInitialized()
    const snapshot = structuredClone(document)
    // Migration and authority rollback require an exact metadata/content copy.
    // They coordinate the operation at a higher level; the per-nota lock still
    // prevents a partial concurrent write while this replacement commits.
    return this.enqueueDocumentWrite(snapshot.nota.id, async () => ({
      ...snapshot,
      exportedAt: new Date().toISOString(),
      revision: newDocumentRevision(),
    }))
  }

  async readNotaDocument(notaId: string): Promise<FileSystemNotaDocument> {
    this.ensureInitialized()
    const fileName = this.getNotaFileName(notaId)
    const fileHandle = await this.directoryHandle!.getFileHandle(fileName, { create: false })
    const parsed = await this.parseDocument(await (await fileHandle.getFile()).text(), fileName)
    if (!isFileSystemNotaDocument(parsed)) {
      throw new Error(`${fileName} is legacy metadata-only content`)
    }
    return parsed
  }

  private async readNotaDocumentIfPresent(notaId: string): Promise<FileSystemNotaDocument | null> {
    try {
      return await this.readNotaDocument(notaId)
    } catch (error: any) {
      if (error?.name === 'NotFoundError' || error?.message?.includes('NotFoundError')) return null
      throw error
    }
  }

  private async writeRaw(fileName: string, content: string): Promise<void> {
    const fileHandle = await this.directoryHandle!.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    try {
      await writable.write(content)
      await writable.close()
    } catch (error) {
      await writable.abort?.().catch(() => undefined)
      throw error
    }
  }

  /** Capture only managed nota files without parsing or hydrating their rows. */
  async snapshotDirectory(): Promise<Map<string, string>> {
    this.ensureInitialized()
    const snapshot = new Map<string, string>()
    for await (const [name, entry] of (this.directoryHandle as any).entries()) {
      if (entry.kind === 'file' && (name.endsWith('.nota') || name.endsWith('.json'))) {
        snapshot.set(name, await (await (entry as FileSystemFileHandle).getFile()).text())
      }
    }
    return snapshot
  }

  /** List only files that parse as BashNota nota documents. */
  async listManagedFileNames(): Promise<string[]> {
    this.ensureInitialized()
    const names: string[] = []
    for await (const [name, entry] of (this.directoryHandle as any).entries()) {
      if (entry.kind !== 'file' || (!name.endsWith('.nota') && !name.endsWith('.json'))) continue
      try {
        await this.parseDocument(await (await (entry as FileSystemFileHandle).getFile()).text(), name)
        names.push(name)
      } catch {
        // An unrelated JSON file is not owned by BashNota and must be preserved.
      }
    }
    return names.sort((left, right) => left.localeCompare(right))
  }

  /**
   * Delete the exact managed files the user authorized. Restore their contents
   * if any removal fails, so a filesystem authority is never half-cleared.
   */
  async deleteManagedFiles(fileNames: readonly string[]): Promise<void> {
    this.ensureInitialized()
    const currentNames = await this.listManagedFileNames()
    if (currentNames.join('\n') !== [...fileNames].sort().join('\n')) {
      throw new Error('The selected directory changed after confirmation. Review the file list and try again.')
    }
    const snapshot = new Map<string, string>()
    for (const name of fileNames) {
      const handle = await this.directoryHandle!.getFileHandle(name, { create: false })
      snapshot.set(name, await (await handle.getFile()).text())
    }
    try {
      for (const name of fileNames) await this.directoryHandle!.removeEntry(name)
    } catch (error) {
      for (const [name, content] of snapshot) {
        try {
          await this.writeRaw(name, content)
        } catch (restoreError) {
          logger.error(`[FileSystemBackend] Failed to restore ${name}:`, restoreError)
        }
      }
      throw error
    }
    const remaining = await this.listManagedFileNames()
    if (remaining.length > 0) throw new Error(`Managed files remain: ${remaining.join(', ')}`)
  }

  /** Restore the exact managed-file state after a failed mode migration. */
  async restoreDirectory(snapshot: ReadonlyMap<string, string>): Promise<void> {
    this.ensureInitialized()
    const current = await this.snapshotDirectory()
    for (const name of current.keys()) await this.directoryHandle!.removeEntry(name)
    for (const [name, content] of snapshot) await this.writeRaw(name, content)
  }

  private async parseDocument(content: string, fileName: string): Promise<FileSystemNotaDocument | Nota> {
    const data: unknown = JSON.parse(content)
    if (isFileSystemNotaDocument(data)) {
      const nota = reviveNota(data.nota)
      validateNotaMetadata(nota, fileName)
      if (nota.id !== data.canonicalContent.blocks[0]?.notaId && data.canonicalContent.blocks.length > 0) {
        throw new Error(`${fileName} contains canonical content for another nota`)
      }
      if (nota.blockStructureId !== undefined
        && data.canonicalContent.structureId !== undefined
        && `${typeof nota.blockStructureId}:${String(nota.blockStructureId)}`
          !== `${typeof data.canonicalContent.structureId}:${String(data.canonicalContent.structureId)}`) {
        throw new Error(`${fileName} has inconsistent block structure identity`)
      }
      await this.canonicalContent.validate(nota.id, data.canonicalContent)
      for (const version of nota.versions ?? []) {
        if (version.canonicalContent) {
          await this.canonicalContent.validate(nota.id, version.canonicalContent)
        }
      }
      return { ...data, nota }
    }

    // Legacy metadata-only files remain readable, but are never presented as
    // self-contained documents during migration verification.
    const legacy = (data as { nota?: Nota }).nota ?? data as Nota
    if (!legacy || typeof legacy.id !== 'string' || typeof legacy.title !== 'string') {
      throw new Error(`${fileName} is not a valid BashNota document`)
    }
    const revived = reviveNota(legacy)
    validateNotaMetadata(revived, fileName)
    return revived
  }

  private async hydrateDocuments(documents: FileSystemNotaDocument[]): Promise<void> {
    if (documents.length === 0) return
    await this.canonicalContent.hydrate(documents.map((document) => ({
      notaId: document.nota.id,
      snapshot: document.canonicalContent,
    })))
  }

  /**
   * Scan and validate the complete directory without changing Dexie. Authority
   * transitions use this path so source inspection cannot mutate the target
   * before its rollback-capable transaction starts.
   */
  private async scanDirectory(): Promise<{
    notas: Nota[]
    documents: FileSystemNotaDocument[]
  }> {
    const notas: Nota[] = []
    const documents: FileSystemNotaDocument[] = []
    const handle = this.directoryHandle as any

    for await (const [name, entry] of handle.entries()) {
      if (entry.kind !== 'file' || (!name.endsWith('.nota') && !name.endsWith('.json'))) continue
      try {
        const fileHandle = entry as FileSystemFileHandle
        const parsed = await this.parseDocument(await (await fileHandle.getFile()).text(), name)
        if (isFileSystemNotaDocument(parsed)) {
          documents.push(parsed)
          notas.push(parsed.nota)
        } else {
          notas.push(parsed)
        }
      } catch (error) {
        throw new Error(`Failed to load ${entry.name}: ${String(error)}`)
      }
    }

    const byId = new Map(notas.map((nota) => [nota.id, nota]))
    if (byId.size !== notas.length) throw new Error('Filesystem directory contains duplicate nota ids')
    const structureIds = documents
      .map((document) => document.canonicalContent.structureId)
      .filter((id): id is string | number => id !== undefined)
      .map((id) => `${typeof id}:${String(id)}`)
    if (new Set(structureIds).size !== structureIds.length) {
      throw new Error('Filesystem directory contains duplicate block structure ids')
    }
    for (const nota of notas) {
      if (nota.parentId !== null && !byId.has(nota.parentId)) {
        throw new Error(`Nota ${nota.id} refers to missing parent ${nota.parentId}`)
      }
      const seen = new Set([nota.id])
      let cursor = nota.parentId
      while (cursor !== null) {
        if (seen.has(cursor)) throw new Error(`Filesystem nota hierarchy contains a cycle at ${cursor}`)
        seen.add(cursor)
        cursor = byId.get(cursor)?.parentId ?? null
      }
    }

    return { notas, documents }
  }

  /** Read only self-contained documents without hydrating canonical Dexie rows. */
  async listNotaDocuments(): Promise<FileSystemNotaDocument[]> {
    this.ensureInitialized()
    const { notas, documents } = await this.scanDirectory()
    if (documents.length !== notas.length) {
      throw new Error('Filesystem migration requires self-contained .nota documents; legacy metadata-only files remain.')
    }
    return documents
  }

  /**
   * Check if a persisted directory handle exists
   * This is a static method that can be called without instantiating the backend
   */
  static async hasPersistedHandle(): Promise<boolean> {
    try {
      const handle = await DirectoryStorage.getDirectoryHandle()
      return handle !== null
    } catch {
      return false
    }
  }

  /**
   * Check if File System Access API is available
   */
  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  }

  /**
   * Initialize the backend using a persisted directory handle
   * 
   * This method attempts to retrieve and verify a previously stored directory handle.
   * It does NOT prompt the user for directory access - that should be done separately
   * via setDirectoryHandle() which must be called from a user gesture.
   */
  async initialize(): Promise<void> {
    try {
      logger.info('[FileSystemBackend] Attempting to initialize with persisted handle...')

      // Try to retrieve the persisted directory handle
      const handle = await DirectoryStorage.getDirectoryHandle()
      
      if (!handle) {
        logger.warn('[FileSystemBackend] No persisted directory handle found')
        throw new Error('No directory handle available. User must select a directory first.')
      }

      // Verify we still have permission to access the directory
      const hasPermission = await DirectoryStorage.verifyHandlePermission(handle)
      
      if (!hasPermission) {
        logger.warn('[FileSystemBackend] Permission denied for persisted directory handle')
        throw new Error('Permission denied for directory. User must grant access again.')
      }

      this.directoryHandle = handle
      this.initialized = true
      logger.info('[FileSystemBackend] Initialized successfully with persisted handle')
    } catch (error) {
      logger.error('[FileSystemBackend] Failed to initialize:', error)
      throw error
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
          const fileName = `${safeNotaId(notaId)}${ext}`
          const fileHandle = await this.directoryHandle!.getFileHandle(fileName, { create: false })
          
          const file = await fileHandle.getFile()
          const content = await file.text()
          
          const parsed = await this.parseDocument(content, fileName)
          const nota = isFileSystemNotaDocument(parsed) ? parsed.nota : parsed
          if (isFileSystemNotaDocument(parsed)) await this.hydrateDocuments([parsed])
          
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
      throw error
    }
  }

  /**
   * Write a nota to a JSON file
   */
  async writeNota(nota: Nota): Promise<void> {
    this.ensureInitialized()
    const notaSnapshot = structuredClone(nota)
    // Capture intent before waiting for the origin lock. If an existing nota
    // disappears while this update is queued, it must not silently become a
    // create and resurrect a delete committed by another tab.
    const observed = await this.readNotaDocumentIfPresent(nota.id)
    return this.enqueueDocumentWrite(nota.id, async () => {
      const current = await this.readNotaDocumentIfPresent(nota.id)
      if (observed && !current) {
        throw new Error('Filesystem nota was deleted in another tab before this update could be saved')
      }
      if (!observed && current) {
        throw new Error('Filesystem nota was created in another tab before this create could be saved')
      }
      return this.createNotaDocument(mergeOrdinaryWriteMetadata(notaSnapshot, current?.nota))
    })
  }

  /**
   * Optimistic guard for metadata/history updates. The comparison and write
   * share an origin-wide per-nota lock, so another tab cannot change the file
   * between the generation check and the committed write.
   */
  async writeNotaIfDocumentUnchanged(nota: Nota, expectedGeneration: string): Promise<void> {
    this.ensureInitialized()
    const notaSnapshot = structuredClone(nota)
    return this.enqueueDocumentWrite(nota.id, async () => {
      const current = await this.readNotaDocument(nota.id)
      if (!current || (current.revision ?? current.exportedAt) !== expectedGeneration) {
        throw new Error('Filesystem nota changed in another tab before version history could be appended')
      }
      return this.createNotaDocument(notaSnapshot)
    })
  }

  /**
   * Delete a nota file (tries both .nota and .json extensions)
   */
  async deleteNota(notaId: string): Promise<void> {
    this.ensureInitialized()
    return this.enqueueDelete(notaId)
  }

  /**
   * List all notas in the directory
   */
  async listNotas(): Promise<Nota[]> {
    this.ensureInitialized()

    try {
      const { notas, documents } = await this.scanDirectory()
      await this.hydrateDocuments(documents)

      logger.debug(`[FileSystemBackend] Listed ${notas.length} notas`)
      return notas
    } catch (error) {
      logger.error('[FileSystemBackend] Failed to list notas:', error)
      throw error
    }
  }

  async clearAll(): Promise<void> {
    await this.deleteManagedFiles(await this.listManagedFileNames())
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
    return `${safeNotaId(notaId)}.nota`
  }

  /**
   * Watch for changes to .nota files in the directory
   */
  async watchDirectory(callback: (notaId: string) => void): Promise<void> {
    this.ensureInitialized()
    void callback

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
      
      const parsed = await this.parseDocument(content, fileHandle.name)
      const nota = isFileSystemNotaDocument(parsed) ? parsed.nota : parsed
      if (isFileSystemNotaDocument(parsed)) await this.hydrateDocuments([parsed])
      
      logger.debug(`[FileSystemBackend] Read .nota file: ${nota.id}`)
      return nota
    } catch (error) {
      logger.error('[FileSystemBackend] Failed to read .nota file:', error)
      throw error
    }
  }

  /**
   * Get the directory handle (for advanced operations)
   */
  getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.directoryHandle
  }

  /** Adopt a persisted handle without writing it back to handle storage. */
  async initializeWithDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    if (!await DirectoryStorage.verifyHandlePermission(handle)) {
      throw new Error('Read/write permission was not granted for the configured directory.')
    }
    this.directoryHandle = handle
    this.initialized = true
  }

  /**
   * Set a directory handle (must be called from a user gesture)
   * 
   * This method should be called after the user selects a directory via showDirectoryPicker().
   * It persists the handle in IndexedDB for future use.
   */
  async setDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      // Verify we have permission
      const hasPermission = await DirectoryStorage.verifyHandlePermission(handle)
      
      if (!hasPermission) {
        throw new Error('Permission denied for directory')
      }

      // Save the handle to IndexedDB
      await DirectoryStorage.saveDirectoryHandle(handle)
      
      this.directoryHandle = handle
      this.initialized = true
      
      logger.info('[FileSystemBackend] Directory handle set and persisted')
    } catch (error) {
      logger.error('[FileSystemBackend] Failed to set directory handle:', error)
      throw error
    }
  }
}
