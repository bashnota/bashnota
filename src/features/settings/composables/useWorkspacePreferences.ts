import { ref, watch } from 'vue'

// Types
export interface WorkspacePreferences {
  showAnalytics: boolean
  showRecommendations: boolean
  showQuickActions: boolean
  autoRefresh: boolean
  refreshInterval: number
  sidebarWidth: 'narrow' | 'normal' | 'wide'
  defaultTab: 'analytics' | 'recommendations' | 'actions'
  compactMode: boolean
}

// Constants
export const STORAGE_KEY = 'workspace-preferences'

export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  showAnalytics: true,
  showRecommendations: true,
  showQuickActions: true,
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds
  sidebarWidth: 'normal',
  defaultTab: 'analytics',
  compactMode: false
}

export const REFRESH_INTERVALS = {
  SHORT: 15000,   // 15 seconds
  MEDIUM: 30000,  // 30 seconds
  LONG: 60000,    // 1 minute
  EXTENDED: 300000 // 5 minutes
} as const

// Composable
export function useWorkspacePreferences() {
  const preferences = ref<WorkspacePreferences>({ ...DEFAULT_PREFERENCES })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Load preferences from localStorage
  const loadPreferences = (): boolean => {
    try {
      isLoading.value = true
      error.value = null
      
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<WorkspacePreferences>
        
        // Validate and merge with defaults
        const validatedPrefs: WorkspacePreferences = {
          ...DEFAULT_PREFERENCES,
          ...parsed
        }
        
        // Additional validation for specific fields
        const validIntervals = Object.values(REFRESH_INTERVALS) as number[]
        if (!validIntervals.includes(validatedPrefs.refreshInterval)) {
          validatedPrefs.refreshInterval = DEFAULT_PREFERENCES.refreshInterval
        }
        
        if (!['narrow', 'normal', 'wide'].includes(validatedPrefs.sidebarWidth)) {
          validatedPrefs.sidebarWidth = DEFAULT_PREFERENCES.sidebarWidth
        }
        
        if (!['analytics', 'recommendations', 'actions'].includes(validatedPrefs.defaultTab)) {
          validatedPrefs.defaultTab = DEFAULT_PREFERENCES.defaultTab
        }
        
        preferences.value = validatedPrefs
        return true
      }
      
      return false
    } catch (err) {
      console.error('Failed to load workspace preferences:', err)
      error.value = 'Failed to load preferences'
      preferences.value = { ...DEFAULT_PREFERENCES }
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Save preferences to localStorage
  const savePreferences = (): boolean => {
    try {
      error.value = null
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences.value))
      return true
    } catch (err) {
      console.error('Failed to save workspace preferences:', err)
      error.value = 'Failed to save preferences'
      return false
    }
  }

  // Reset preferences to defaults
  const resetPreferences = (): void => {
    preferences.value = { ...DEFAULT_PREFERENCES }
    savePreferences()
  }

  // Update a specific preference
  const updatePreference = <K extends keyof WorkspacePreferences>(
    key: K,
    value: WorkspacePreferences[K]
  ): void => {
    preferences.value[key] = value
  }

  // Bulk update preferences
  const updatePreferences = (updates: Partial<WorkspacePreferences>): void => {
    preferences.value = {
      ...preferences.value,
      ...updates
    }
  }

  // Toggle boolean preferences
  const togglePreference = (key: keyof Pick<WorkspacePreferences, 'showAnalytics' | 'showRecommendations' | 'showQuickActions' | 'autoRefresh' | 'compactMode'>): void => {
    const currentValue = preferences.value[key] as boolean
    preferences.value[key] = !currentValue as any
  }

  // Validate refresh interval
  const setRefreshInterval = (interval: number): void => {
    const validIntervals = Object.values(REFRESH_INTERVALS) as number[]
    if (validIntervals.includes(interval)) {
      preferences.value.refreshInterval = interval
    } else {
      console.warn(`Invalid refresh interval: ${interval}. Using default.`)
      preferences.value.refreshInterval = DEFAULT_PREFERENCES.refreshInterval
    }
  }

  // Watch for changes and auto-save
  watch(
    preferences,
    () => {
      savePreferences()
    },
    { deep: true }
  )

  // Initialize
  loadPreferences()

  return {
    // State
    preferences,
    isLoading,
    error,
    
    // Constants
    DEFAULT_PREFERENCES,
    REFRESH_INTERVALS,
    
    // Methods
    loadPreferences,
    savePreferences,
    resetPreferences,
    updatePreference,
    updatePreferences,
    togglePreference,
    setRefreshInterval
  }
} 








