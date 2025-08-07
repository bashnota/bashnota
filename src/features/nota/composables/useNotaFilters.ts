import { ref, computed, watch } from 'vue'
import { Star, Clock, Tag } from 'lucide-vue-next'
import type { Nota } from '@/features/nota/types/nota'

export interface FilterOption {
  id: string
  label: string
  icon: any
  count?: number
}

export interface UseNotaFiltersOptions {
  notas: () => Nota[]
  initialSearchQuery?: string
  initialSelectedTag?: string
  showFavorites?: () => boolean
}

export function useNotaFilters(options: UseNotaFiltersOptions) {
  // Local search state for better performance
  const localSearchQuery = ref(options.initialSearchQuery || '')
  const selectedQuickFilters = ref<Set<string>>(new Set())
  const selectedTags = ref<Set<string>>(new Set())
  const viewFilter = ref<'all' | 'favorites'>('all')
  
  // Debounced search function
  const debouncedSearch = ref<NodeJS.Timeout | null>(null)
  const updateLocalSearch = (value: string, onUpdate?: (value: string) => void) => {
    localSearchQuery.value = value
    
    if (debouncedSearch.value) {
      clearTimeout(debouncedSearch.value)
    }
    
    if (onUpdate) {
      debouncedSearch.value = setTimeout(() => {
        onUpdate(value)
      }, 300)
    }
  }

  // Filter options with dynamic counts
  const filterOptions = computed((): FilterOption[] => {
    const notas = options.notas()
    return [
      { 
        id: 'favorites', 
        label: 'Favorites', 
        icon: Star, 
        count: notas.filter(nota => nota.favorite).length 
      },
      { 
        id: 'recent', 
        label: 'Recent (7 days)', 
        icon: Clock, 
        count: notas.filter(nota => {
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          return new Date(nota.updatedAt) > sevenDaysAgo
        }).length
      },
      { 
        id: 'has-tags', 
        label: 'Has Tags', 
        icon: Tag, 
        count: notas.filter(nota => nota.tags && nota.tags.length > 0).length
      },
    ]
  })

  // Available tags for filtering
  const availableTags = computed(() => {
    const tags = new Set<string>()
    options.notas().forEach(nota => {
      nota.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  })

  // Apply all filters to the notas
  const applyFilters = (
    notas: Nota[], 
    searchQuery: string = '', 
    selectedTag: string = '',
    legacyShowFavorites: boolean = false
  ): Nota[] => {
    let result = [...notas]
    
    // Apply view filtering (all or favorites)
    if (viewFilter.value === 'favorites') {
      result = result.filter(nota => nota.favorite)
    }
    
    // Apply quick filters
    if (selectedQuickFilters.value.has('favorites')) {
      result = result.filter(nota => nota.favorite)
    }
    
    if (selectedQuickFilters.value.has('recent')) {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      result = result.filter(nota => new Date(nota.updatedAt) > sevenDaysAgo)
    }
    
    if (selectedQuickFilters.value.has('has-tags')) {
      result = result.filter(nota => nota.tags && nota.tags.length > 0)
    }
    
    // Apply search filtering
    const query = searchQuery.toLowerCase().trim()
    if (query) {
      result = result.filter(nota => 
        nota.title.toLowerCase().includes(query) ||
        nota.content?.toLowerCase().includes(query) ||
        nota.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    // Apply tag filtering
    if (selectedTag) {
      result = result.filter(nota => 
        nota.tags?.includes(selectedTag)
      )
    }

    // Apply selected tags filtering
    if (selectedTags.value.size > 0) {
      result = result.filter(nota => {
        if (!nota.tags) return false
        return Array.from(selectedTags.value).every(tag => nota.tags!.includes(tag))
      })
    }
    
    // Apply legacy favorites filtering (for backward compatibility)
    if (legacyShowFavorites && viewFilter.value === 'all') {
      result = result.filter(nota => nota.favorite)
    }
    
    return result
  }

  // Count active filters
  const activeFiltersCount = computed(() => {
    let count = 0
    if (localSearchQuery.value) count++
    if (selectedTags.value.size > 0) count++
    if (viewFilter.value === 'favorites') count++
    count += selectedQuickFilters.value.size
    return count
  })

  // Toggle quick filter
  const toggleQuickFilter = (filterId: string) => {
    if (selectedQuickFilters.value.has(filterId)) {
      selectedQuickFilters.value.delete(filterId)
    } else {
      selectedQuickFilters.value.add(filterId)
    }
  }

  // Toggle tag filter
  const toggleTag = (tag: string) => {
    if (selectedTags.value.has(tag)) {
      selectedTags.value.delete(tag)
    } else {
      selectedTags.value.add(tag)
    }
  }

  // Clear all filters
  const clearAllFilters = (onClear?: () => void) => {
    localSearchQuery.value = ''
    selectedQuickFilters.value.clear()
    selectedTags.value.clear()
    viewFilter.value = 'all'
    onClear?.()
  }

  return {
    // State
    localSearchQuery,
    selectedQuickFilters,
    selectedTags,
    viewFilter,
    
    // Computed
    filterOptions,
    availableTags,
    activeFiltersCount,
    
    // Methods
    updateLocalSearch,
    applyFilters,
    toggleQuickFilter,
    toggleTag,
    clearAllFilters,
  }
}
