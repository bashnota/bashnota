import { ref, computed } from 'vue'
import type { Nota } from '@/features/nota/types/nota'

export type SortField = 'updated' | 'created' | 'title' | 'size'
export type SortDirection = 'asc' | 'desc'

export interface SortOption {
  key: SortField
  label: string
  defaultDirection: SortDirection
}

export const SORT_OPTIONS: SortOption[] = [
  { key: 'updated', label: 'Updated', defaultDirection: 'desc' },
  { key: 'created', label: 'Created', defaultDirection: 'desc' },
  { key: 'title', label: 'Title', defaultDirection: 'asc' },
  { key: 'size', label: 'Size', defaultDirection: 'desc' },
]

export function useNotaSorting(initialSort: SortField = 'updated') {
  const sortBy = ref<SortField>(initialSort)
  const sortDirection = ref<SortDirection>('desc')

  // Handle sort field change
  const handleSort = (field: SortField) => {
    if (sortBy.value === field) {
      // Toggle direction if same field
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      // Set new field with its default direction
      sortBy.value = field
      const option = SORT_OPTIONS.find(opt => opt.key === field)
      sortDirection.value = option?.defaultDirection || 'desc'
    }
  }

  // Apply sorting to notas
  const applySorting = (notas: Nota[]): Nota[] => {
    return [...notas].sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortBy.value) {
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'created':
          aVal = new Date(a.createdAt)
          bVal = new Date(b.createdAt)
          break
        case 'size':
          // For size sorting, we'll use title length as a proxy for content size
          // TODO: Implement proper block count when block structures are loaded
          aVal = a.title.length
          bVal = b.title.length
          break
        default: // 'updated'
          aVal = new Date(a.updatedAt)
          bVal = new Date(b.updatedAt)
      }
      
      if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
      return 0
    })
  }

  // Get current sort option
  const currentSortOption = computed(() => 
    SORT_OPTIONS.find(opt => opt.key === sortBy.value)
  )

  return {
    // State
    sortBy,
    sortDirection,
    
    // Computed
    currentSortOption,
    
    // Methods
    handleSort,
    applySorting,
    
    // Constants
    SORT_OPTIONS,
  }
}
