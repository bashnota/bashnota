import { computed, watch } from 'vue'
import { useNotaFilters, type UseNotaFiltersOptions } from './useNotaFilters'
import { useNotaSorting, type SortField } from './useNotaSorting'
import { useNotaPagination } from './useNotaPagination'
import { useNotaSelection } from './useNotaSelection'
import type { Nota } from '@/features/nota/types/nota'

export interface UseNotaListOptions extends UseNotaFiltersOptions {
  itemsPerPage?: number
  initialSort?: SortField
  onSearchUpdate?: (value: string) => void
  onTagUpdate?: (value: string) => void
  onFiltersChange?: () => void
}

export function useNotaList(options: UseNotaListOptions) {
  const {
    localSearchQuery,
    selectedQuickFilters,
    selectedTags,
    viewFilter,
    filterOptions,
    availableTags,
    activeFiltersCount,
    updateLocalSearch,
    applyFilters,
    toggleQuickFilter,
    toggleTag,
    clearAllFilters: clearFiltersOnly,
  } = useNotaFilters(options)

  const {
    sortBy,
    sortDirection,
    currentSortOption,
    handleSort,
    applySorting,
    SORT_OPTIONS,
  } = useNotaSorting(options.initialSort)

  const { currentPage, createPagination } = useNotaPagination(options.itemsPerPage)

  const {
    selectedNotas,
    hasSelection,
    createSelectionForPage,
    handleSelectNota,
    isNotaSelected,
    toggleNotaSelection,
    clearSelection,
    selectAll,
    getSelectedIds,
    getSelectedNotas,
  } = useNotaSelection()

  // Main filtered and sorted notas computation
  const filteredAndSortedNotas = computed(() => {
    const notas = options.notas()
    const searchQuery = options.onSearchUpdate ? '' : localSearchQuery.value // If external search, don't use local
    const selectedTag = '' // Will be handled by parent component
    const showFavorites = options.showFavorites?.() || false
    
    // Apply filters
    const filtered = applyFilters(notas, searchQuery, selectedTag, showFavorites)
    
    // Apply sorting
    return applySorting(filtered)
  })

  // Create pagination for filtered results
  const pagination = createPagination(filteredAndSortedNotas.value)
  
  // Create selection management for current page
  const pageSelection = createSelectionForPage(pagination.paginatedItems.value)

  // Update search with external callback
  const updateSearch = (value: string) => {
    updateLocalSearch(value, options.onSearchUpdate)
  }

  // Clear all filters including external state
  const clearAllFilters = () => {
    clearFiltersOnly(() => {
      options.onFiltersChange?.()
    })
    clearSelection()
    pagination.resetPage()
  }

  // Reset page when filters change
  watch(
    [selectedQuickFilters, selectedTags, viewFilter, localSearchQuery],
    () => {
      clearSelection()
      pagination.resetPage()
    },
    { deep: true }
  )

  // Format utilities
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getContentPreview = (content: string | null, maxLength: number = 100) => {
    if (!content) return 'No content'
    return content.length > maxLength ? content.slice(0, maxLength) + '...' : content
  }

  return {
    // State
    localSearchQuery,
    selectedQuickFilters,
    selectedTags,
    viewFilter,
    sortBy,
    sortDirection,
    selectedNotas,
    
    // Computed
    filterOptions,
    availableTags,
    activeFiltersCount,
    currentSortOption,
    filteredAndSortedNotas,
    hasSelection,
    
    // Pagination
    ...pagination,
    
    // Selection
    ...pageSelection,
    
    // Methods
    updateSearch,
    toggleQuickFilter,
    toggleTag,
    handleSort,
    handleSelectNota,
    isNotaSelected,
    toggleNotaSelection,
    clearSelection,
    selectAll,
    getSelectedIds,
    getSelectedNotas,
    clearAllFilters,
    
    // Utilities
    formatDate,
    getContentPreview,
    
    // Constants
    SORT_OPTIONS,
  }
}
