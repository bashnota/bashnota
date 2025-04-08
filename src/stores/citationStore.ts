import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/services/logger'
import { useNotaStore } from './nota'
import type { CitationEntry } from '@/types/nota'

export const useCitationStore = defineStore('citation', () => {
  const notaStore = useNotaStore()
  const publicCitations = ref<CitationEntry[]>([])
  
  // Add a new citation
  const addCitation = (notaId: string, citation: Omit<CitationEntry, 'id' | 'createdAt'>) => {
    const nota = notaStore.getCurrentNota(notaId)
    if (!nota) return null

    const id = crypto.randomUUID()
    const newCitation: CitationEntry = {
      ...citation,
      id,
      createdAt: new Date()
    }
    
    const updatedCitations = [...(nota.citations || []), newCitation]
    notaStore.updateNota(notaId, { citations: updatedCitations })
    return newCitation
  }

  // Update an existing citation
  const updateCitation = (notaId: string, citationId: string, updates: Partial<CitationEntry>) => {
    const nota = notaStore.getCurrentNota(notaId)
    if (!nota) return null

    const citations = nota.citations || []
    const citationIndex = citations.findIndex(c => c.id === citationId)
    if (citationIndex === -1) return null

    const updatedCitation = { ...citations[citationIndex], ...updates }
    const updatedCitations = [...citations]
    updatedCitations[citationIndex] = updatedCitation

    notaStore.updateNota(notaId, { citations: updatedCitations })
    return updatedCitation
  }

  // Delete a citation
  const deleteCitation = (notaId: string, citationId: string) => {
    const nota = notaStore.getCurrentNota(notaId)
    if (!nota) return false

    const citations = nota.citations || []
    const updatedCitations = citations.filter(c => c.id !== citationId)
    
    notaStore.updateNota(notaId, { citations: updatedCitations })
    return true
  }

  // Set public citations
  const setPublicCitations = (citations: CitationEntry[]) => {
    publicCitations.value = citations
  }

  // Get all citations for a specific nota
  const getCitationsByNotaId = computed(() => (notaId: string) => {
    // If we have public citations, use those
    if (publicCitations.value.length > 0) {
      return publicCitations.value
    }
    // Otherwise get from nota store
    const nota = notaStore.getCurrentNota(notaId)
    return nota?.citations || []
  })

  // Get a citation by its key
  const getCitationByKey = computed(() => (key: string, notaId: string) => {
    // If we have public citations, search there first
    if (publicCitations.value.length > 0) {
      return publicCitations.value.find(citation => citation.key === key) || null
    }
    // Otherwise get from nota store
    const nota = notaStore.getCurrentNota(notaId)
    return nota?.citations?.find(citation => citation.key === key) || null
  })

  return {
    addCitation,
    updateCitation,
    deleteCitation,
    getCitationsByNotaId,
    getCitationByKey,
    setPublicCitations
  }
}) 