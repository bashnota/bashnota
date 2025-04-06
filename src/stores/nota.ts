import { defineStore } from 'pinia'
import { db } from '@/db'
import { type Nota, type NotaVersion, type PublishedNota } from '@/types/nota'
import type { NotaConfig } from '@/types/jupyter'
import { nanoid } from 'nanoid'
import { toast } from '@/lib/utils'
import { useAuthStore } from './auth'
import { fetchAPI } from '@/services/axios'
import { processNotaContent } from '@/services/publishNotaUtilities'
import { logger } from '@/services/logger'

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
      ...version,
      createdAt:
        version.createdAt && version.createdAt instanceof Date
          ? version.createdAt.toISOString()
          : version.createdAt,
    }))
  }

  return serialized
}

const deserializeNota = (nota: any): Nota => ({
  ...nota,
  tags: Array.isArray(nota.tags) ? [...nota.tags] : [],
  createdAt: nota.createdAt ? new Date(nota.createdAt) : new Date(),
  updatedAt: nota.updatedAt ? new Date(nota.updatedAt) : new Date(),
  config: nota.config ? JSON.parse(JSON.stringify(nota.config)) : undefined,
  versions: Array.isArray(nota.versions) ? [...nota.versions] : [],
})

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
      const baseURL = import.meta.env.VITE_APP_BASE_URL
      // Format your public URL as needed
      return `${baseURL}/p/${id}`
    },
  },

  actions: {
    async createItem(title: string, parentId: string | null = null): Promise<Nota> {
      const nota: Nota = {
        id: nanoid(),
        title,
        content: null,
        parentId: parentId,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const serialized = serializeNota(nota)
      await db.notas.add(serialized)
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

      // Update in database with serialized data
      const serialized = serializeNota(nota)
      await db.notas.update(nota.id, serialized)

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
        const results = await db.notas.toArray()
        this.items = results.map(deserializeNota)
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
        await db.notas.update(id, {
          title: newTitle,
          updatedAt: new Date().toISOString(),
        })
      }
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
      await db.notas.delete(id)
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
        await db.notas.update(nota.id, notaToStore)
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
          const nota = await db.notas.get(id)
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

    async exportNota(id: string): Promise<Nota[]> {
      const nota = this.getCurrentNota(id)
      if (!nota) return []

      const exportedNotas = [nota]
      const children = this.getChildren(id)

      // Recursively get all children
      for (const child of children) {
        const childExport = await this.exportNota(child.id)
        exportedNotas.push(...childExport)
      }

      toast(`Nota "${nota.title}" exported successfully`)

      return exportedNotas
    },

    async importNotas(file: File) {
      try {
        const content = await file.text()
        const notas = JSON.parse(content)

        // Validate the imported data
        if (!Array.isArray(notas)) throw new Error('Invalid nota file format')

        // Import each nota
        for (const nota of notas) {
          if (!nota.id || !nota.title) continue

          // Check if nota already exists
          const existingNota = await db.notas.get(nota.id)
          if (existingNota) continue

          // Ensure dates are properly formatted
          const notaToSave = {
            ...nota,
            createdAt: new Date(nota.createdAt),
            updatedAt: new Date(nota.updatedAt),
            tags: Array.isArray(nota.tags) ? nota.tags : [],
          }

          await db.notas.add(notaToSave)
          this.items.push(notaToSave)
        }

        toast('Notas imported successfully')

        return true
      } catch (error) {
        logger.error('Failed to import notas:', error)
        return false
      }
    },

    async exportAllNotas() {
      try {
        // Get all notas
        const allNotas = [...this.items]

        // Create a JSON file
        const data = JSON.stringify(allNotas, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        // Create a download link and trigger it
        const a = document.createElement('a')
        a.href = url
        a.download = `notas-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()

        // Clean up
        URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast('All notas exported successfully')

        return allNotas
      } catch (error) {
        logger.error('Failed to export notas:', error)
        toast('Failed to export notas')
        return []
      }
    },

    async saveNotaVersion(version: {
      id: string
      content: string
      versionName: string
      createdAt: Date
    }) {
      try {
        const nota = this.getCurrentNota(version.id)
        if (!nota) throw new Error('Nota not found')

        const notaVersion: NotaVersion = {
          id: nanoid(),
          notaId: version.id,
          content: version.content,
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

        // Update nota content with version content
        await this.saveNota({
          id: notaId,
          content: version.content,
          updatedAt: new Date(),
        })

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

    async publishNota(id: string, includeSubPages = false): Promise<PublishedNota> {
      try {
        const nota = this.getCurrentNota(id)
        if (!nota || !nota.content) throw new Error('Nota not found')

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
        }

        // Process the content with the list of published sub-pages
        // This will replace data URLs with hosted images AND handle page links
        // according to the published sub-pages list
        const processedContent = await processNotaContent(nota.content, {
          publishedSubPages: publishedSubPageIds,
        })

        // Prepare nota data for publishing with processed content
        const publishData = {
          title: nota.title,
          content: JSON.stringify(processedContent),
          updatedAt: nota.updatedAt instanceof Date ? nota.updatedAt.toISOString() : nota.updatedAt,
          parentId: nota.parentId,
          isSubPage: !!nota.parentId,
          publishedSubPages: publishedSubPageIds,
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

        // Save the processed content back to the nota
        // This prevents having to re-upload the same images on future updates
        nota.content = JSON.stringify(processedContent)
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
        return response.data as PublishedNota[]
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
  },
})
