import { defineStore } from 'pinia'
import { db } from '@/db'
import {
  type Nota,
  type NotaVersion,
  type PublishedNota,
  type CitationEntry,
  type RestoreVersionResult,
  type CanonicalNotaContentSnapshot,
} from '@/features/nota/types/nota'
import type { Block, NotaBlockStructure } from '@/features/nota/types/blocks'
import type { NotaConfig } from '@/features/jupyter/types/jupyter'
import { nanoid } from 'nanoid'
import { toast } from '@/services/toast'
import { useAuthStore } from '@/features/auth/stores/auth'
import { processNotaContent } from '@/features/nota/services/publishNotaUtilities'
import { listAllPublications } from '@/features/nota/services/listAllPublications'
import {
  cachePublicPublication,
  readCachedPublicPublication,
  removeCachedPublicPublication,
} from '@/features/nota/services/publicPublicationCache'
import { getPublicationCloudApi, normalizeCloudPublishedContent } from '@/services/cloud'
import { CloudError, type CloudJson, type CloudPublication, type CloudPublicationWrite } from '@/services/cloud/types'
import { cleanupOrphanedPublishedImages, deletePublishedImages } from '@/services/cloud/supabaseImageStorage'
import { logger } from '@/services/logger'
import { FILE_EXTENSIONS, ERROR_MESSAGES } from '@/constants/app';
import { useBlockStore } from './blockStore'
import {
  runDatabaseAuthorityTransition,
  useDatabaseAdapter,
  withNotaPersistence,
} from '@/services/databaseAdapter'
import { isStorageAuthorityUnavailable } from '@/services/storageAuthority'
import type {
  BackupNotaAuthority,
  BashNotaBackupArchive,
} from '@/features/nota/services/backupArchiveService'

type VersionPersistenceModule = typeof import('@/features/nota/services/versionHistoryPersistence')
type RestoredCanonicalState = Awaited<ReturnType<VersionPersistenceModule['restoreCanonicalContent']>>
type ImportedBlockData = Omit<Block, 'id' | 'createdAt' | 'updatedAt' | 'version'>

export interface PreparedNotaImport {
  nota: Nota
  blocks?: ImportedBlockData[]
}

interface CanonicalRowsSnapshot {
  blocks: Block[]
  structures: NotaBlockStructure[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function canonicalSnapshotFingerprint(snapshot: CanonicalNotaContentSnapshot): string {
  return JSON.stringify({ ...snapshot, capturedAt: undefined })
}

function stableCloudValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableCloudValue).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableCloudValue(entry)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function publicationMatchesWrite(actual: CloudPublication, expected: CloudPublicationWrite): boolean {
  return actual.id === expected.id
    && actual.title === expected.title
    && actual.authorName === expected.authorName
    && stableCloudValue(actual.content) === stableCloudValue(expected.content)
    && actual.isPublic === expected.isPublic
    && actual.isSubPage === expected.isSubPage
    && actual.parentId === expected.parentId
    && stableCloudValue(actual.tags) === stableCloudValue(expected.tags)
    && stableCloudValue(actual.citations) === stableCloudValue(expected.citations)
    && stableCloudValue(actual.publishedSubPages ?? []) === stableCloudValue(expected.publishedSubPages ?? [])
}

interface ActiveHierarchyPublication {
  includeSubPages: boolean
  promise: Promise<PublishedNota>
}

const publicationHierarchyInFlight = new Map<string, ActiveHierarchyPublication>()

/**
 * A read from the active nota authority failed. Callers must surface this
 * rather than treating the retained in-memory snapshot as a fresh empty read.
 */
export class NotaLoadError extends Error {
  readonly cause: unknown

  constructor(cause: unknown) {
    super(`Failed to load notas: ${errorMessage(cause)}`)
    this.name = 'NotaLoadError'
    this.cause = cause
  }
}

function versionMetadata(nota: Nota): NotaVersion['nota'] {
  const { versions: _versions, blockStructure: _blockStructure, ...metadata } = nota
  return JSON.parse(JSON.stringify(metadata)) as NotaVersion['nota']
}

function publishedNota(value: CloudPublication): PublishedNota {
  return {
    id: value.id, title: value.title, content: value.content, updatedAt: value.updatedAt,
    publishedAt: value.publishedAt, authorId: value.authorId, authorName: value.authorName,
    authorTag: value.authorTag,
    isPublic: value.isPublic, isSubPage: value.isSubPage, parentId: value.parentId,
    publishedSubPages: value.publishedSubPages ?? [], citations: value.citations as unknown as CitationEntry[],
    tags: value.tags, viewCount: value.viewCount, uniqueViewers: value.uniqueViewers,
    likeCount: value.likeCount, dislikeCount: value.dislikeCount, cloneCount: value.cloneCount,
    commentCount: value.commentCount, lastViewedAt: value.lastViewedAt ?? undefined,
  }
}

// Helper functions to convert dates and ensure data is serializable
const serializeNota = (nota: Partial<Nota> & { id: string }): any => {
  const serialized = {
    ...nota,
    tags: Array.isArray(nota.tags) ? [...nota.tags] : [], // Ensure tags is a new array
    createdAt: nota.createdAt instanceof Date ? nota.createdAt.toISOString() : nota.createdAt,
    updatedAt: nota.updatedAt instanceof Date ? nota.updatedAt.toISOString() : nota.updatedAt,
  }

  // If there's a config, deep clone it to ensure it's serializable
  if (nota.config) {
    serialized.config = JSON.parse(JSON.stringify(nota.config))
  }

  // Properly serialize versions array if it exists
  if (nota.versions && Array.isArray(nota.versions)) {
    serialized.versions = nota.versions.map((version) => ({
      id: version.id,
      notaId: version.notaId,
      versionName: version.versionName,
      createdAt: version.createdAt && version.createdAt instanceof Date
        ? version.createdAt.toISOString()
        : version.createdAt,
      // For the nota object in the version, we need to serialize it properly
      nota: version.nota ? serializeNota(version.nota) : undefined,
      canonicalContent: version.canonicalContent
        ? JSON.parse(JSON.stringify(version.canonicalContent))
        : undefined,
    }))
  }

  // Properly serialize citations array if it exists
  if (nota.citations && Array.isArray(nota.citations)) {
    serialized.citations = nota.citations.map((citation) => ({
      id: citation.id,
      key: citation.key,
      title: citation.title,
      authors: Array.isArray(citation.authors) ? [...citation.authors] : [],
      year: citation.year,
      journal: citation.journal,
      volume: citation.volume,
      number: citation.number,
      pages: citation.pages,
      publisher: citation.publisher,
      url: citation.url,
      doi: citation.doi,
      createdAt: citation.createdAt instanceof Date ? citation.createdAt.toISOString() : citation.createdAt,
    }))
  }

  // Handle blockStructure - only store metadata, not the full blocks
  if (nota.blockStructure) {
    serialized.blockStructure = {
      notaId: nota.blockStructure.notaId,
      blockOrder: [...(nota.blockStructure.blockOrder || [])],
      version: nota.blockStructure.version,
      lastModified: nota.blockStructure.lastModified instanceof Date 
        ? nota.blockStructure.lastModified.toISOString() 
        : nota.blockStructure.lastModified,
      // Don't include the blocks object - it's stored separately
    } as any
  }

  return serialized
}

const deserializeNota = (nota: any): Nota => ({
  ...nota,
  // Content is now stored in blocks, not in the content field
  tags: Array.isArray(nota.tags) ? [...nota.tags] : [],
  createdAt: nota.createdAt ? new Date(nota.createdAt) : new Date(),
  updatedAt: nota.updatedAt ? new Date(nota.updatedAt) : new Date(),
  config: nota.config ? JSON.parse(JSON.stringify(nota.config)) : undefined,
  citations: Array.isArray(nota.citations) ? nota.citations.map((citation: CitationEntry) => ({
    ...citation,
    createdAt: citation.createdAt ? new Date(citation.createdAt) : new Date(),
  })) : [],
  // Handle blockStructure - convert dates back to Date objects
  blockStructure: nota.blockStructure ? {
    ...nota.blockStructure,
    lastModified: nota.blockStructure.lastModified ? new Date(nota.blockStructure.lastModified) : new Date(),
  } : undefined,
  // Handle versions - deserialize the nota object in each version
  versions: Array.isArray(nota.versions) ? nota.versions.map((version: any) => ({
    ...version,
    createdAt: version.createdAt ? new Date(version.createdAt) : new Date(),
    nota: version.nota ? deserializeNota(version.nota) : undefined,
  })) : [],
})

// Nota metadata must never guess a backend. Startup installs the one
// authoritative adapter before mounting; programmatic callers racing startup
// fail closed instead of crossing into legacy Dexie.
function getDb() {
  // Resolve every operation so a verified live storage-mode switch takes
  // effect immediately instead of leaving stores pinned to the old adapter.
  try {
    return useDatabaseAdapter()
  } catch (error) {
    if (isFilesystemStorageConfigured()) {
      throw new Error(
        'Nota storage is unavailable while filesystem storage is initializing. Wait a moment and try again.',
      )
    }
    if (isStorageAuthorityUnavailable()) throw error

    // A few IndexedDB-only services and isolated test fixtures predate the
    // application bootstrap. Their direct Dexie path is the same authority,
    // but it is never reachable while real startup is resolving or failed.
    logger.warn('[NotaStore] Using explicit legacy IndexedDB authority outside application startup')
    return null
  }
}

function externalBackupAuthority(
  adapter: ReturnType<typeof getDb>,
): BackupNotaAuthority | undefined {
  if (!adapter?.isUsingNewStorage()) return undefined
  return adapter.getStorageService().getBackendType() === 'indexeddb' ? undefined : adapter
}

function resolveBackupAuthority(
  authorityOverride?: BackupNotaAuthority,
): BackupNotaAuthority | undefined {
  if (authorityOverride) return authorityOverride

  let adapter: ReturnType<typeof getDb>
  try {
    adapter = getDb()
  } catch (error) {
    if (isFilesystemStorageConfigured()) {
      throw new Error(
        'Backup is unavailable while filesystem storage is initializing. Wait a moment and try again.',
      )
    }
    throw error
  }
  return externalBackupAuthority(adapter)
}

/**
 * Version records live inside the serialized Nota, so they can be stored
 * durably by the filesystem adapter. The normalized block rows remain in
 * Dexie; importantly, the nota metadata/history itself must never fall back
 * to db.notas while a filesystem backend is authoritative.
 */
function isFilesystemStorageAdapter(
  adapter: ReturnType<typeof useDatabaseAdapter> | null,
): adapter is ReturnType<typeof useDatabaseAdapter> {
  return Boolean(
    adapter?.isUsingNewStorage()
      && adapter.getStorageService().getBackendType() === 'filesystem',
  )
}

async function readFilesystemDocumentWithoutHydration(
  adapter: NonNullable<ReturnType<typeof getDb>>,
  notaId: string,
): Promise<{ nota: Nota; exportedAt: string; revision?: string } | undefined> {
  const backend = adapter.getStorageService().getBackend() as {
    readNotaDocument?: (id: string) => Promise<{ nota: Nota; exportedAt: string; revision?: string } | null>
  }
  if (!backend.readNotaDocument) {
    throw new Error('filesystem backend does not support side-effect-free version metadata reads')
  }
  return (await backend.readNotaDocument(notaId)) ?? undefined
}

async function captureCanonicalRows(notaId: string): Promise<CanonicalRowsSnapshot> {
  return db.transaction('r', db.tables, async () => ({
    blocks: await db.getAllBlocksForNota(notaId) as Block[],
    structures: await db.blockStructures.where('notaId').equals(notaId).toArray(),
  }))
}

async function restoreCanonicalRows(
  snapshots: ReadonlyMap<string, CanonicalRowsSnapshot>,
): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const [notaId, snapshot] of snapshots) {
      await db.deleteAllBlocksForNota(notaId)
      await db.blockStructures.where('notaId').equals(notaId).delete()
      for (const block of snapshot.blocks) {
        await db.getBlockTable(block.type).put(block as never)
      }
      for (const structure of snapshot.structures) {
        await db.blockStructures.put(structure)
      }
    }
  })
}

