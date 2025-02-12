import { defineStore } from 'pinia'
import { db } from '@/db'
import { type Nota } from '@/types/nota'
import type { NotaConfig } from '@/types/jupyter'

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
    async createItem(title: string, parentId: string | null = null) {
      const now = new Date().toISOString()
      const item: Nota = {
        id: crypto.randomUUID(),
        title,
        content: '',
        parentId,
        createdAt: now,
        updatedAt: now,
      }

      // If it has a parent, copy the parent's config
      if (parentId) {
        const parent = this.items.find((i) => i.id === parentId)
        if (parent?.config) {
          item.config = JSON.parse(JSON.stringify(parent.config))
        }
      }

      await db.notas.add(item)
      this.items.push(item)
      return item
    },

    async loadNotas() {
      this.loading = true
      try {
        const results = await db.notas.toArray()
        this.items = results.map((nota) => ({
          ...nota,
          createdAt: nota.createdAt,
          updatedAt: nota.updatedAt,
        }))
      } catch (e) {
        this.error = 'Failed to load notas'
        console.error(e)
      } finally {
        this.loading = false
      }
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
      const notaToStore: Partial<Nota> & { updatedAt: string | Date } = {
        ...nota,
        updatedAt: new Date().toISOString(),
      }

      const index = this.items.findIndex((n) => n.id === nota.id)
      if (index !== -1) {
        this.items[index] = {
          ...this.items[index],
          ...nota,
          updatedAt: notaToStore.updatedAt,
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

        await db.notas.update(notaId, {
          config: JSON.parse(JSON.stringify(config)),
          updatedAt: new Date().toISOString(),
        })
      }
    },

    async toggleFavorite(id: string) {
      const nota = this.items.find(item => item.id === id)
      if (nota) {
        nota.favorite = !nota.favorite
        nota.updatedAt = new Date().toISOString()
        await db.notas.update(id, {
          favorite: nota.favorite,
          updatedAt: nota.updatedAt
        })
      }
    },

    async loadNota(id: string) {
      try {
        if (!this.getCurrentNota(id)) {
          await this.fetchNota(id)
        }
      } catch (error) {
        console.error('Failed to load nota:', error)
      }
    },
  },
})
