import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db'

export interface Page {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  parentId: string | null
  children: string[]
  type: 'page'
}

export interface Nota {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  pages: string[]
  type: 'nota'
  config?: NotaConfig
}

interface StoredNota {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  pages: string[]
  type: 'nota'
  config?: {
    jupyterServers: Array<{
      ip: string
      port: string
      token: string
    }>
    notebooks: Array<{
      notebook: string
      server: string
      kernel: string
    }>
    kernels: Record<string, string[]>
  }
}

interface StoredPage {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  parentId: string | null
  children: string[]
  type: 'page'
}

export interface NotaConfig {
  jupyterServers: JupyterServer[]
  notebooks: Array<{ notebook: string; server: string; kernel: string }>
  kernels: Record<string, string> // blockId -> kernelName mapping
}

export const useNotaStore = defineStore('nota', () => {
  const notas = ref<Nota[]>([])
  const pages = ref<Page[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const serverSessions = ref<Record<string, any[]>>({})

  const loadNotas = async () => {
    loading.value = true
    try {
      const results = await db.notas.toArray()
      notas.value = results.map(nota => ({
        ...nota,
        createdAt: new Date(nota.createdAt),
        updatedAt: new Date(nota.updatedAt),
        pages: nota.pages || [],
        config: nota.config || {
          jupyterServers: [],
          notebooks: [],
          kernels: {}
        }
      }))
      console.log('Loaded notas:', notas.value) // Debug log
    } catch (e) {
      error.value = 'Failed to load notas'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  const loadPages = async () => {
    loading.value = true
    try {
      const results = await db.pages.toArray()
      pages.value = results.map(page => ({
        ...page,
        createdAt: new Date(page.createdAt),
        updatedAt: new Date(page.updatedAt),
        children: page.children || []
      }))
    } catch (e) {
      error.value = 'Failed to load pages'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  const createNota = async (title: string) => {
    const nota: Nota = {
      id: crypto.randomUUID(),
      title,
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      pages: [],
      type: 'nota'
    }
    
    const notaToStore: StoredNota = {
      ...nota,
      pages: [],
      createdAt: nota.createdAt.toISOString(),
      updatedAt: nota.updatedAt.toISOString()
    }
    
    await db.notas.add(notaToStore)
    notas.value.push(nota)
    return nota
  }

  const getCurrentNota = (id: string) => {
    return notas.value.find(nota => nota.id === id)
  }

  const createPage = async (title: string, parentId: string) => {
    const page: Page = {
      id: crypto.randomUUID(),
      title,
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      parentId,
      children: [],
      type: 'page'
    }
    
    const pageToStore: StoredPage = {
      ...page,
      children: [],
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString()
    }
    
    await db.pages.add(pageToStore)
    pages.value.push(page)
    
    if (parentId) {
      const parentNota = notas.value.find(n => n.id === parentId)
      if (parentNota) {
        parentNota.pages.push(page.id)
        await db.notas.update(parentId, { 
          pages: [...parentNota.pages],
          updatedAt: new Date().toISOString()
        })
      } else {
        const parentPage = pages.value.find(p => p.id === parentId)
        if (parentPage) {
          parentPage.children.push(page.id)
          await db.pages.update(parentId, { 
            children: [...parentPage.children],
            updatedAt: new Date().toISOString()
          })
        }
      }
    }
    
    return page
  }

  const getNotaPages = (notaId: string) => {
    const nota = notas.value.find(n => n.id === notaId)
    if (!nota?.pages) return []
    // Get all pages that have this nota as their parent
    return pages.value.filter(page => page.parentId === notaId)
  }

  const getPageChildren = (pageId: string) => {
    const page = pages.value.find(p => p.id === pageId)
    if (!page?.children) return []
    // Get all pages that have this page as their parent
    return pages.value.filter(p => p.parentId === pageId)
  }

  const getCurrentPage = (id: string) => {
    return pages.value.find(page => page.id === id)
  }

  const getPageParentNota = (pageId: string) => {
    const page = getCurrentPage(pageId)
    if (page?.parentId) {
      return notas.value.find(nota => nota.id === page.parentId)
    }
    return null
  }

  const savePage = async (page: Partial<Page>) => {
    if (!page.id) return

    const pageToStore: Partial<StoredPage> = {
      ...page,
      updatedAt: new Date().toISOString(),
      children: page.children ? [...page.children] : undefined
    }

    await db.pages.update(page.id, pageToStore)
    const index = pages.value.findIndex(p => p.id === page.id)
    if (index !== -1) {
      pages.value[index] = { ...pages.value[index], ...page }
    }
  }

  const deletePage = async (id: string) => {
    const page = pages.value.find(p => p.id === id)
    if (!page) return

    if (page.parentId) {
      const parentNota = notas.value.find(n => n.id === page.parentId)
      if (parentNota) {
        const updatedPages = parentNota.pages.filter(pid => pid !== id)
        await db.notas.update(page.parentId, { 
          pages: [...updatedPages],
          updatedAt: new Date().toISOString()
        })
        parentNota.pages = updatedPages
      } else {
        const parentPage = pages.value.find(p => p.id === page.parentId)
        if (parentPage) {
          const updatedChildren = parentPage.children.filter(pid => pid !== id)
          await db.pages.update(page.parentId, { 
            children: [...updatedChildren],
            updatedAt: new Date().toISOString()
          })
          parentPage.children = updatedChildren
        }
      }
    }

    const deleteChildren = async (pageId: string) => {
      const childPage = pages.value.find(p => p.id === pageId)
      if (!childPage) return
      const childrenToDelete = [...childPage.children]
      for (const childId of childrenToDelete) {
        await deleteChildren(childId)
      }
      await db.pages.delete(pageId)
    }

    const childrenToDelete = [...page.children]
    for (const childId of childrenToDelete) {
      await deleteChildren(childId)
    }

    await db.pages.delete(id)
    pages.value = pages.value.filter(p => p.id !== id)
  }

  const saveNota = async (nota: Partial<Nota> & { id: string }) => {
    const notaToStore: Partial<StoredNota> = {
      ...nota,
      updatedAt: new Date().toISOString(),
      pages: nota.pages ? [...nota.pages] : undefined
    }

    const index = notas.value.findIndex(n => n.id === nota.id)
    if (index !== -1) {
      notas.value[index] = { ...notas.value[index], ...nota }
      await db.notas.update(nota.id, notaToStore)
    }
  }

  const renameNota = async (id: string, newTitle: string) => {
    const nota = notas.value.find(n => n.id === id)
    if (nota) {
      nota.title = newTitle
      nota.updatedAt = new Date()
      await db.notas.update(id, { title: newTitle, updatedAt: new Date() })
    }
  }

  const renamePage = async (id: string, newTitle: string) => {
    const page = pages.value.find(p => p.id === id)
    if (page) {
      page.title = newTitle
      page.updatedAt = new Date()
      await db.pages.update(id, { 
        title: newTitle, 
        updatedAt: new Date().toISOString()
      })
    }
  }

  const deleteNota = async (id: string) => {
    const nota = notas.value.find(n => n.id === id)
    if (!nota) return
    
    if (nota.pages) {
      for (const pageId of nota.pages) {
        await deletePage(pageId)
      }
    }
    
    notas.value = notas.value.filter(n => n.id !== id)
    await db.notas.delete(id)
  }

  const updateNotaConfig = async (notaId: string, updater: (config: NotaConfig) => void) => {
    const nota = getCurrentNota(notaId)
    if (nota) {
      const config = nota.config || {
        jupyterServers: [],
        notebooks: [],
        kernels: {}
      }
      
      updater(config)
      nota.config = config
      
      await db.notas.update(notaId, { 
        config,
        updatedAt: new Date().toISOString()
      })
    }
  }

  const getServerSessions = (serverIp: string) => {
    return serverSessions.value[serverIp] || []
  }

  const updateServerSessions = (serverIp: string, sessions: any[]) => {
    serverSessions.value[serverIp] = sessions
  }

  return {
    notas,
    pages,
    loading,
    error,
    loadNotas,
    loadPages,
    createNota,
    getCurrentNota,
    saveNota,
    renameNota,
    deleteNota,
    createPage,
    getNotaPages,
    getPageChildren,
    getCurrentPage,
    savePage,
    deletePage,
    renamePage,
    updateNotaConfig,
    getServerSessions,
    updateServerSessions,
    getPageParentNota,
  }
})
