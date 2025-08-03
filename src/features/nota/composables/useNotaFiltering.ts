import { computed, type ComputedRef } from 'vue'
import type { Nota } from '@/features/nota/types/nota'

export interface FilterOptions {
  showFavorites: boolean
  searchQuery: string
  selectedTag: string
}

export interface FilterStats {
  total: number
  filtered: number
  isFiltering: boolean
}

export function useNotaFiltering(
  notas: ComputedRef<Nota[]>,
  filters: ComputedRef<FilterOptions>
) {
  const filteredNotas = computed(() => {
    let result = notas.value

    // Filter by favorites
    if (filters.value.showFavorites) {
      result = result.filter(nota => nota.favorite)
    }

    // Filter by search query
    if (filters.value.searchQuery) {
      const query = filters.value.searchQuery.toLowerCase().trim()
      result = result.filter(nota => 
        nota.title.toLowerCase().includes(query) ||
        nota.content?.toLowerCase().includes(query) ||
        nota.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Filter by selected tag
    if (filters.value.selectedTag) {
      result = result.filter(nota => nota.tags?.includes(filters.value.selectedTag))
    }

    // Sort by update date (most recent first)
    return result.slice().sort((a, b) => {
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)
      return dateB.getTime() - dateA.getTime()
    })
  })

  const stats = computed<FilterStats>(() => ({
    total: notas.value.length,
    filtered: filteredNotas.value.length,
    isFiltering: filters.value.showFavorites || !!filters.value.searchQuery || !!filters.value.selectedTag
  }))

  const hasActiveFilters = computed(() => 
    filters.value.showFavorites || !!filters.value.searchQuery || !!filters.value.selectedTag
  )

  const activeFiltersText = computed(() => {
    const filterTexts: string[] = []
    if (filters.value.showFavorites) filterTexts.push('favorites')
    if (filters.value.searchQuery) filterTexts.push(`"${filters.value.searchQuery}"`)
    if (filters.value.selectedTag) filterTexts.push(`#${filters.value.selectedTag}`)
    return filterTexts.join(', ')
  })

  return {
    filteredNotas,
    stats,
    hasActiveFilters,
    activeFiltersText
  }
} 







