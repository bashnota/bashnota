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

  const {
    selectedNotas,
    hasSelection,
    selectionCount,
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
    const searchQuery = localSearchQuery.value // Always use local search query
    const selectedTag = '' // Will be handled by parent component
    const showFavorites = options.showFavorites?.() || false
    
    // Apply filters
    const filtered = applyFilters(notas, searchQuery, selectedTag)
    
    // Apply sorting
    return applySorting(filtered)
  })

  // Create pagination that reacts to filtered data changes
  const { currentPage, createPagination } = useNotaPagination(options.itemsPerPage)
  
  // Create reactive pagination for current filtered results
  const totalPages = computed(() => Math.ceil(filteredAndSortedNotas.value.length / (options.itemsPerPage || 10)))
  
  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * (options.itemsPerPage || 10)
    const end = start + (options.itemsPerPage || 10)
    return filteredAndSortedNotas.value.slice(start, end)
  })

  const paginationInfo = computed(() => {
    const total = filteredAndSortedNotas.value.length
    const start = total === 0 ? 0 : (currentPage.value - 1) * (options.itemsPerPage || 10) + 1
    const end = Math.min(currentPage.value * (options.itemsPerPage || 10), total)
    
    return {
      startItem: start,
      endItem: end,
      totalItems: total
    }
  })

  const getVisiblePages = (): (number | string)[] => {
    const pages: (number | string)[] = []
    const total = totalPages.value
    const current = currentPage.value
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      if (current > 3) pages.push('...')
      
      const start = Math.max(2, current - 1)
      const end = Math.min(total - 1, current + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (current < total - 2) pages.push('...')
      pages.push(total)
    }
    
    return pages
  }

  const goToPage = (page: number) => {
    currentPage.value = Math.max(1, Math.min(totalPages.value, page))
  }

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }

  const previousPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  const resetPage = () => {
    currentPage.value = 1
  }

  // Create selection management for current page
  const pageSelection = createSelectionForPage(paginatedItems.value)

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
    resetPage()
  }

  // Reset page when filters change
  watch(
    [selectedQuickFilters, selectedTags, viewFilter, localSearchQuery],
    () => {
      clearSelection()
      resetPage()
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
    selectionCount,
    
    // Pagination
    currentPage,
    totalPages,
    paginatedItems,
    paginationInfo,
    getVisiblePages,
    goToPage,
    nextPage,
    previousPage,
    
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
