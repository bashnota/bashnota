import 'fake-indexeddb/auto'

import { afterAll, describe, vi } from 'vitest'
import { db } from '@/db'
import { FileSystemBackend, type CanonicalContentPersistence } from '../fileSystemBackend'
import { IndexedDBBackend, MemoryBackend } from '../storageService'
import { storageBackendContract } from './storageBackend.contract'

interface MemoryFile {
  content: string
  handle: FileSystemFileHandle
}

function createDirectoryHandleFixture(): FileSystemDirectoryHandle {
  const files = new Map<string, MemoryFile>()
  const directory = {
    kind: 'directory',
    name: 'storage-contract-fixture',
    async queryPermission() {
      return 'granted' as PermissionState
    },
    async requestPermission() {
      return 'granted' as PermissionState
    },
    async getFileHandle(name: string, options?: FileSystemGetFileOptions) {
      let file = files.get(name)
      if (!file && !options?.create) throw new DOMException('Missing file', 'NotFoundError')
      if (!file) {
        const record = { content: '' } as MemoryFile
        record.handle = {
          kind: 'file',
          name,
          async getFile() {
            return { text: async () => record.content } as File
          },
          async createWritable() {
            return {
              async write(value: FileSystemWriteChunkType) {
                record.content = String(value)
              },
              async close() {},
              async abort() {},
            } as FileSystemWritableFileStream
          },
        } as FileSystemFileHandle
        file = record
        files.set(name, record)
      }
      return file.handle
    },
    async removeEntry(name: string) {
      if (!files.delete(name)) throw new DOMException('Missing file', 'NotFoundError')
    },
    async *entries() {
      for (const [name, file] of files) yield [name, file.handle] as const
    },
  }
  return directory as unknown as FileSystemDirectoryHandle
}

const canonicalContent: CanonicalContentPersistence = {
  async capture(nota) {
    return {
      format: 'normalized-blocks-v1',
      blockOrder: [],
      blocks: [],
      structureVersion: 1,
      capturedAt: new Date(nota.updatedAt).toISOString(),
    }
  },
  async validate() {},
  async hydrate() {},
}

describe('IStorageBackend contract', () => {
  describe('memory', () => {
    storageBackendContract({
      async create() {
        const backend = new MemoryBackend()
        await backend.initialize()
        return backend
      },
    })
  })

  describe('IndexedDB', () => {
    storageBackendContract({
      async create() {
        await db.notas.clear()
        const backend = new IndexedDBBackend()
        await backend.initialize()
        return backend
      },
      async cleanup() {
        await db.notas.clear()
      },
    })
  })

  describe('filesystem', () => {
    storageBackendContract({
      async create() {
        const backend = new FileSystemBackend(canonicalContent)
        const initialized = backend as unknown as {
          directoryHandle: FileSystemDirectoryHandle
          initialized: boolean
        }
        initialized.directoryHandle = createDirectoryHandleFixture()
        initialized.initialized = true
        return backend
      },
    })
  })

  afterAll(async () => {
    await db.close()
    vi.restoreAllMocks()
  })
})