function isFilesystemStorageConfigured(): boolean {
  try {
    return typeof localStorage !== 'undefined'
      && JSON.parse(localStorage.getItem('bashnota-storage-mode') || '{}').mode === 'filesystem'
  } catch {
    return false
  }
}

function requireReadyFilesystemHistoryAdapter(
  adapter: ReturnType<typeof getDb>,
): void {
  if (!adapter && isFilesystemStorageConfigured()) {
    throw new Error(
      'Version history is unavailable while filesystem storage is initializing. Wait a moment and try again.',
    )
  }
}

export const useNotaStore = defineStore('nota', {
  state: () => ({
    items: [] as Nota[],
    loading: false,
    error: null as string | null,
    publishedNotas: [] as string[],
  }),

  getters: {
    rootItems: (state) => {
      // Return items that don't have a parentId and are not versions
      // (i.e., they don't have a notaId property which would indicate they're a version)
      return state.items.filter(
        (item) =>
          !item.parentId &&
          // This check ensures we're only returning actual notas, not version entries
          // that might have been inadvertently added to the items array
          !('notaId' in item),
      )
    },

    getChildren: (state) => (parentId: string) => {
      return state.items.filter((item) => item.parentId === parentId)
    },

    getParents: (state) => (id: string) => {
      const findParents = (itemId: string, chain: Nota[] = []): Nota[] => {
        const item = state.items.find((i) => i.id === itemId)
        if (!item) return chain

        // If this item has a parent, recursively get its parent
        if (item.parentId) {
          const parent = state.items.find((i) => i.id === item.parentId)
          if (parent) {
            return findParents(parent.id, [parent, ...chain])
          }
        }

        return chain
      }
      return findParents(id)
    },

    getItem: (state) => (id: string) => {
      return state.items.find((item) => item.id === id)
    },

    getCurrentNota: (state) => (id: string) => {
      return state.items.find((item) => item.id === id)
    },

    getRootNotaId: (state) => (id: string) => {
      const findRoot = (itemId: string): string => {
        const item = state.items.find((i) => i.id === itemId)
        if (!item?.parentId) return itemId
        return findRoot(item.parentId)
      }
      return findRoot(id)
    },

    isPublished: (state) => (id: string) => {
      return state.publishedNotas.includes(id)
    },

    getPublicLink: () => (id: string) => {
      // Check if we're currently using a user tag URL format
      const currentPath = window.location.pathname
      const isUserTagFormat = currentPath.startsWith('/@')
      
      // Extract user tag if present (format: /@username/notaId)
      let userTag = ''
      if (isUserTagFormat) {
        const pathParts = currentPath.split('/')
        if (pathParts.length >= 2) {
          userTag = pathParts[1] // Will include the @ symbol
        }
      }
      
      const baseURL = import.meta.env.VITE_APP_BASE_URL
      
      // Return URL in the appropriate format
      if (isUserTagFormat && userTag) {
        return `${baseURL}/${userTag}/${id}`
      }
      return `${baseURL}/p/${id}`
    },
  },

  actions: {
    /**
     * Commit a fully prepared import batch as one observable outcome. IndexedDB
     * metadata and canonical rows share one transaction. External authorities
     * are quiesced and compensated from exact pre-import snapshots if any
     * metadata or canonical write fails. Pinia changes only after durability.
     */
    async commitPreparedImport(plans: PreparedNotaImport[], authorityAlreadyQuiesced = false): Promise<Nota[]> {
      if (plans.length === 0) return []
      const ids = plans.map(({ nota }) => nota.id)
      if (new Set(ids).size !== ids.length) throw new Error('Import contains duplicate nota ids.')

      const adapter = getDb()
      const blockStore = useBlockStore()
      const { restoredProseMirrorNode } = await import('@/features/editor/pm/persistedBlockConversion')
      for (const { blocks } of plans) {
        for (const block of blocks ?? []) {
          if (block.proseMirrorNode) {
            restoredProseMirrorNode({
              ...block,
              createdAt: new Date(0),
              updatedAt: new Date(0),
              version: 1,
            } as Block)
          }
        }
      }
      const itemsBefore = [...this.items]
      const memoryBefore = new Map(ids.map((id) => [id, blockStore.captureNotaMemoryState(id)]))
      const stageCommittedItems = () => {
        const imported = new Map(plans.map(({ nota }) => [nota.id, nota]))
        const existingIds = new Set(this.items.map(({ id }) => id))
        this.items = this.items.map((nota) => imported.get(nota.id) ?? nota)
        this.items.push(...plans.filter(({ nota }) => !existingIds.has(nota.id)).map(({ nota }) => nota))
      }
      const restoreMemory = () => {
        this.items = itemsBefore
        for (const [id, snapshot] of memoryBefore) blockStore.replaceNotaMemoryState(id, snapshot)
      }

      const isExternal = Boolean(
        adapter?.isUsingNewStorage()
          && adapter.getStorageService().getBackendType() !== 'indexeddb',
      )

      if (!isExternal) {
        try {
          await db.transaction('rw', db.tables, async () => {
            for (const plan of plans) {
              if (plan.blocks) {
                await blockStore.replaceNotaContent(plan.nota.id, plan.blocks, true)
                plan.nota.blockStructure = blockStore.getBlockStructure(plan.nota.id)
              }
              await db.notas.put(serializeNota(plan.nota))
            }
          })
          stageCommittedItems()
          return plans.map(({ nota }) => nota)
        } catch (error) {
          restoreMemory()
          throw error
        }
      }

      const commitExternal = async () => {
        const authority = adapter!
        const metadataBefore = new Map<string, Nota | undefined>()
        const canonicalBefore = new Map<string, CanonicalRowsSnapshot>()

        for (const id of ids) {
          const priorNota = authority.getStorageService().getBackendType() === 'filesystem'
            ? (await readFilesystemDocumentWithoutHydration(authority, id))?.nota
            : await authority.getNota(id)
          metadataBefore.set(id, priorNota ? deserializeNota(serializeNota(priorNota)) : undefined)
          canonicalBefore.set(id, await captureCanonicalRows(id))
        }

        try {
          for (const plan of plans) {
            if (plan.blocks) {
              await blockStore.replaceNotaContent(plan.nota.id, plan.blocks, true)
              plan.nota.blockStructure = blockStore.getBlockStructure(plan.nota.id)
            }
            await authority.saveNotaWithinMutation(plan.nota)
          }
        } catch (error) {
          const rollbackFailures: unknown[] = []
          try {
            await restoreCanonicalRows(canonicalBefore)
          } catch (rollbackError) {
            rollbackFailures.push(rollbackError)
          }
          for (const id of [...ids].reverse()) {
            try {
              const priorNota = metadataBefore.get(id)
              if (priorNota) await authority.saveNotaWithinMutation(priorNota)
              else await authority.deleteNotaWithinMutation(id)
            } catch (rollbackError) {
              rollbackFailures.push(rollbackError)
            }
          }
          restoreMemory()
          if (rollbackFailures.length > 0) {
            throw new Error(
              `Import failed and rollback was incomplete: ${errorMessage(error)}; rollback: ${rollbackFailures.map(errorMessage).join('; ')}`,
            )
          }
          throw error
        }
      }

      if (authorityAlreadyQuiesced) await commitExternal()
      else await runDatabaseAuthorityTransition(commitExternal)

      stageCommittedItems()
      return plans.map(({ nota }) => nota)
    },

    async createLinkedSubNota(
      parentId: string,
      childId: string,
      title: string,
      parentDocument: Record<string, unknown>,
    ): Promise<Nota> {
      const parent = this.getItem(parentId)
      if (!parent) throw new Error('Parent nota not found.')
      if (this.getItem(childId)) throw new Error('Sub-nota id already exists.')

      const now = new Date()
      const updatedParent = deserializeNota(serializeNota(parent))
      updatedParent.updatedAt = now
      const child: Nota = {
        id: childId,
        title,
        parentId,
        tags: [],
        createdAt: now,
        updatedAt: now,
        blockStructure: {
          notaId: childId,
          blockOrder: [],
          version: 1,
          lastModified: now,
        },
      }
      const { persistedBlockDataFromDocument } = await import('@/features/editor/pm/persistedBlockConversion')
      const plans: PreparedNotaImport[] = [
        { nota: updatedParent, blocks: persistedBlockDataFromDocument(parentDocument, parentId) },
        { nota: child, blocks: persistedBlockDataFromDocument({ type: 'doc', content: [] }, childId) },
      ]

      const committed = await runDatabaseAuthorityTransition(
        () => this.commitPreparedImport(plans, true),
      )
      return committed[1]
    },

    async createItem(title: string, parentId: string | null = null): Promise<Nota> {
      const notaId = nanoid()
      const nota: Nota = {
        id: notaId,
        title,
        parentId: parentId,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        blockStructure: {
          notaId: notaId,
          blockOrder: [],
          version: 1,
          lastModified: new Date(),
        },
      }

      // Use database adapter if available, otherwise fallback to direct db
      const adapter = getDb()
      if (adapter) {
        await adapter.saveNota(nota)
      } else {
        const serialized = serializeNota(nota)
        await db.notas.add(serialized)
      }
      
      this.items.push(nota)

      toast(`Nota "${title}" created successfully`)

      return nota
    },

    async cloneLocalNota(id: string): Promise<Nota> {
      const original = this.getItem(id)
      if (!original) throw new Error('Original nota not found')

      const blockStore = useBlockStore()
      await blockStore.loadNotaBlocks(id, original)
      const document = structuredClone(
        blockStore.getTiptapContent(id) ?? { type: 'doc', content: [] },
      )
      const cloneId = nanoid()
      const { persistedBlockDataFromDocument } = await import('@/features/editor/pm/persistedBlockConversion')
      const persistedBlocks = persistedBlockDataFromDocument(document, cloneId)
      const now = new Date()
      const clone: Nota = {
        ...deserializeNota(serializeNota(original)),
        id: cloneId,
        title: `${original.title} (Copy)`,
        parentId: original.parentId ?? null,
        tags: [...(original.tags ?? [])],
        createdAt: now,
        updatedAt: now,
        isPublished: false,
        publishedAt: undefined,
        citations: original.citations?.map(citation => ({
          ...citation,
          id: crypto.randomUUID(),
        })),
        blockStructure: {
          notaId: cloneId,
          blockOrder: [],
          version: 1,
          lastModified: now,
        },
      }

      await withNotaPersistence(cloneId, async () => {
        const adapter = getDb()
        try {
          if (adapter) await adapter.saveNotaWithinMutation(clone)
          else await db.notas.add(serializeNota(clone))
          await blockStore.replaceNotaContent(cloneId, persistedBlocks)
          this.items.push(clone)
          await this.persistCanonicalContent(cloneId, true)
        } catch (error) {
          this.items = this.items.filter(candidate => candidate.id !== cloneId)
          await blockStore.clearNotaBlocks(cloneId).catch(rollbackError => {
            logger.error('Failed to roll back cloned blocks:', rollbackError)
          })
          if (adapter) await adapter.deleteNotaWithinMutation(cloneId).catch(() => undefined)
          else await db.notas.delete(cloneId).catch(() => undefined)
          throw error
        }
      })

      return clone
    },

    async saveItem(nota: Nota, alreadyCoordinated = false) {
      const persist = async () => {
        const notaToSave = deserializeNota(serializeNota({
          ...nota,
          tags: nota.tags ? [...nota.tags] : [],
          updatedAt: new Date(),
        }))

        // Use database adapter if available, otherwise fallback to direct db.
        // The surrounding coordinator already owns the global mutation guard.
        const adapter = getDb()
        if (adapter) await adapter.saveNotaWithinMutation(notaToSave)
        else await db.notas.update(nota.id, serializeNota(notaToSave))

        const index = this.items.findIndex((n) => n.id === nota.id)
        if (index !== -1) this.items[index] = notaToSave
        else this.items.push(notaToSave)
      }
      if (alreadyCoordinated) await persist()
      else await withNotaPersistence(nota.id, persist)
    },

    /** Persist metadata together with the already-committed canonical block
     * snapshot when filesystem storage is authoritative. */
    async persistCanonicalContent(notaId: string, alreadyCoordinated = false): Promise<void> {
      const persist = async () => {
        const nota = this.getItem(notaId)
        if (!nota) throw new Error(`Nota with id ${notaId} not found`)
        const notaToPersist = deserializeNota(serializeNota(nota))
        const adapter = getDb()
        if (adapter) await adapter.saveNotaWithinMutation(notaToPersist)
        else await db.notas.put(serializeNota(notaToPersist))
      }
      if (alreadyCoordinated) await persist()
      else await withNotaPersistence(notaId, persist)
    },

    async loadNotas(authorityOverride?: BackupNotaAuthority) {
      this.loading = true
      try {
        const adapter = authorityOverride ?? getDb()
        const results = adapter
          ? await adapter.getAllNotas()
          : await db.notas.toArray()

        // Assign only after the entire authoritative read and normalization
        // complete. A failed read therefore retains the last known-good list.
        this.items = results.map(deserializeNota)
        this.error = null
      } catch (e) {
        logger.error(e)
        const failure = new NotaLoadError(e)
        this.error = failure.message
        throw failure
      } finally {
        this.loading = false
      }
      return this.items
    },

    async renameItem(id: string, newTitle: string) {
      const item = this.items.find((i) => i.id === id)
      if (item) {
        await this.saveItem({ ...item, title: newTitle })
      }
    },

    async updateNotaTitle(id: string, newTitle: string) {
      const item = this.items.find((i) => i.id === id)
      if (item) {
        await this.saveItem({ ...item, title: newTitle })
        return this.getItem(id)!
      }
      throw new Error(`Nota with id ${id} not found`)
    },

    async deleteItem(id: string) {
      // Deleting a locally published nota first removes its authoritative
      // publication. The database drops image references transactionally;
      // bounded cleanup then reclaims only aged, unreferenced owned assets.
      if (this.isPublished(id) || this.getCurrentNota(id)?.isPublished) await this.unpublishNota(id)

      // First delete all children
      const children = this.getChildren(id)
      for (const child of children) {
        await this.deleteItem(child.id)
      }

      await withNotaPersistence(id, async () => {
        // Resolve the item and current authority only after earlier writes for
        // this nota have drained. This prevents a delayed autosave from
        // recreating a file after an acknowledged delete.
        const item = this.items.find((candidate) => candidate.id === id)
        if (!item) return

        const adapter = getDb()
        if (adapter) await adapter.deleteNotaWithinMutation(id)
        else await db.notas.delete(id)
        this.items = this.items.filter((candidate) => candidate.id !== id)
        toast(`Nota "${item.title}" deleted successfully`)
      })
    },

    async saveNota(nota: Partial<Nota> & { id: string }) {
      const now = new Date()
      const index = this.items.findIndex((n) => n.id === nota.id)
      if (index !== -1) {
        const previousNota = this.items[index]
        const updatedNota = deserializeNota(serializeNota({
          ...previousNota,
          ...nota,
          updatedAt: now,
        }))
        this.items[index] = updatedNota

        try {
          const adapter = getDb()
          if (adapter) await adapter.saveNota(updatedNota)
          else await db.notas.put(serializeNota(updatedNota))
        } catch (error) {
          this.items[index] = previousNota
          throw error
        }
      }
    },

    async updateNotaConfig(
      notaId: string,
      updater: (config: NotaConfig) => void,
      alreadyCoordinated = false,
    ) {
      const nota = this.getItem(notaId)
      if (nota) {
        const config = nota.config || {
          kernelPreferences: {},
          savedSessions: [],
        }

        updater(config)
        nota.config = config
        await this.saveItem(nota, alreadyCoordinated)
      }
    },

    async toggleFavorite(id: string) {
      const nota = this.items.find((item) => item.id === id)
      if (nota) {
        const favorite = !nota.favorite
        await this.saveItem({ ...nota, favorite })

        toast(`Nota ${favorite ? 'added to' : 'removed from'} favorites successfully`)
      }
    },

    async loadNota(id: string) {
      try {
        if (!this.getCurrentNota(id)) {
          const adapter = getDb()
          let nota
          if (adapter) {
            nota = await adapter.getNota(id)
          } else {
            nota = await db.notas.get(id)
          }
          if (nota) {
            const deserialized = deserializeNota(nota)
            // Ensure tags is initialized when loading
            if (!deserialized.tags) {
              deserialized.tags = []
              await this.saveItem(deserialized)
            }
            this.items.push(deserialized)
          }
        }
        return this.getCurrentNota(id)
      } catch (error) {
        logger.error('Failed to load nota:', error)
        // A missing nota is represented by a successful read that returns
        // null. Preserve rejected reads so callers can offer recovery instead
        // of presenting a missing document as if it were simply absent.
        throw error
      }
    },

    /**
     * Export a nota in the new .nota format
     * 
     * The new format exports:
     * 1. Clean Tiptap JSON content (not stringified)
     * 2. All subnotas recursively (maintaining hierarchy)
     * 3. Proper metadata and versioning
     * 
     * This follows the Tiptap pattern: editor.getJSON() for clean content
     * and editor.commands.setContent(json) for restoration
     */
    async exportNota(id: string): Promise<void> {
      const nota = this.getItem(id)
      if (nota) {
        try {
          // Get all child notas recursively
          const getAllChildren = (parentId: string): Nota[] => {
            const children = this.items.filter(item => item.parentId === parentId)
            const allChildren: Nota[] = []
            
            for (const child of children) {
              allChildren.push(child)
              allChildren.push(...getAllChildren(child.id))
            }
            
            return allChildren
          }

          // Get all related notas (current nota + all children)
          const relatedNotas = [nota, ...getAllChildren(nota.id)]
          
          // Prepare the export data with proper Tiptap JSON content
          const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            nota: {
              ...serializeNota(nota),
              // Content is now stored in blocks, get it from the block system
              content: await this.getNotaContentAsTiptap(nota.id)
            },
            subnotas: relatedNotas.length > 1 ? await Promise.all(relatedNotas.slice(1).map(async subNota => ({
              ...serializeNota(subNota),
              // Content is now stored in blocks, get it from the block system
              content: await this.getNotaContentAsTiptap(subNota.id)
            }))) : []
          }

          const dataStr = JSON.stringify(exportData, null, 2)
          const blob = new Blob([dataStr], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${nota.title.replace(/[^a-z0-9]/gi, '_') || 'nota'}.nota`
          link.click()
          URL.revokeObjectURL(url)
        } catch (error) {
          logger.error('Failed to prepare nota for export:', error)
          toast(ERROR_MESSAGES.notas.exportFailed)
        }
      } else {
        toast('Nota not found for export.')
      }
    },

    /**
     * Import notas from various formats including the new .nota format
     * 
     * Supports:
     * 1. New .nota format: { nota: {...}, subnotas: [...] }
     * 2. Legacy array format: [{...}, {...}]
     * 3. Single nota format: {...}
     * 
     * Automatically handles subnotas hierarchy and maintains parent-child relationships
     */
    async importNotas(file: File): Promise<Nota[]> {
      return new Promise<Nota[]>(async (resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const text = e.target?.result as string
            if (!text) {
              toast(ERROR_MESSAGES.notas.importFailed + ': Empty file content.')
              return resolve([])
            }
            
            const importedData = JSON.parse(text)
            
            // Handle new .nota format with main nota and subnotas
            let rawNotasToImport: any[] = []
            
            if (importedData.nota && importedData.subnotas) {
              // New .nota format
              rawNotasToImport = [importedData.nota, ...importedData.subnotas]
            } else if (Array.isArray(importedData)) {
              // Legacy array format
              rawNotasToImport = importedData
            } else if (importedData.id) {
              // Single nota format
              rawNotasToImport = [importedData]
            } else {
              throw new Error('Invalid .nota file format')
            }

            // A batch is validation-atomic: fully schema-check and convert every
            // inline document before changing nota metadata, hierarchy, Pinia,
            // block structures, or any typed block table.
            const { persistedBlockDataFromDocument } = await import('@/features/editor/pm/persistedBlockConversion')
            for (const notaData of rawNotasToImport) {
              if (notaData.content != null) {
                persistedBlockDataFromDocument(notaData.content, String(notaData.id ?? 'pending-import'))
              }
            }

            const allCurrentNotaIds = new Set(this.items.map(item => item.id))
            const importedNotaIdsInBatch = new Set(rawNotasToImport.map(n => n.id).filter(id => id != null))
            
            const cleanedNotas: Nota[] = []
            const preparedImports: PreparedNotaImport[] = []

            for (const notaData of rawNotasToImport) {
              const { content: inlineContent, ...notaMetadata } = notaData as Record<string, unknown>
              const deserializedNota = deserializeNota(notaMetadata)

              if (deserializedNota.parentId) {
                const parentExistsInStore = allCurrentNotaIds.has(deserializedNota.parentId)
                const parentExistsInBatch = importedNotaIdsInBatch.has(deserializedNota.parentId)
                if (!parentExistsInStore && !parentExistsInBatch) {
                  cleanedNotas.push(JSON.parse(JSON.stringify(deserializedNota)));
                  deserializedNota.parentId = null;
                }
              }

              const existingNota = this.getItem(deserializedNota.id)
              const nota = existingNota
                ? deserializeNota({
                    ...serializeNota(existingNota),
                    ...serializeNota(deserializedNota),
                    createdAt: existingNota.createdAt,
                    updatedAt: new Date(),
                  })
                : deserializeNota({
                    ...serializeNota(deserializedNota),
                    id: deserializedNota.id || nanoid(),
                    createdAt: deserializedNota.createdAt ? new Date(deserializedNota.createdAt) : new Date(),
                    updatedAt: new Date(),
                  })
              preparedImports.push({
                nota,
                ...(inlineContent != null
                  ? { blocks: persistedBlockDataFromDocument(inlineContent, nota.id) }
                  : existingNota
                    ? {}
                    : { blocks: [] }),
              })
            }

            const successfullyImportedNotas = await this.commitPreparedImport(preparedImports)

            if (cleanedNotas.length > 0 && successfullyImportedNotas.length > 0) {
              const cleanedTitles = cleanedNotas.map(n => `"${n.title || n.id}"`).join(', ')
              toast(
                `${cleanedNotas.length} sub-nota(s) had their parent reference removed and were imported as root notas: ${cleanedTitles}.`
              )
            }

            resolve(successfullyImportedNotas)
          } catch (error: any) {
            logger.error('Import error in store:', error)
            reject(error)
          }
        }
        reader.onerror = (error) => {
          logger.error('File reading error:', error)
          reject(new Error('Could not read import file.'))
        }
        reader.readAsText(file)
      })
    },

    async exportAllNotas(authorityOverride?: BackupNotaAuthority): Promise<BashNotaBackupArchive> {
      const { createBackupArchive } = await import('@/features/nota/services/backupArchiveService')
      const authority = resolveBackupAuthority(authorityOverride)
      const archive = await createBackupArchive(db, authority)
      if (archive.notas.length === 0) throw new Error('There are no notas to export.')

      const dataStr = JSON.stringify(archive, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      try {
        const link = document.createElement('a')
        link.href = url
        link.download = `bashnota_backup_${new Date().toISOString().split('T')[0]}${FILE_EXTENSIONS.json}`
        link.click()
      } finally {
        URL.revokeObjectURL(url)
      }
      return archive
    },

    async importAllNotas(input: unknown, authorityOverride?: BackupNotaAuthority): Promise<{ notaCount: number }> {
      const { BLOCK_TABLES, restoreBackupArchive } = await import('@/features/nota/services/backupArchiveService')
      const authority = resolveBackupAuthority(authorityOverride)
      const blockStore = useBlockStore()
      const itemsBefore = this.items
      const blocksBefore = new Map(blockStore.blocks)
      const structuresBefore = new Map(blockStore.blockStructures)

      try {
        const archive = await restoreBackupArchive(
          input,
          (validated) => {
            this.items = validated.notas.map(deserializeNota)
            blockStore.blocks.clear()
            blockStore.blockStructures.clear()

            for (const [tableName, type] of Object.entries(BLOCK_TABLES)) {
              for (const row of validated.blocks[tableName as keyof typeof BLOCK_TABLES]) {
                const block = {
                  ...row,
                  createdAt: new Date(row.createdAt as string),
                  updatedAt: new Date(row.updatedAt as string),
                  ...(type === 'aiGeneration' && typeof row.timestamp === 'string'
                    ? { timestamp: new Date(row.timestamp) }
                    : {}),
                }
                blockStore.blocks.set(`${type}:${String(row.id)}`, block as any)
              }
            }
            for (const row of validated.blockStructures) {
              blockStore.blockStructures.set(row.notaId as string, blockStore.deserializeBlockStructure(row))
            }
          },
          db,
          () => {
            this.items = itemsBefore
            blockStore.blocks.clear()
            blocksBefore.forEach((block, id) => blockStore.blocks.set(id, block))
            blockStore.blockStructures.clear()
            structuresBefore.forEach((structure, id) => blockStore.blockStructures.set(id, structure))
          },
          authority,
        )
        return { notaCount: archive.notas.length }
      } catch (error) {
        this.items = itemsBefore
        blockStore.blocks.clear()
        blocksBefore.forEach((block, id) => blockStore.blocks.set(id, block))
        blockStore.blockStructures.clear()
        structuresBefore.forEach((structure, id) => blockStore.blockStructures.set(id, structure))
        throw error
      }
    },

    async saveNotaVersion(version: {
      id: string
      versionName: string
      createdAt: Date
      prepareCanonical?: () => Promise<() => void>
    }): Promise<NotaVersion> {
      return withNotaPersistence(version.id, () => this.saveNotaVersionWithinPersistence(version))
    },

    async saveNotaVersionWithinPersistence(version: {
      id: string
      versionName: string
      createdAt: Date
      prepareCanonical?: () => Promise<() => void>
    }): Promise<NotaVersion> {
      const { captureCanonicalContent, restoreCanonicalContent } = await import('@/features/nota/services/versionHistoryPersistence')
      const nota = this.getCurrentNota(version.id)
      if (!nota) throw new Error('Unable to save version: nota not found')

      const blockStore = useBlockStore()
      const memoryBefore = blockStore.captureNotaMemoryState(version.id)
      let rollbackPreparedContent: (() => void) | undefined
      let notaVersion: NotaVersion | undefined
      let committedVersions: NotaVersion[] | undefined
      const adapter = getDb()
      requireReadyFilesystemHistoryAdapter(adapter)

      if (isFilesystemStorageAdapter(adapter)) {
        let canonicalBefore: CanonicalNotaContentSnapshot | undefined
        let preparedCanonical: CanonicalNotaContentSnapshot | undefined
        try {
          // A filesystem Nota owns its serialized history. Capture the current
          // block state before a live-editor preparation so a failed file write
          // can leave the separately persisted canonical rows unchanged too.
          const persistedBeforePreparation = await readFilesystemDocumentWithoutHydration(adapter, version.id)
          if (!persistedBeforePreparation) throw new Error('nota disappeared before its version could be written')
          canonicalBefore = await db.transaction('r', db.tables, () => captureCanonicalContent(version.id))
          rollbackPreparedContent = await version.prepareCanonical?.()
          preparedCanonical = await db.transaction('r', db.tables, () => captureCanonicalContent(version.id))
          // Re-read immediately before append to merge the freshest file
          // history, but never use adapter.getNota here: the real filesystem
          // read hydrates file canonical rows and would revert the live edit.
          const persistedCurrentDocument = await readFilesystemDocumentWithoutHydration(adapter, version.id)
          if (!persistedCurrentDocument) throw new Error('nota disappeared before its version could be written')
          const persistedCurrent = deserializeNota(persistedCurrentDocument.nota)

          notaVersion = {
            id: nanoid(),
            notaId: version.id,
            nota: versionMetadata(persistedCurrent),
            canonicalContent: preparedCanonical,
            versionName: version.versionName,
            createdAt: version.createdAt.toISOString(),
          }

          const persistedVersions = persistedCurrent.versions || []
          committedVersions = [...persistedVersions, notaVersion]
          const backend = adapter.getStorageService().getBackend() as {
            writeNotaIfDocumentUnchanged?: (nota: Nota, expectedExportedAt: string) => Promise<void>
          }
          if (!backend.writeNotaIfDocumentUnchanged) {
            throw new Error('filesystem backend does not support conflict-aware version history writes')
          }
          await backend.writeNotaIfDocumentUnchanged(
            deserializeNota(serializeNota({ ...persistedCurrent, versions: committedVersions })),
            persistedCurrentDocument.revision ?? persistedCurrentDocument.exportedAt,
          )
        } catch (error) {
          rollbackPreparedContent?.()
          try {
            if (canonicalBefore && preparedCanonical) {
              await db.transaction('rw', db.tables, async () => {
                const current = await captureCanonicalContent(version.id)
                if (canonicalSnapshotFingerprint(current) === canonicalSnapshotFingerprint(preparedCanonical!)) {
                  await restoreCanonicalContent(version.id, canonicalBefore!)
                }
              })
            }
          } catch (rollbackError) {
            blockStore.replaceNotaMemoryState(version.id, memoryBefore)
            throw new Error(
              `Unable to save version "${version.versionName}" and filesystem rollback was incomplete: ${errorMessage(error)}; rollback: ${errorMessage(rollbackError)}`,
            )
          }
          blockStore.replaceNotaMemoryState(version.id, memoryBefore)
          logger.error('Failed to save filesystem nota version:', error)
          throw new Error(
            `Unable to save version "${version.versionName}": ${errorMessage(error)}. No changes were committed.`,
          )
        }

        if (!notaVersion) throw new Error('filesystem version write completed without a version record')
        Object.assign(nota, notaVersion.nota, { versions: committedVersions || [notaVersion] })
        return notaVersion
      }

      let canonicalBefore: CanonicalNotaContentSnapshot | undefined
      let preparedCanonical: CanonicalNotaContentSnapshot | undefined
      try {
        // Preparing the live editor can await arbitrary application work. It
        // must not run inside a Dexie transaction: IndexedDB may auto-commit
        // while that promise is pending and then reject the history append
        // with PrematureCommitError. The outer per-nota persistence guard keeps
        // this preparation serialized; explicit compensation below makes the
        // two durable steps atomic from the application's point of view.
        canonicalBefore = await db.transaction('r', db.tables, () => captureCanonicalContent(version.id))
        rollbackPreparedContent = await version.prepareCanonical?.()
        preparedCanonical = await db.transaction('r', db.tables, () => captureCanonicalContent(version.id))

        await db.transaction('rw', [db.notas], async () => {
          const persistedNota = await db.notas.get(version.id)
          if (!persistedNota) throw new Error('nota disappeared before its version could be written')
          const persistedCurrent = deserializeNota(persistedNota)

          notaVersion = {
            id: nanoid(),
            notaId: version.id,
            nota: versionMetadata(persistedCurrent),
            canonicalContent: preparedCanonical,
            versionName: version.versionName,
            createdAt: version.createdAt.toISOString(),
          }

          const persistedVersions = persistedCurrent.versions || []
          committedVersions = [...persistedVersions, notaVersion]
          const serialized = serializeNota({
            ...persistedCurrent,
            versions: committedVersions,
          })
          await db.notas.put(serialized)
        })

        if (!notaVersion) throw new Error('version transaction completed without a version record')
        Object.assign(nota, notaVersion.nota, { versions: committedVersions || [notaVersion] })
        return notaVersion
      } catch (error) {
        try {
          rollbackPreparedContent?.()
          if (canonicalBefore && preparedCanonical) {
            await db.transaction('rw', db.tables, async () => {
              const current = await captureCanonicalContent(version.id)
              if (canonicalSnapshotFingerprint(current) === canonicalSnapshotFingerprint(preparedCanonical!)) {
                await restoreCanonicalContent(version.id, canonicalBefore!)
              }
            })
          }
        } catch (rollbackError) {
          blockStore.replaceNotaMemoryState(version.id, memoryBefore)
          throw new Error(
            `Unable to save version "${version.versionName}" and IndexedDB rollback was incomplete: ${errorMessage(error)}; rollback: ${errorMessage(rollbackError)}`,
          )
        }
        blockStore.replaceNotaMemoryState(version.id, memoryBefore)
        logger.error('Failed to save nota version:', error)
        throw new Error(
          `Unable to save version "${version.versionName}": ${errorMessage(error)}. No changes were committed.`,
        )
      }
    },

    getNotaVersions(notaId: string) {
      const nota = this.getCurrentNota(notaId)
      return nota?.versions || []
    },

    async restoreVersion(notaId: string, versionId: string): Promise<RestoreVersionResult> {
      return withNotaPersistence(notaId, () => this.restoreVersionWithinPersistence(notaId, versionId))
    },

    async restoreVersionWithinPersistence(notaId: string, versionId: string): Promise<RestoreVersionResult> {
      const { captureCanonicalContent, restoreCanonicalContent } = await import('@/features/nota/services/versionHistoryPersistence')
      const nota = this.getCurrentNota(notaId)
      if (!nota || !nota.versions) throw new Error('Unable to restore version: nota or history not found')
      const version = nota.versions.find((candidate) => candidate.id === versionId)
      if (!version) throw new Error('Unable to restore version: selected version not found')

      const blockStore = useBlockStore()
      let restoredCanonicalState: RestoredCanonicalState | undefined
      let restoredNota: Nota | undefined
      let isLegacy = !version.canonicalContent
      const adapter = getDb()
      requireReadyFilesystemHistoryAdapter(adapter)

      if (isFilesystemStorageAdapter(adapter)) {
        let canonicalBefore: CanonicalNotaContentSnapshot | undefined
        try {
          const persistedNota = await adapter.getNota(notaId)
          if (!persistedNota) throw new Error('nota disappeared before restore could begin')

          const persistedCurrent = deserializeNota(persistedNota)
          const persistedVersion = persistedCurrent.versions?.find((candidate) => candidate.id === versionId)
          if (!persistedVersion) throw new Error('selected version is no longer present in persisted history')
          isLegacy = !persistedVersion.canonicalContent

          const historicalMetadata = JSON.parse(JSON.stringify(persistedVersion.nota)) as NotaVersion['nota']
          restoredNota = {
            ...persistedCurrent,
            ...historicalMetadata,
            id: notaId,
            // History is append-only and never rolls back with document metadata.
            versions: persistedCurrent.versions || nota.versions,
            updatedAt: new Date(),
          }

          const canonicalSnapshot = persistedVersion.canonicalContent
          if (canonicalSnapshot) {
            // Keep filesystem I/O outside the Dexie transaction. Dexie commits
            // transactions around arbitrary async work, so awaiting a file
            // write inside one can turn a successful restore into a premature
            // transaction commit. Roll the canonical rows back explicitly if
            // the subsequent authoritative file write fails.
            canonicalBefore = await captureCanonicalContent(notaId)
            const restoredCanonical = await db.transaction('rw', db.tables, async () => {
              return restoreCanonicalContent(notaId, canonicalSnapshot)
            })
            restoredCanonicalState = restoredCanonical
            restoredNota.blockStructure = restoredCanonical.structure
            restoredNota.blockStructureId = restoredCanonical.structure.id
          } else {
            restoredNota.blockStructure = persistedCurrent.blockStructure
            restoredNota.blockStructureId = persistedCurrent.blockStructureId
          }

          await adapter.saveNotaWithinMutation(deserializeNota(serializeNota(restoredNota)))
        } catch (error) {
          if (canonicalBefore) {
            await db.transaction('rw', db.tables, async () => {
              await restoreCanonicalContent(notaId, canonicalBefore!)
            })
          }
          logger.error('Failed to restore filesystem nota version:', error)
          throw new Error(
            `Unable to restore version "${version.versionName}": ${errorMessage(error)}. The current nota and history were left unchanged.`,
          )
        }

        if (!restoredNota) throw new Error('filesystem restore completed without restored metadata')
        const itemIndex = this.items.findIndex((item) => item.id === notaId)
        if (itemIndex !== -1) this.items[itemIndex] = restoredNota
        if (restoredCanonicalState) blockStore.replaceNotaMemoryState(notaId, restoredCanonicalState)

        return isLegacy
          ? {
              kind: 'legacy-metadata-only',
              message: 'This older version contains metadata only. Metadata was restored; the current document body was left unchanged.',
            }
          : { kind: 'canonical', message: 'Metadata and document content were restored.' }
      }

      try {
        await db.transaction('rw', db.tables, async () => {
          const persistedNota = await db.notas.get(notaId)
          if (!persistedNota) throw new Error('nota disappeared before restore could begin')

          const persistedCurrent = deserializeNota(persistedNota)
          const persistedVersion = persistedCurrent.versions?.find((candidate) => candidate.id === versionId)
          if (!persistedVersion) throw new Error('selected version is no longer present in persisted history')
          isLegacy = !persistedVersion.canonicalContent
          const historicalMetadata = JSON.parse(JSON.stringify(persistedVersion.nota)) as NotaVersion['nota']
          restoredNota = {
            ...persistedCurrent,
            ...historicalMetadata,
            id: notaId,
            // History is append-only and never rolls back with document metadata.
            versions: persistedCurrent.versions || nota.versions,
            updatedAt: new Date(),
          }

          if (persistedVersion.canonicalContent) {
            restoredCanonicalState = await restoreCanonicalContent(notaId, persistedVersion.canonicalContent)
            restoredNota.blockStructure = restoredCanonicalState.structure
            restoredNota.blockStructureId = restoredCanonicalState.structure.id
          } else {
            // Explicit compatibility contract: old entries never had a body.
            restoredNota.blockStructure = persistedCurrent.blockStructure
            restoredNota.blockStructureId = persistedCurrent.blockStructureId
          }

          await db.notas.put(serializeNota(restoredNota))
        })

        if (!restoredNota) throw new Error('restore transaction completed without restored metadata')
        const itemIndex = this.items.findIndex((item) => item.id === notaId)
        if (itemIndex !== -1) this.items[itemIndex] = restoredNota
        if (restoredCanonicalState) {
          blockStore.replaceNotaMemoryState(notaId, restoredCanonicalState)
        }

        return isLegacy
          ? {
              kind: 'legacy-metadata-only',
              message: 'This older version contains metadata only. Metadata was restored; the current document body was left unchanged.',
            }
          : { kind: 'canonical', message: 'Metadata and document content were restored.' }
      } catch (error) {
        logger.error('Failed to restore version:', error)
        throw new Error(
          `Unable to restore version "${version.versionName}": ${errorMessage(error)}. The current nota and history were left unchanged.`,
        )
      }
    },

    async deleteVersion(notaId: string, versionId: string): Promise<boolean> {
      return withNotaPersistence(notaId, () => this.deleteVersionWithinPersistence(notaId, versionId))
    },

    async deleteVersionWithinPersistence(notaId: string, versionId: string): Promise<boolean> {
      try {
        const nota = this.getCurrentNota(notaId)
        if (!nota || !nota.versions) throw new Error('Nota or versions not found')

        const adapter = getDb()
        requireReadyFilesystemHistoryAdapter(adapter)
        if (isFilesystemStorageAdapter(adapter)) {
          const persistedDocument = await readFilesystemDocumentWithoutHydration(adapter, notaId)
          if (!persistedDocument) throw new Error('nota disappeared before its version could be deleted')
          const persistedCurrent = deserializeNota(persistedDocument.nota)
          const persistedVersions = persistedCurrent.versions || []
          if (!persistedVersions.some((candidate) => candidate.id === versionId)) {
            throw new Error('selected version is no longer present in persisted history')
          }

          const committedVersions = persistedVersions.filter((candidate) => candidate.id !== versionId)
          const backend = adapter.getStorageService().getBackend() as {
            writeNotaIfDocumentUnchanged?: (nota: Nota, expectedGeneration: string) => Promise<void>
          }
          if (!backend.writeNotaIfDocumentUnchanged) {
            throw new Error('filesystem backend does not support conflict-aware version history writes')
          }
          await backend.writeNotaIfDocumentUnchanged(
            deserializeNota(serializeNota({ ...persistedCurrent, versions: committedVersions })),
            persistedDocument.revision ?? persistedDocument.exportedAt,
          )
          nota.versions = committedVersions
          return true
        }

        let committedVersions: NotaVersion[] = []
        await db.transaction('rw', db.notas, async () => {
          const persistedNota = await db.notas.get(notaId)
          if (!persistedNota) throw new Error('nota disappeared before its version could be deleted')
          const persistedCurrent = deserializeNota(persistedNota)
          const persistedVersions = persistedCurrent.versions || []
          if (!persistedVersions.some((candidate) => candidate.id === versionId)) {
            throw new Error('selected version is no longer present in persisted history')
          }
          committedVersions = persistedVersions.filter((candidate) => candidate.id !== versionId)
          await db.notas.put(serializeNota({ ...persistedCurrent, versions: committedVersions }))
        })
        nota.versions = committedVersions

        return true
      } catch (error) {
        logger.error('Failed to delete version:', error)
        throw error
      }
    },

    async getSubPages(notaId: string, failOnReadError = false): Promise<Nota[]> {
      try {
        const loadedIds = new Set(this.items.map(item => item.id))
        const loadedChildren = this.items.filter(item => item.parentId === notaId)
        const adapter = getDb()
        const persistedChildren = adapter
          ? (await adapter.getAllNotas()).filter(item => item.parentId === notaId)
          : await db.notas.where('parentId').equals(notaId).toArray()

        // Loaded state wins for edited/reparented notas, while authoritative
        // children absent from a partially hydrated store are still included.
        return [
          ...loadedChildren,
          ...persistedChildren
            .filter(item => !loadedIds.has(item.id))
            .map(deserializeNota),
        ]
      } catch (error) {
        logger.error('Failed to get sub-pages:', error)
        if (failOnReadError) throw error
        return []
      }
    },

    async getPublishedSubPages(notaId: string): Promise<string[]> {
      try {
        // Get all sub-pages
        const subPages = await this.getSubPages(notaId)

        // Filter out only published ones by checking publishedNotas
        const publishedIds: string[] = []

        for (const subPage of subPages) {
          if (this.isPublished(subPage.id)) {
            publishedIds.push(subPage.id)
          }
        }

        return publishedIds
      } catch (error) {
        logger.error('Failed to get published sub-pages:', error)
        return []
      }
    },

    async getAllDescendants(notaId: string): Promise<Nota[]> {
      const result: Nota[] = []
      const subPages = await this.getSubPages(notaId)

      // Add immediate sub-pages
      result.push(...subPages)

      // Recursively add sub-pages of sub-pages
      for (const subPage of subPages) {
        const descendants = await this.getAllDescendants(subPage.id)
        result.push(...descendants)
      }

      return result
    },

    /**
     * Create a sub-nota under a parent
     */
    async createSubNota(parentId: string, title: string): Promise<Nota> {
      if (!parentId) {
        throw new Error('Parent ID is required for sub-nota creation')
      }

      const parentNota = this.getItem(parentId)
      if (!parentNota) {
        throw new Error('Parent nota not found')
      }

      const notaId = nanoid()
      const nota: Nota = {
        id: notaId,
        title,
        parentId: parentId,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        blockStructure: {
          notaId: notaId,
          blockOrder: [],
          version: 1,
          lastModified: new Date(),
        },
      }

      const adapter = getDb()
      if (adapter) await adapter.saveNota(nota)
      else await db.notas.add(serializeNota(nota))
      this.items.push(nota)

      toast(`Sub-nota "${title}" created successfully under "${parentNota.title}"`)
      return nota
    },

    /**
     * Move a nota to become a sub-nota of another nota
     */
    async moveNota(notaId: string, newParentId: string | null): Promise<boolean> {
      const nota = this.getItem(notaId)
      if (!nota) {
        throw new Error('Nota not found')
      }

      // Prevent circular references
      if (newParentId) {
        const newParent = this.getItem(newParentId)
        if (!newParent) {
          throw new Error('New parent nota not found')
        }

        // Check if moving would create a circular reference
        if (this.wouldCreateCircularReference(notaId, newParentId)) {
          throw new Error('Cannot move nota: would create circular reference')
        }
      }

      await this.saveItem({ ...nota, parentId: newParentId })

      const action = newParentId ? 'moved to' : 'moved from'
      const target = newParentId ? this.getItem(newParentId)?.title : 'root level'
      toast(`Nota "${nota.title}" ${action} "${target}"`)

      return true
    },

    /**
     * Check if moving a nota would create a circular reference
     */
    wouldCreateCircularReference(notaId: string, newParentId: string): boolean {
      if (notaId === newParentId) return true

      const checkAncestors = (currentId: string, targetId: string): boolean => {
        const current = this.getItem(currentId)
        if (!current?.parentId) return false
        if (current.parentId === targetId) return true
        return checkAncestors(current.parentId, targetId)
      }

      return checkAncestors(newParentId, notaId)
    },

    /**
     * Get the full hierarchy path for a nota
     */
    getNotaHierarchy(notaId: string): Nota[] {
      const hierarchy: Nota[] = []
      let currentId = notaId

      while (currentId) {
        const nota = this.getItem(currentId)
        if (!nota) break
        
        hierarchy.unshift(nota)
        currentId = nota.parentId || ''
      }

      return hierarchy
    },

    /**
     * Get the depth level of a nota in the hierarchy
     */
    getNotaDepth(notaId: string): number {
      let depth = 0
      let currentId = notaId

      while (currentId) {
        const nota = this.getItem(currentId)
        if (!nota?.parentId) break
        depth++
        currentId = nota.parentId
      }

      return depth
    },

    /**
     * Export a nota with all its sub-notas
     */
    async exportNotaWithSubNotas(notaId: string): Promise<any> {
      const mainNota = this.getItem(notaId)
      if (!mainNota) {
        throw new Error('Nota not found')
      }

      const descendants = await this.getAllDescendants(notaId)
      const allRelatedNotas = [mainNota, ...descendants]
      
      // Get content for each nota
      const notasWithContent = await Promise.all(
        allRelatedNotas.map(async (nota) => ({
          ...serializeNota(nota),
          content: await this.getNotaContentAsTiptap(nota.id)
        }))
      )

      return {
        nota: notasWithContent[0], // Main nota
        subnotas: notasWithContent.slice(1) // All sub-notas
      }
    },

    /**
     * Import a nota with sub-notas, maintaining hierarchy
     */
    async importNotaWithSubNotas(importData: any): Promise<Nota[]> {
      if (!importData.nota) {
        throw new Error('Invalid import data: missing main nota')
      }

      const importedNotas: Nota[] = []
      const idMapping = new Map<string, string>() // old ID -> new ID

      // Detach the plan from the caller before validation. Without this clone a
      // caller could mutate a later child's content while the first DB await is
      // in flight, invalidating the preflight guarantee.
      const allNotas = JSON.parse(JSON.stringify([
        importData.nota,
        ...(importData.subnotas || []),
      ])) as any[]

      const { persistedBlockDataFromDocument } = await import('@/features/editor/pm/persistedBlockConversion')

      // Generate the complete ID plan and validate every inline document before
      // the first nota/parent/Pinia/DB mutation. A later invalid child therefore
      // cannot leave an earlier root partially imported.
      for (const notaData of allNotas) {
        idMapping.set(notaData.id, nanoid())
      }
      for (const notaData of allNotas) {
        if (notaData.content != null) {
          persistedBlockDataFromDocument(notaData.content, idMapping.get(notaData.id)!)
        }
      }
      
      // First, create all notas without parent relationships
      for (const notaData of allNotas) {
        const newId = idMapping.get(notaData.id)!

        const newNota: Nota = {
          ...deserializeNota(notaData),
          id: newId,
          parentId: null, // Will be set after all notas are created
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const adapter = getDb()
        if (adapter) await adapter.saveNota(newNota)
        else await db.notas.add(serializeNota(newNota))
        this.items.push(newNota)
        importedNotas.push(newNota)
      }

      // Now establish parent-child relationships
      for (const notaData of allNotas) {
        if (notaData.parentId) {
          const newNotaId = idMapping.get(notaData.id)
          const newParentId = idMapping.get(notaData.parentId)
          
          if (newNotaId && newParentId) {
            await this.moveNota(newNotaId, newParentId)
          }
        }
      }

      // Import content for each nota
      for (let i = 0; i < allNotas.length; i++) {
        const notaData = allNotas[i]
        const newNotaId = idMapping.get(notaData.id)
        
        if (newNotaId && notaData.content) {
          const blockStore = useBlockStore()
          await blockStore.importTiptapContent(newNotaId, notaData.content)
          await this.persistCanonicalContent(newNotaId)
        }
      }

      return importedNotas
    },

    async publishNota(id: string, includeSubPages = false): Promise<PublishedNota> {
      const active = publicationHierarchyInFlight.get(id)
      if (active) {
        // A full hierarchy commit satisfies a concurrent root-only request. If
        // the stronger request arrives second, queue it instead of reporting
        // the weaker root-only commit as its success.
        if (active.includeSubPages || !includeSubPages) return active.promise
        await active.promise.catch(() => undefined)
        if (publicationHierarchyInFlight.get(id) === active) publicationHierarchyInFlight.delete(id)
        return this.publishNota(id, true)
      }

      const operation = this.publishNotaHierarchy(id, includeSubPages)
      const entry = { includeSubPages, promise: operation }
      publicationHierarchyInFlight.set(id, entry)
      try {
        return await operation
      } finally {
        if (publicationHierarchyInFlight.get(id) === entry) publicationHierarchyInFlight.delete(id)
      }
    },

    async publishNotaHierarchy(id: string, includeSubPages = false): Promise<PublishedNota> {
      const uploadedImagePaths: string[] = []
      let remoteCommitted = false
      try {
        const rootNota = this.getCurrentNota(id)
        if (!rootNota) throw new Error('Nota not found')

        toast(`Processing content for "${rootNota.title}"...`)

        const hierarchy: Array<{ nota: Nota; childIds: string[] }> = []
        const visiting = new Set<string>()
        const visited = new Set<string>()
        const collect = async (nota: Nota): Promise<void> => {
          if (visiting.has(nota.id)) throw new Error(`Cannot publish cyclic hierarchy at nota ${nota.id}`)
          if (visited.has(nota.id)) throw new Error(`Cannot publish duplicate hierarchy nota ${nota.id}`)
          visiting.add(nota.id)
          const children = includeSubPages ? await this.getSubPages(nota.id, true) : []
          hierarchy.push({ nota, childIds: children.map(child => child.id) })
          for (const child of children) await collect(child)
          visiting.delete(nota.id)
          visited.add(nota.id)
        }

        await collect(rootNota)
        if (!includeSubPages) {
          const existing = await this.getPublishedNota(id)
          hierarchy[0].childIds = existing?.publishedSubPages ?? []
        } else if (hierarchy.length > 1) {
          toast(`Publishing ${hierarchy.length - 1} descendant nota(s)...`)
        }

        const authStore = useAuthStore()
        const actor = authStore.currentUser
        if (!actor) throw new Error('Sign in is required to publish')
        const blockStore = useBlockStore()
        const writes: CloudPublicationWrite[] = []
        for (const entry of hierarchy) {
          let tiptapContent = blockStore.getTiptapContent(entry.nota.id)
          if (!tiptapContent) {
            await blockStore.loadNotaBlocks(entry.nota.id, entry.nota)
            tiptapContent = blockStore.getTiptapContent(entry.nota.id)
          }
          if (!tiptapContent) throw new Error(`No content available to publish for "${entry.nota.title}"`)
          const processedContent = await processNotaContent(tiptapContent, {
            publishedSubPages: entry.childIds,
            uploadedImagePaths,
          })
          const canonicalContent = normalizeCloudPublishedContent(processedContent)
          if (!canonicalContent) throw new Error(`Published content for "${entry.nota.title}" must be a JSON document object`)
          writes.push({
            id: entry.nota.id,
            authorId: actor.uid,
            title: entry.nota.title,
            content: canonicalContent,
            authorName: actor.displayName ?? '',
            isPublic: true,
            isSubPage: Boolean(entry.nota.parentId),
            parentId: entry.nota.parentId ?? null,
            tags: entry.nota.tags ?? [],
            citations: (entry.nota.citations ?? []) as unknown as CloudJson[],
            publishedSubPages: entry.childIds,
            publishedAt: entry.nota.publishedAt ? String(entry.nota.publishedAt) : new Date().toISOString(),
            updatedAt: entry.nota.updatedAt instanceof Date
              ? entry.nota.updatedAt.toISOString()
              : String(entry.nota.updatedAt),
          })
        }

        const api = await getPublicationCloudApi()
        const result = await api.publishing.upsertPublicationHierarchy(writes)
        let committed = result.ok ? result.data : null
        if (!result.ok && (result.error.code === 'unavailable' || result.error.code === 'unknown')) {
          const reconciled: CloudPublication[] = []
          let anyMatchingPublication = false
          let reconciliationUnavailable = false
          for (const write of writes) {
            const read = await api.publishing.getPublication(write.id)
            if (!read.ok) {
              reconciliationUnavailable = true
              break
            }
            if (read.data && publicationMatchesWrite(read.data, write)) {
              anyMatchingPublication = true
              reconciled.push(read.data)
            }
          }
          if (!reconciliationUnavailable && reconciled.length === writes.length) {
            committed = reconciled
          } else if (reconciliationUnavailable || anyMatchingPublication) {
            remoteCommitted = true
            throw new CloudError(
              'unavailable',
              'Publication outcome is indeterminate; uploaded images were retained. Refresh published notas before retrying.',
              result.error,
            )
          }
        }
        if (!committed) throw result.ok ? new Error('Published hierarchy returned no rows') : result.error
        remoteCommitted = true
        const publishedById = new Map(committed.map(value => [value.id, publishedNota(value)]))
        if (publishedById.size !== hierarchy.length || !publishedById.has(id)) {
          throw new Error('Published hierarchy response was incomplete')
        }

        // Remote publication is authoritative. Apply every local cache marker
        // synchronously only after the complete hierarchy has committed.
        this.publishedNotas = [...new Set([...this.publishedNotas, ...publishedById.keys()])]
        for (const entry of hierarchy) {
          const published = publishedById.get(entry.nota.id)!
          entry.nota.isPublished = true
          entry.nota.publishedAt = published.publishedAt
        }

        toast(`Nota "${rootNota.title}" published successfully`)

        return publishedById.get(id)!
      } catch (error) {
        if (!remoteCommitted && uploadedImagePaths.length > 0) {
          try {
            await deletePublishedImages(uploadedImagePaths)
          } catch (cleanupError) {
            logger.error('Failed to clean up images after publication failure:', cleanupError)
            throw new Error(
              `Publication failed and uploaded-image cleanup was incomplete: ${errorMessage(error)}; cleanup: ${errorMessage(cleanupError)}`,
            )
          }
        }
        logger.error('Failed to publish nota:', error)
        toast('Failed to publish nota')
        throw error
      }
    },

    async unpublishNota(id: string): Promise<boolean> {
      try {
        const nota = this.getCurrentNota(id)

        // Capture the complete local descendant closure before the remote RPC
        // recursively deletes it. Child deleteItem calls must not try to
        // unpublish rows that the root transaction has already removed.
        const publishedSubPageIds: string[] = []
        const seenSubPages = new Set<string>()
        const traversedSubPages = new Set<string>()
        const collectPublishedDescendants = async (parentId: string): Promise<void> => {
          for (const subPage of await this.getSubPages(parentId)) {
            if (!seenSubPages.has(subPage.id) && (this.isPublished(subPage.id) || subPage.isPublished)) {
              seenSubPages.add(subPage.id)
              publishedSubPageIds.push(subPage.id)
            }
            if (traversedSubPages.has(subPage.id)) continue
            traversedSubPages.add(subPage.id)
            await collectPublishedDescendants(subPage.id)
          }
        }

        // Get published nota to check for published sub-pages
        const publishedNota = await this.getPublishedNota(id).catch(() => null)
        const displayTitle = nota?.title ?? publishedNota?.title ?? 'Nota'

        for (const publishedId of publishedNota?.publishedSubPages ?? []) {
          if (!seenSubPages.has(publishedId)) {
            seenSubPages.add(publishedId)
            publishedSubPageIds.push(publishedId)
          }
        }
        await collectPublishedDescendants(id)

        // Call the API to unpublish the nota and all sub-pages
        const api = await getPublicationCloudApi()
        const result = await api.publishing.deletePublication(id)
        if (!result.ok) throw result.error

        const remotelyRemovedIds = new Set([id, ...publishedSubPageIds])
        this.publishedNotas = this.publishedNotas.filter((notaId) => !remotelyRemovedIds.has(notaId))
        const localReconciliationFailures: unknown[] = []
        for (const removedId of remotelyRemovedIds) {
          try {
            await removeCachedPublicPublication(removedId)
          } catch (error) {
            // The server delete is authoritative, so do not turn a committed
            // unpublish into a reported remote failure. Surface the local
            // privacy cleanup failure through the existing reconciliation UI.
            localReconciliationFailures.push(error)
          }
        }
        const reconcileLocalNota = async (localNota: Nota | undefined) => {
          if (!localNota) return
          localNota.isPublished = false
          localNota.publishedAt = null
          try {
            await this.saveItem(localNota)
          } catch (error) {
            localReconciliationFailures.push(error)
          }
        }

        await reconcileLocalNota(nota)

        // Update local state for all sub-pages
        for (const subPageId of publishedSubPageIds) {
          await reconcileLocalNota(this.getCurrentNota(subPageId))
        }

        // Cleanup is deliberately best-effort after the authoritative delete:
        // a cleanup outage must not misreport a committed unpublish as failed.
        void cleanupOrphanedPublishedImages().catch(error => {
          logger.error('Failed to schedule orphaned image cleanup:', error)
        })

        if (localReconciliationFailures.length > 0) {
          logger.error('Remote unpublish committed but local marker persistence failed:', localReconciliationFailures)
          toast(`Nota "${displayTitle}" is no longer public`, {
            description: 'The local publish marker could not be saved. Refresh published notas to reconcile it.',
          })
        } else {
          toast(`Nota "${displayTitle}" unpublished successfully`)
        }

        return true
      } catch (error) {
        logger.error('Failed to unpublish nota:', error)
        toast('Failed to unpublish nota')
        throw error
      }
    },

    async getPublishedNota(id: string) {
      try {
        const result = await (await getPublicationCloudApi()).publishing.getPublication(id)
        if (!result.ok) throw result.error
        if (!result.data) {
          await removeCachedPublicPublication(id).catch(() => undefined)
          return null
        }
        await cachePublicPublication(result.data).catch((cacheError) => {
          logger.warn('Failed to cache public nota for offline reading:', cacheError)
        })
        return publishedNota(result.data)
      } catch (error) {
        const mayUseOfflineCopy = (typeof navigator !== 'undefined' && navigator.onLine === false)
          || (error instanceof CloudError && ['unavailable', 'unknown'].includes(error.code))
        const cached = mayUseOfflineCopy
          ? await readCachedPublicPublication(id).catch(() => null)
          : null
        if (cached) {
          logger.info('Loaded a cached public nota while the publication service was unavailable.')
          return publishedNota(cached)
        }
        logger.error('Failed to fetch published nota:', error)
        throw error
      }
    },

    async getPublishedNotasByUser(userId: string, userTag?: string) {
      try {
        const { publishing } = await getPublicationCloudApi()
        const publications = await listAllPublications(publishing, {
          limit: 100, authorId: userId, authorTag: userTag || null,
        })
        return publications.map(publishedNota)
      } catch (error) {
        logger.error('Failed to fetch published notas by user:', error)
        throw error
      }
    },

    async loadPublishedNotas() {
      try {
        const authStore = useAuthStore()
        const userId = authStore.currentUser?.uid

        if (!userId) return []

        const { publishing } = await getPublicationCloudApi()
        const publications = await listAllPublications(publishing, {
          limit: 100,
          ownerOnly: true,
        })
        const publishedNotas = publications.map(publishedNota)

        // Extract IDs
        const publishedIds = publishedNotas.map((nota) => nota.id)
        const publishedIdSet = new Set(publishedIds)

        // Update local state
        this.publishedNotas = publishedIds

        // Sync the isPublished status with our local notas
        for (const nota of this.items) {
          if (publishedIdSet.has(nota.id) && !nota.isPublished) {
            nota.isPublished = true
            await this.saveItem(nota)
          } else if (!publishedIdSet.has(nota.id) && nota.isPublished) {
            nota.isPublished = false
            nota.publishedAt = null
            await this.saveItem(nota)
          }
        }

        return publishedIds
      } catch (error) {
        logger.error('Failed to load published notas:', error)
        throw error
      }
    },

    updateNota(id: string, updates: Partial<Nota>) {
      const index = this.items.findIndex(item => item.id === id)
      if (index !== -1) {
        const updatedNota = { ...this.items[index], ...updates }
        this.items[index] = updatedNota
        this.saveItem(updatedNota)
      }
    },

    async searchNotasByTitle(title: string): Promise<Nota[]> {
      try {
        const results = this.items.filter((nota) => nota.title.toLowerCase().includes(title.toLowerCase()))
        return results
      } catch (error) {
        logger.error('Failed to search notas by title:', error)
        return []
      }
    },

    async clonePublishedNota(publishedNotaId: string): Promise<Nota | null> {
      const createdNotaIds: string[] = []
      try {
        // Get the published nota data
        const publishedNota = await this.getPublishedNota(publishedNotaId)
        if (!publishedNota || !publishedNota.content) {
          throw new Error('Published nota not found or has no content')
        }

        // Create a new nota with a new ID but copy the content
        const newNotaId = nanoid()
        const newNota: Nota = {
          id: newNotaId,
          title: `${publishedNota.title} (Clone)`,
          parentId: null, // Reset parent ID as this is a clone
          tags: publishedNota.tags ? [...publishedNota.tags] : [],
          createdAt: new Date(),
          updatedAt: new Date(),
          blockStructure: {
            notaId: newNotaId,
            blockOrder: [],
            version: 1,
            lastModified: new Date(),
          },
        }

        // Copy citations if they exist
        if (publishedNota.citations && publishedNota.citations.length > 0) {
          newNota.citations = publishedNota.citations.map(citation => ({
            ...citation,
            id: crypto.randomUUID()
          }))
        }

        // Save the new nota to the database
        const adapter = getDb()
        if (adapter) await adapter.saveNota(newNota)
        else await db.notas.add(serializeNota(newNota))
        createdNotaIds.push(newNota.id)
        
        // Add to the store's items array
        this.items.push(newNota)

        // Convert the published content to blocks
        const blockStore = useBlockStore()
        if (publishedNota.content) {
          const contentToConvert = typeof publishedNota.content === 'string'
            ? JSON.parse(publishedNota.content)
            : structuredClone(publishedNota.content)
          await blockStore.importTiptapContent(newNota.id, contentToConvert)
          await this.persistCanonicalContent(newNota.id)
        }

        // Clone sub-notas if they exist
        if (publishedNota.publishedSubPages && publishedNota.publishedSubPages.length > 0) {
          toast(`Cloning ${publishedNota.publishedSubPages.length} sub-pages...`)
          
          // Keep track of original ID to new ID mapping
          const idMapping = new Map<string, string>()
          idMapping.set(publishedNotaId, newNota.id)
          
          // First pass: clone all sub-pages
          for (const subPageId of publishedNota.publishedSubPages) {
            try {
              const subPageNota = await this.getPublishedNota(subPageId)
              if (!subPageNota) throw new Error(`Published sub-page ${subPageId} was not found`)
              
              // Create clone of sub-nota
              const newSubNotaId = nanoid()
              const newSubNota: Nota = {
                id: newSubNotaId,
                title: subPageNota.title,
                parentId: newNota.id, // Set parent to the new parent nota
                tags: subPageNota.tags ? [...subPageNota.tags] : [],
                createdAt: new Date(),
                updatedAt: new Date(),
                blockStructure: {
                  notaId: newSubNotaId,
                  blockOrder: [],
                  version: 1,
                  lastModified: new Date(),
                },
              }
              
              // Copy citations if they exist
              if (subPageNota.citations && subPageNota.citations.length > 0) {
                newSubNota.citations = subPageNota.citations.map(citation => ({
                  ...citation,
                  id: crypto.randomUUID()
                }))
              }
              
              // Save the new sub-nota
              const adapter = getDb()
              if (adapter) await adapter.saveNota(newSubNota)
              else await db.notas.add(serializeNota(newSubNota))
              createdNotaIds.push(newSubNota.id)
              
              // Add to store's items array
              this.items.push(newSubNota)

              // Convert the published content to blocks for sub-nota
              if (subPageNota.content) {
                const contentToConvert = typeof subPageNota.content === 'string'
                  ? JSON.parse(subPageNota.content)
                  : structuredClone(subPageNota.content)
                await blockStore.importTiptapContent(newSubNota.id, contentToConvert)
                await this.persistCanonicalContent(newSubNota.id)
              }
              
              // Track ID mapping for updating references
              idMapping.set(subPageId, newSubNota.id)
              
            } catch (error) {
              logger.error(`Failed to clone sub-nota ${subPageId}:`, error)
              throw error
            }
          }
          
          // Second pass: update all content to reference new IDs for page links
          for (const newNotaId of idMapping.values()) {
            try {
              const nota = this.getCurrentNota(newNotaId)
              if (!nota) continue
              
              // Get content from block-based system
              const blockStore = useBlockStore()
              const tiptapContent = blockStore.getTiptapContent(newNotaId)
              
              if (!tiptapContent) continue
              
              let modified = false
              
              // Helper function to recursively update page links
              const updatePageLinks = (node: any) => {
                if (node.type === 'pageLink' && node.attrs && node.attrs.href) {
                  // Extract the old ID from the href
                  const hrefMatch = node.attrs.href.match(/\/(?:nota|p)\/([^/?#]+)/)
                  if (hrefMatch && hrefMatch[1]) {
                    const oldId = hrefMatch[1]
                    const newId = idMapping.get(oldId)
                    
                    if (newId) {
                      // Update href with new ID
                      node.attrs.href = `/nota/${newId}`
                      modified = true
                    }
                  }
                }
                
                // Process child nodes
                if (node.content && Array.isArray(node.content)) {
                  node.content.forEach(updatePageLinks)
                }
              }
              
              // Update links in content
              if (tiptapContent.content && Array.isArray(tiptapContent.content)) {
                tiptapContent.content.forEach(updatePageLinks)
              }
              
              // If content was modified, update the blocks
              if (modified) {
                await blockStore.importTiptapContent(newNotaId, tiptapContent)
                await this.persistCanonicalContent(newNotaId)
              }
            } catch (error) {
              logger.error(`Failed to update references in nota ${newNotaId}:`, error)
              throw error
            }
          }
        }

        // Analytics must never get ahead of the durable local clone. Treat a
        // failed counter update as a truthful warning, not as a failed clone:
        // rolling back here would leave the already-recorded counter orphaned.
        let analyticsFailure: unknown = null
        const authStore = useAuthStore()
        if (authStore.isAuthenticated && authStore.currentUser?.uid) {
          try {
            const result = await (await getPublicationCloudApi()).statistics.recordClone(publishedNotaId)
            if (!result.ok) analyticsFailure = result.error
          } catch (error) {
            analyticsFailure = error
          }
        }

        if (analyticsFailure) {
          logger.error('Clone committed locally but clone statistics could not be recorded:', analyticsFailure)
          toast(`Nota "${newNota.title}" cloned successfully`, {
            description: 'The public clone counter could not be updated.',
          })
        } else {
          toast(`Nota "${newNota.title}" cloned successfully with all sub-pages`)
        }

        return newNota
      } catch (error) {
        logger.error('Failed to clone published nota:', error)
        const blockStore = useBlockStore()
        const adapter = getDb()
        for (const createdId of [...createdNotaIds].reverse()) {
          this.items = this.items.filter(candidate => candidate.id !== createdId)
          await blockStore.clearNotaBlocks(createdId).catch(rollbackError => {
            logger.error(`Failed to roll back blocks for ${createdId}:`, rollbackError)
          })
          if (adapter) await adapter.deleteNota(createdId).catch(() => undefined)
          else await db.notas.delete(createdId).catch(() => undefined)
        }
        toast('Failed to clone nota')
        return null
      }
    },

    /**
     * Get nota content as Tiptap format from the block system
     * This replaces the legacy content field
     */
    async getNotaContentAsTiptap(notaId: string): Promise<any | null> {
      try {
        const blockStore = useBlockStore()
        return blockStore.getTiptapContent(notaId)
      } catch (error) {
        logger.error('Failed to get nota content from blocks:', error)
        return null
      }
    }
  },
})
