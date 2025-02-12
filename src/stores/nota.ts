import { defineStore } from 'pinia'
import { db } from '@/db'
import { type Nota } from '@/types/nota'
import type { NotaConfig } from '@/types/jupyter'
import { nanoid } from 'nanoid'

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

  return serialized
}

const deserializeNota = (nota: any): Nota => ({
  ...nota,
  tags: Array.isArray(nota.tags) ? [...nota.tags] : [],
  createdAt: nota.createdAt ? new Date(nota.createdAt) : new Date(),
  updatedAt: nota.updatedAt ? new Date(nota.updatedAt) : new Date(),
  config: nota.config ? JSON.parse(JSON.stringify(nota.config)) : undefined,
})

export const useNotaStore = defineStore('nota', {
  state: () => ({
    items: [] as Nota[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    rootItems: (state) => {
      return state.items.filter((item) => !item.parentId)
    },

    getChildren: (state) => (parentId: string) => {
      return state.items.filter((item) => item.parentId === parentId)
    },

    getParents: (state) => (id: string) => {
      const findParents = (itemId: string): Nota[] => {
        const item = state.items.find((i) => i.id === itemId)
        if (!item?.parentId) return []
        return [item, ...findParents(item.parentId)]
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
  },

  actions: {
    async createItem(title: string): Promise<Nota> {
      const nota: Nota = {
        id: nanoid(),
        title,
        content: '',
        parentId: null,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const serialized = serializeNota(nota)
      await db.notas.add(serialized)
      this.items.push(nota)
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
      const index = this.items.findIndex(n => n.id === nota.id)
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
        this.error = 'Failed to load notas'
        console.error(e)
      } finally {
        this.loading = false
      }
      return this.items
    },

    async renameItem(id: string, newTitle: string) {
      const item = this.items.find((i) => i.id === id)
      if (item) {
        item.title = newTitle
        item.updatedAt = new Date().toISOString()
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

      // Then delete the item itself
      await db.notas.delete(id)
      this.items = this.items.filter((i) => i.id !== id)
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
          jupyterServers: [],
          kernels: {},
          kernelPreferences: {},
        }

        updater(config)
        nota.config = config
        await this.saveItem(nota)
      }
    },

    async toggleFavorite(id: string) {
      const nota = this.items.find(item => item.id === id)
      if (nota) {
        nota.favorite = !nota.favorite
        nota.updatedAt = new Date()
        await this.saveItem(nota)
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
        console.error('Failed to load nota:', error)
        return null
      }
    },
  },
})
