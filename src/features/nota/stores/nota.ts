import { defineStore } from 'pinia'
import { db } from '@/db'
import { type Nota, type NotaVersion, type PublishedNota, type CitationEntry } from '@/features/nota/types/nota'
import type { NotaConfig } from '@/features/jupyter/types/jupyter'
import { nanoid } from 'nanoid'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/features/auth/stores/auth'
import { fetchAPI } from '@/services/axios'
import { processNotaContent } from '@/features/nota/services/publishNotaUtilities'
import { statisticsService } from '@/features/bashhub/services/statisticsService'
import { logger } from '@/services/logger'
import { FILE_EXTENSIONS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/constants/app'
import { useBlockStore } from './blockStore'
import { useDatabaseAdapter } from '@/services/databaseAdapter'

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

// Helper function to get database adapter or fallback to db
function getDb() {
  try {
    return useDatabaseAdapter()
  } catch (error) {
    // If adapter not initialized yet, return null to use old db
    logger.warn('[NotaStore] DatabaseAdapter not initialized, using legacy db')
    return null
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

    async saveItem(nota: Nota) {
      // Ensure tags is initialized
      if (!nota.tags) {
        nota.tags = []
      }

      // Update timestamps
      nota.updatedAt = new Date()

      // Use database adapter if available, otherwise fallback to direct db
      const adapter = getDb()
      if (adapter) {
        await adapter.saveNota(nota)
      } else {
        const serialized = serializeNota(nota)
        await db.notas.update(nota.id, serialized)
      }

      // Update in state
      const index = this.items.findIndex((n) => n.id === nota.id)
      if (index !== -1) {
        this.items[index] = { ...nota }
      } else {
        this.items.push({ ...nota })
      }
    },

    async loadNotas() {
      this.loading = true
      try {
        const adapter = getDb()
        if (adapter) {
          const results = await adapter.getAllNotas()
          this.items = results.map(deserializeNota)
        } else {
          const results = await db.notas.toArray()
          this.items = results.map(deserializeNota)
        }
      } catch (e) {
        logger.error(e)
        this.error = 'Failed to load notas'
      } finally {
        this.loading = false
      }
      return this.items
    },

    async renameItem(id: string, newTitle: string) {
      const item = this.items.find((i) => i.id === id)
      if (item) {
        item.title = newTitle
        item.updatedAt = new Date()
        await this.saveItem(item)
      }
    },

    async updateNotaTitle(id: string, newTitle: string) {
      const item = this.items.find((i) => i.id === id)
      if (item) {
        item.title = newTitle
        item.updatedAt = new Date()
        await this.saveItem(item)
        
        return item
      }
      throw new Error(`Nota with id ${id} not found`)
    },

    async deleteItem(id: string) {
      // First delete all children
      const children = this.getChildren(id)
      for (const child of children) {
        await this.deleteItem(child.id)
      }

      // Get the item to delete
      const item = this.items.find((i) => i.id === id)
      if (!item) return

      // Then delete the item itself
      const adapter = getDb()
      if (adapter) {
        await adapter.deleteNota(id)
      } else {
        await db.notas.delete(id)
      }
      this.items = this.items.filter((i) => i.id !== id)

      toast(`Nota "${item.title}" deleted successfully`)
    },

    async saveNota(nota: Partial<Nota> & { id: string }) {
      const now = new Date()
      const notaToStore = serializeNota({
        ...nota,
        updatedAt: now,
      })

      const index = this.items.findIndex((n) => n.id === nota.id)
      if (index !== -1) {
        this.items[index] = {
          ...this.items[index],
          ...nota,
          updatedAt: now,
        }
        const adapter = getDb()
        if (adapter) {
          await adapter.saveNota(this.items[index])
        } else {
          await db.notas.update(nota.id, notaToStore)
        }
      }
    },

    async updateNotaConfig(notaId: string, updater: (config: NotaConfig) => void) {
      const nota = this.getItem(notaId)
      if (nota) {
        const config = nota.config || {
          kernelPreferences: {},
          savedSessions: [],
        }

        updater(config)
        nota.config = config
        await this.saveItem(nota)
      }
    },

    async toggleFavorite(id: string) {
      const nota = this.items.find((item) => item.id === id)
      if (nota) {
        nota.favorite = !nota.favorite
        nota.updatedAt = new Date()
        await this.saveItem(nota)

        toast(`Nota ${nota.favorite ? 'added to' : 'removed from'} favorites successfully`)
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
        return null
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

            const allCurrentNotaIds = new Set(this.items.map(item => item.id))
            const importedNotaIdsInBatch = new Set(rawNotasToImport.map(n => n.id).filter(id => id != null))
            
            const cleanedNotas: Nota[] = [];
            const validNotasToProcess: Nota[] = []
            const successfullyImportedNotas: Nota[] = []

            for (const notaData of rawNotasToImport) {
              const deserializedNota = deserializeNota(notaData)
              
              // If the .nota includes inline content (TipTap JSON), stash it for block import
              const inlineContent = (notaData as any).content
              
              // Content is now stored as JSON objects (no need to stringify)
              
              if (deserializedNota.parentId) {
                const parentExistsInStore = allCurrentNotaIds.has(deserializedNota.parentId)
                const parentExistsInBatch = importedNotaIdsInBatch.has(deserializedNota.parentId)
                if (!parentExistsInStore && !parentExistsInBatch) {
                  cleanedNotas.push(JSON.parse(JSON.stringify(deserializedNota)));
                  deserializedNota.parentId = null;
                }
              }
              
              // Attach content for later processing
              ;(deserializedNota as any).__inlineContent = inlineContent
              validNotasToProcess.push(deserializedNota)
            }

            if (cleanedNotas.length > 0) {
              const cleanedTitles = cleanedNotas.map(n => `"${n.title || n.id}"`).join(', ')
              toast(
                `${cleanedNotas.length} sub-nota(s) had their parent reference removed and were imported as root notas: ${cleanedTitles}.`
              )
            }
            
            for (const notaToSave of validNotasToProcess) {
              const existingNota = this.getItem(notaToSave.id)

              if (existingNota) {
                const mergedNota = deserializeNota({
                    ...serializeNota(existingNota),
                    ...serializeNota(notaToSave),
                    createdAt: existingNota.createdAt,
                    updatedAt: new Date()
                });
                await db.notas.put(serializeNota(mergedNota));
                const index = this.items.findIndex((n) => n.id === mergedNota.id)
                if (index !== -1) {
                  this.items[index] = mergedNota
                } else { 
                  this.items.push(mergedNota)
                }
                successfullyImportedNotas.push(mergedNota);
                // Populate blocks if inline content present
                const inline = (notaToSave as any).__inlineContent
                if (inline) {
                  const blockStore = useBlockStore()
                  await blockStore.importTiptapContent(mergedNota.id, inline)
                }
              } else {
                const newNota = deserializeNota({
                    ...serializeNota(notaToSave),
                    id: notaToSave.id || nanoid(),
                    createdAt: notaToSave.createdAt ? new Date(notaToSave.createdAt) : new Date(),
                    updatedAt: new Date()
                });
                await db.notas.add(serializeNota(newNota))
                this.items.push(newNota)
                successfullyImportedNotas.push(newNota);
                // Populate blocks if inline content present
                const inline = (notaToSave as any).__inlineContent
                if (inline) {
                  const blockStore = useBlockStore()
                  await blockStore.importTiptapContent(newNota.id, inline)
                }
              }
            }

            if (cleanedNotas.length > 0 && successfullyImportedNotas.length === 0 && rawNotasToImport.length === cleanedNotas.length) {
            } else if (rawNotasToImport.length > 0 && successfullyImportedNotas.length === 0 && cleanedNotas.length === 0) {
               toast(ERROR_MESSAGES.notas.importFailed + ': No valid notas found in file or processed.')
            }

            resolve(successfullyImportedNotas)
          } catch (error: any) {
            logger.error('Import error in store:', error)
            let message = ERROR_MESSAGES.notas.importFailed;
            if (error instanceof SyntaxError) {
                message += ': Invalid JSON format.';
            } else if (error.message) {
                message += `: ${error.message}`;
            }
            toast(message)
            resolve([])
          }
        }
        reader.onerror = (error) => {
          logger.error('File reading error:', error)
          toast(ERROR_MESSAGES.notas.importFailed + ': Could not read file.')
          resolve([])
        }
        reader.readAsText(file)
      })
    },

    async exportAllNotas(): Promise<void> {
      if (this.items.length === 0) {
        toast('No notas to export.')
        return
      }
      try {
        const exportData = this.items.map(serializeNota)
        const dataStr = JSON.stringify(exportData, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `bashnota_export_${new Date().toISOString().split('T')[0]}${FILE_EXTENSIONS.json}`
        link.click()
        URL.revokeObjectURL(url)
      } catch (error) {
        logger.error('Failed to prepare notas for export:', error)
        toast(ERROR_MESSAGES.notas.exportFailed)
      }
    },

    async saveNotaVersion(version: {
      id: string
      nota: Nota
      versionName: string
      createdAt: Date
    }) {
      try {
        const nota = this.getCurrentNota(version.id)
        if (!nota) throw new Error('Nota not found')

        const notaVersion: NotaVersion = {
          id: nanoid(),
          notaId: version.id,
          nota: version.nota,
          versionName: version.versionName,
          createdAt:
            version.createdAt instanceof Date ? version.createdAt.toISOString() : version.createdAt,
        }

        // If versions array doesn't exist, create it
        if (!nota.versions) {
          nota.versions = []
        }

        // Add the version to the versions array
        nota.versions.push(notaVersion)

        // Save the updated nota with versions to the database
        // Use serializeNota to ensure everything is properly serialized
        const serialized = serializeNota(nota)
        await db.notas.update(version.id, serialized)

        return notaVersion
      } catch (error) {
        logger.error('Failed to save nota version:', error)
        throw error
      }
    },

    getNotaVersions(notaId: string) {
      const nota = this.getCurrentNota(notaId)
      return nota?.versions || []
    },

    async restoreVersion(notaId: string, versionId: string) {
      try {
        const nota = this.getCurrentNota(notaId)
        if (!nota || !nota.versions) throw new Error('Nota or versions not found')

        const version = nota.versions.find((v) => v.id === versionId)
        if (!version) throw new Error('Version not found')

        // Restore the entire nota from the version
        const restoredNota = version.nota
        restoredNota.updatedAt = new Date()
        
        // Update the current nota with the restored version
        await this.saveNota(restoredNota)

        return true
      } catch (error) {
        logger.error('Failed to restore version:', error)
        throw error
      }
    },

    async deleteVersion(notaId: string, versionId: string) {
      try {
        const nota = this.getCurrentNota(notaId)
        if (!nota || !nota.versions) throw new Error('Nota or versions not found')

        // Filter out the version to delete
        nota.versions = nota.versions.filter((v) => v.id !== versionId)

        // Save the updated nota with the version removed
        const serialized = serializeNota(nota)
        await db.notas.update(notaId, serialized)

        return true
      } catch (error) {
        logger.error('Failed to delete version:', error)
        throw error
      }
    },

    async getSubPages(notaId: string): Promise<Nota[]> {
      try {
        // Filter direct children from in-memory store if available
        const subPages = this.items.filter((item) => item.parentId === notaId)

        // If no items found in store, try fetching from database
        if (subPages.length === 0) {
          const dbSubPages = await db.notas.where('parentId').equals(notaId).toArray()

          return dbSubPages.map(deserializeNota)
        }

        return subPages
      } catch (error) {
        logger.error('Failed to get sub-pages:', error)
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

      const serialized = serializeNota(nota)
      await db.notas.add(serialized)
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

      const oldParentId = nota.parentId
      nota.parentId = newParentId
      nota.updatedAt = new Date()

      const serialized = serializeNota(nota)
      await db.notas.update(notaId, serialized)

      // Update in memory
      const index = this.items.findIndex(n => n.id === notaId)
      if (index !== -1) {
        this.items[index] = { ...nota }
      }

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

      // First, create all notas without parent relationships
      const allNotas = [importData.nota, ...(importData.subnotas || [])]
      
      for (const notaData of allNotas) {
        const newId = nanoid()
        idMapping.set(notaData.id, newId)

        const newNota: Nota = {
          ...deserializeNota(notaData),
          id: newId,
          parentId: null, // Will be set after all notas are created
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const serialized = serializeNota(newNota)
        await db.notas.add(serialized)
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
        }
      }

      return importedNotas
    },

    async publishNota(id: string, includeSubPages = false): Promise<PublishedNota> {
      try {
        const nota = this.getCurrentNota(id)
        if (!nota) throw new Error('Nota not found')

        toast(`Processing content for "${nota.title}"...`)

        // Get the list of published sub-pages if we're including them
        const publishedSubPageIds: string[] = []

        // Only publish sub-pages if includeSubPages is true
        if (includeSubPages) {
          const subPages = await this.getSubPages(id)
          if (subPages.length > 0) {
            toast(`Publishing ${subPages.length} sub-page(s)...`)

            // Publish all sub-pages first
            for (const subPage of subPages) {
              try {
                // Recursively publish each sub-page
                await this.publishNota(subPage.id, includeSubPages)
                // Add to the list of published sub-pages
                publishedSubPageIds.push(subPage.id)
              } catch (error) {
                logger.error(`Failed to publish sub-page "${subPage.title}":`, error)
                // Continue with other sub-pages even if one fails
              }
            }
          }
        } else {
          // If not including sub-pages, get existing published sub-pages
          const publishedNota = await this.getPublishedNota(id).catch(() => null)
          if (publishedNota?.publishedSubPages) {
            publishedSubPageIds.push(...publishedNota.publishedSubPages)
          }
        }

        // Get content from block-based system
        const blockStore = useBlockStore()
        const tiptapContent = blockStore.getTiptapContent(id)
        
        if (!tiptapContent) {
          throw new Error('No content available to publish')
        }

        // Process the content with the list of published sub-pages
        // This will replace data URLs with hosted images AND handle page links
        // according to the published sub-pages list
        const processedContent = await processNotaContent(tiptapContent, {
          publishedSubPages: publishedSubPageIds,
        })

        // Prepare nota data for publishing with processed content
        const publishData = {
          title: nota.title,
          content: processedContent, // Send the processed object directly
          updatedAt: nota.updatedAt instanceof Date ? nota.updatedAt.toISOString() : nota.updatedAt,
          parentId: nota.parentId,
          isSubPage: !!nota.parentId,
          publishedSubPages: publishedSubPageIds,
          citations: nota.citations // Include citations in published data
        }

        // Call the API to publish the nota
        const response = await fetchAPI.post(`/nota/publish/${id}`, publishData)
        const publishedNota = response.data

        // Update local state
        if (!this.publishedNotas.includes(id)) {
          this.publishedNotas.push(id)
        }

        // Update nota with publish status
        nota.isPublished = true
        nota.publishedAt = publishedNota.publishedAt

        // Save the updated nota (no need to store processed content back)
        await this.saveItem({ ...nota })

        toast(`Nota "${nota.title}" published successfully`)

        return publishedNota
      } catch (error) {
        logger.error('Failed to publish nota:', error)
        toast('Failed to publish nota')
        throw error
      }
    },

    async unpublishNota(id: string): Promise<boolean> {
      try {
        const nota = this.getCurrentNota(id)
        if (!nota) throw new Error('Nota not found')

        // Get info about any published sub-pages
        let publishedSubPageIds: string[] = []

        // Get published nota to check for published sub-pages
        const publishedNota = await this.getPublishedNota(id).catch(() => null)

        if (publishedNota && publishedNota.publishedSubPages) {
          publishedSubPageIds = publishedNota.publishedSubPages
        }

        // Also check for any published sub-pages directly
        const subPages = await this.getSubPages(id)

        for (const subPage of subPages) {
          if (this.isPublished(subPage.id) && !publishedSubPageIds.includes(subPage.id)) {
            publishedSubPageIds.push(subPage.id)
          }
        }

        // Call the API to unpublish the nota and all sub-pages
        await fetchAPI.delete(`/nota/publish/${id}`)

        // Update local state for the main nota
        this.publishedNotas = this.publishedNotas.filter((notaId) => notaId !== id)
        nota.isPublished = false
        nota.publishedAt = null
        await this.saveItem(nota)

        // Update local state for all sub-pages
        if (publishedSubPageIds.length > 0) {
          for (const subPageId of publishedSubPageIds) {
            // Only update if it was published
            const subPage = this.getCurrentNota(subPageId)
            if (subPage) {
              this.publishedNotas = this.publishedNotas.filter((notaId) => notaId !== subPageId)
              subPage.isPublished = false
              subPage.publishedAt = null
              await this.saveItem(subPage)
            }
          }
        }

        toast(`Nota "${nota.title}" unpublished successfully`)

        return true
      } catch (error) {
        logger.error('Failed to unpublish nota:', error)
        toast('Failed to unpublish nota')
        throw error
      }
    },

    async getPublishedNota(id: string) {
      try {
        // Call the API to get the published nota
        const response = await fetchAPI.get(`/nota/published/${id}`)
        return response.data as PublishedNota
      } catch (error) {
        logger.error('Failed to fetch published nota:', error)
        throw error
      }
    },

    async getPublishedNotasByUser(userId: string) {
      try {
        // Call the API to get published notas by user
        const response = await fetchAPI.get(`/nota/user/${userId}`)
        
        // Get the published notas from the response
        const publishedNotas = response.data as PublishedNota[]
        
        // For each published nota, try to fetch its statistics
        for (const nota of publishedNotas) {
          try {
            // Fetch statistics non-blockingly (don't await to avoid slowing down the main response)
            statisticsService.getStatistics(nota.id)
              .then(stats => {
                // Update the nota with its statistics
                if (stats) {
                  nota.viewCount = stats.viewCount
                  nota.uniqueViewers = stats.uniqueViewers
                  nota.lastViewedAt = stats.lastViewedAt ? stats.lastViewedAt.toISOString() : undefined
                  nota.stats = stats.stats
                }
              })
              .catch(err => {
                // Just log the error without breaking the flow
                logger.error(`Failed to fetch statistics for nota ${nota.id}:`, err)
              })
          } catch (statError) {
            // Non-blocking error handling - don't let stats errors break the main flow
            logger.error(`Error fetching statistics for nota ${nota.id}:`, statError)
          }
        }
        
        return publishedNotas
      } catch (error) {
        logger.error('Failed to fetch published notas by user:', error)
        return []
      }
    },

    async loadPublishedNotas() {
      try {
        const authStore = useAuthStore()
        const userId = authStore.currentUser?.uid

        if (!userId) return []

        // Call the API to get all published notas for the current user
        const response = await fetchAPI.get('/nota/published')
        const publishedNotas = response.data as PublishedNota[]

        // Extract IDs
        const publishedIds = publishedNotas.map((nota) => nota.id)

        // Update local state
        this.publishedNotas = publishedIds

        // Sync the isPublished status with our local notas
        for (const nota of this.items) {
          if (publishedIds.includes(nota.id) && !nota.isPublished) {
            nota.isPublished = true
            await this.saveItem(nota)
          } else if (!publishedIds.includes(nota.id) && nota.isPublished) {
            nota.isPublished = false
            nota.publishedAt = null
            await this.saveItem(nota)
          }
        }

        return publishedIds
      } catch (error) {
        logger.error('Failed to load published notas:', error)
        return []
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
      try {
        // Get the published nota data
        const publishedNota = await this.getPublishedNota(publishedNotaId)
        if (!publishedNota || !publishedNota.content) {
          throw new Error('Published nota not found or has no content')
        }

        // Record clone action in statistics
        const authStore = useAuthStore()
        if (authStore.isAuthenticated && authStore.currentUser?.uid) {
          statisticsService.recordClone(publishedNotaId, authStore.currentUser.uid)
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
        const serialized = serializeNota(newNota)
        await db.notas.add(serialized)
        
        // Add to the store's items array
        this.items.push(newNota)

        // Convert the published content to blocks
        const blockStore = useBlockStore()
        if (publishedNota.content) {
          try {
            // Parse the content if it's a string, or use it directly if it's an object
            const contentToConvert = typeof publishedNota.content === 'string' 
              ? JSON.parse(publishedNota.content) 
              : publishedNota.content
            
            // TODO: Implement proper block creation instead of legacy conversion
            logger.info('Content conversion not yet implemented for block system')
          } catch (error) {
            logger.error('Failed to convert published content to blocks:', error)
          }
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
              if (!subPageNota) continue
              
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
              const serializedSub = serializeNota(newSubNota)
              await db.notas.add(serializedSub)
              
              // Add to store's items array
              this.items.push(newSubNota)

              // Convert the published content to blocks for sub-nota
              if (subPageNota.content) {
                try {
                  const contentToConvert = typeof subPageNota.content === 'string' 
                    ? JSON.parse(subPageNota.content) 
                    : subPageNota.content
                  
                  // TODO: Implement proper block creation instead of legacy conversion
                  logger.info('Content conversion not yet implemented for block system')
                } catch (error) {
                  logger.error('Failed to convert sub-nota content to blocks:', error)
                }
              }
              
              // Track ID mapping for updating references
              idMapping.set(subPageId, newSubNota.id)
              
            } catch (error) {
              logger.error(`Failed to clone sub-nota ${subPageId}:`, error)
              // Continue with other sub-notas even if one fails
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
                  const hrefMatch = node.attrs.href.match(/\/nota\/([^/]+)/)
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
                // TODO: Implement proper block update instead of legacy conversion
                logger.info('Content update not yet implemented for block system')
              }
            } catch (error) {
              logger.error(`Failed to update references in nota ${newNotaId}:`, error)
            }
          }
        }

        toast(`Nota "${newNota.title}" cloned successfully with all sub-pages`)

        return newNota
      } catch (error) {
        logger.error('Failed to clone published nota:', error)
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








