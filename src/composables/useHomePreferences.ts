import { ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { STORAGE_KEYS, VIEW_TYPES, ACTIVE_VIEWS } from '@/constants/app'

export interface LayoutPreferences {
  showAnalytics: boolean
  showRecommendations: boolean
  compactMode: boolean
  sidebarWidth: 'narrow' | 'normal' | 'wide'
}

export type ViewType = keyof typeof VIEW_TYPES
export type ActiveView = keyof typeof ACTIVE_VIEWS

export function useHomePreferences() {
  // Use VueUse's useLocalStorage for automatic persistence
  const viewType = useLocalStorage<ViewType>(STORAGE_KEYS.preferences.viewType, 'grid')
  const activeView = useLocalStorage<ActiveView>(STORAGE_KEYS.preferences.activeView, 'notas')
  const showFavorites = useLocalStorage<boolean>(STORAGE_KEYS.preferences.showFavorites, false)
  const searchQuery = useLocalStorage<string>(STORAGE_KEYS.preferences.lastSearch, '')
  const selectedTag = useLocalStorage<string>(STORAGE_KEYS.preferences.lastTag, '')
  
  const layoutPreferences = useLocalStorage<LayoutPreferences>(
    STORAGE_KEYS.preferences.layoutPreferences,
    {
      showAnalytics: true,
      showRecommendations: true,
      compactMode: false,
      sidebarWidth: 'normal'
    }
  )

  const currentPage = ref(1)

  // Reset page when filters change
  watch([showFavorites, searchQuery, selectedTag], () => {
    currentPage.value = 1
  })

  const clearFilters = () => {
    showFavorites.value = false
    searchQuery.value = ''
    selectedTag.value = ''
    currentPage.value = 1
  }

  const resetPreferences = () => {
    viewType.value = 'grid'
    activeView.value = 'notas'
    showFavorites.value = false
    searchQuery.value = ''
    selectedTag.value = ''
    currentPage.value = 1
    layoutPreferences.value = {
      showAnalytics: true,
      showRecommendations: true,
      compactMode: false,
      sidebarWidth: 'normal'
    }
  }

  return {
    // Reactive state
    viewType,
    activeView,
    showFavorites,
    searchQuery,
    selectedTag,
    layoutPreferences,
    currentPage,
    
    // Methods
    clearFilters,
    resetPreferences,
    
    // Constants
    STORAGE_KEYS: STORAGE_KEYS.preferences,
    VIEW_TYPES,
    ACTIVE_VIEWS
  }
} 