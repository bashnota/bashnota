import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/services/logger'

export interface CitationEntry {
  id: string
  key: string
  title: string
  authors: string[]
  year: string
  journal?: string
  volume?: string
  number?: string
  pages?: string
  publisher?: string
  url?: string
  doi?: string
  notaId: string
  createdAt: Date
}

export const useCitationStore = defineStore('citation', () => {
  const citations = ref<Map<string, CitationEntry>>(new Map())
  
  // Load citations from localStorage
  const loadCitations = () => {
    const savedCitations = localStorage.getItem('citations')
    if (savedCitations) {
      try {
        const parsed = JSON.parse(savedCitations)
        citations.value = new Map(parsed)
      } catch (error) {
        logger.error('Failed to parse saved citations', error)
      }
    }
  }

  // Save citations to localStorage
  const saveCitations = () => {
    localStorage.setItem('citations', JSON.stringify(Array.from(citations.value.entries())))
  }

  // Add a new citation
  const addCitation = (citation: Omit<CitationEntry, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID()
    const newCitation: CitationEntry = {
      ...citation,
      id,
      createdAt: new Date()
    }
    
    citations.value.set(id, newCitation)
    saveCitations()
    return newCitation
  }

  // Update an existing citation
  const updateCitation = (id: string, updates: Partial<CitationEntry>) => {
    const citation = citations.value.get(id)
    if (citation) {
      const updatedCitation = { ...citation, ...updates }
      citations.value.set(id, updatedCitation)
      saveCitations()
      return updatedCitation
    }
    return null
  }

  // Delete a citation
  const deleteCitation = (id: string) => {
    const result = citations.value.delete(id)
    if (result) {
      saveCitations()
    }
    return result
  }

  // Get all citations for a specific nota
  const getCitationsByNotaId = computed(() => (notaId: string) => {
    return Array.from(citations.value.values()).filter(citation => citation.notaId === notaId)
  })

  // Get a citation by its key
  const getCitationByKey = computed(() => (key: string, notaId: string) => {
    return Array.from(citations.value.values()).find(
      citation => citation.key === key && citation.notaId === notaId
    )
  })

  // Initialize by loading from localStorage
  loadCitations()

  return {
    citations,
    addCitation,
    updateCitation,
    deleteCitation,
    getCitationsByNotaId,
    getCitationByKey,
    loadCitations,
    saveCitations
  }
}) 