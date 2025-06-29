import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { CitationEntry } from '@/features/nota/types/nota'

export interface UseReferencesSearchReturn {
  searchQuery: Ref<string>
  filteredCitations: ComputedRef<CitationEntry[]>
  clearSearch: () => void
}

export function useReferencesSearch(citations: ComputedRef<CitationEntry[]>): UseReferencesSearchReturn {
  const searchQuery = ref('')

  const filteredCitations = computed(() => {
    if (!searchQuery.value.trim()) {
      return citations.value
    }
    
    const query = searchQuery.value.toLowerCase().trim()
    return citations.value.filter(citation => {
      return (
        (citation.title || '').toLowerCase().includes(query) ||
        citation.key.toLowerCase().includes(query) ||
        (citation.authors || []).some((author: string) => author.toLowerCase().includes(query)) ||
        (citation.journal || '').toLowerCase().includes(query) ||
        (citation.publisher || '').toLowerCase().includes(query) ||
        (citation.year && citation.year.toString().includes(query)) ||
        (citation.doi || '').toLowerCase().includes(query)
      )
    })
  })

  const clearSearch = () => {
    searchQuery.value = ''
  }

  return {
    searchQuery,
    filteredCitations,
    clearSearch
  }
} 