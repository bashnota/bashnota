import { ref, computed } from 'vue'

/**
 * Feature flags for gradual rollout of new features
 * These can be controlled via localStorage or environment variables
 */

// Storage for feature flags (in localStorage)
const STORAGE_KEY = 'bashnota-feature-flags'

interface FeatureFlags {
  USE_NEW_STORAGE: boolean
  USE_SIMPLIFIED_NAVIGATION: boolean
  USE_CONSOLIDATED_SETTINGS: boolean
}

// Load initial flags from localStorage or defaults
function loadFlags(): FeatureFlags {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load feature flags:', error)
  }

  // Default flags (all off for safety)
  return {
    USE_NEW_STORAGE: false,
    USE_SIMPLIFIED_NAVIGATION: false,
    USE_CONSOLIDATED_SETTINGS: false
  }
}

// Save flags to localStorage
function saveFlags(flags: FeatureFlags): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  } catch (error) {
    console.error('Failed to save feature flags:', error)
  }
}

// Reactive feature flags
const flags = ref<FeatureFlags>(loadFlags())

/**
 * Composable for managing feature flags
 */
export function useFeatureFlags() {
  // Individual flag refs for convenience
  const useNewStorage = computed({
    get: () => flags.value.USE_NEW_STORAGE,
    set: (value: boolean) => {
      flags.value.USE_NEW_STORAGE = value
      saveFlags(flags.value)
    }
  })

  const useSimplifiedNavigation = computed({
    get: () => flags.value.USE_SIMPLIFIED_NAVIGATION,
    set: (value: boolean) => {
      flags.value.USE_SIMPLIFIED_NAVIGATION = value
      saveFlags(flags.value)
    }
  })

  const useConsolidatedSettings = computed({
    get: () => flags.value.USE_CONSOLIDATED_SETTINGS,
    set: (value: boolean) => {
      flags.value.USE_CONSOLIDATED_SETTINGS = value
      saveFlags(flags.value)
    }
  })

  // Enable all new features
  const enableAllNewFeatures = () => {
    flags.value = {
      USE_NEW_STORAGE: true,
      USE_SIMPLIFIED_NAVIGATION: true,
      USE_CONSOLIDATED_SETTINGS: true
    }
    saveFlags(flags.value)
  }

  // Disable all new features (rollback to legacy)
  const disableAllNewFeatures = () => {
    flags.value = {
      USE_NEW_STORAGE: false,
      USE_SIMPLIFIED_NAVIGATION: false,
      USE_CONSOLIDATED_SETTINGS: false
    }
    saveFlags(flags.value)
  }

  // Reset to defaults
  const resetToDefaults = () => {
    disableAllNewFeatures()
  }

  // Check if any new feature is enabled
  const hasAnyNewFeatureEnabled = computed(() => {
    return (
      flags.value.USE_NEW_STORAGE ||
      flags.value.USE_SIMPLIFIED_NAVIGATION ||
      flags.value.USE_CONSOLIDATED_SETTINGS
    )
  })

  // Get all flags as object
  const getAllFlags = () => ({ ...flags.value })

  // Set flags from object
  const setAllFlags = (newFlags: Partial<FeatureFlags>) => {
    flags.value = {
      ...flags.value,
      ...newFlags
    }
    saveFlags(flags.value)
  }

  return {
    // Individual flags
    useNewStorage,
    useSimplifiedNavigation,
    useConsolidatedSettings,

    // Batch operations
    enableAllNewFeatures,
    disableAllNewFeatures,
    resetToDefaults,

    // Utilities
    hasAnyNewFeatureEnabled,
    getAllFlags,
    setAllFlags
  }
}
