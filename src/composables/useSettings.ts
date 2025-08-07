import { computed, ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import type { AllSettings } from '@/features/settings/types'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'

export function useSettings<K extends keyof AllSettings>(category: K) {
  const settingsStore = useSettingsStore()
  
  // Loading and error states
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const hasUnsavedChanges = computed(() => settingsStore.hasUnsavedChanges)

  // Get category-specific settings
  const settings = computed(() => settingsStore.settings[category])
  
  // Update a specific setting
  const updateSetting = <T extends keyof AllSettings[K]>(
    key: T, 
    value: AllSettings[K][T]
  ) => {
    try {
      const updates = {} as Partial<AllSettings[K]>
      updates[key] = value
      settingsStore.updateCategory(category, updates)
      error.value = null
    } catch (err) {
      error.value = `Failed to update ${String(key)}`
      logger.error(`Failed to update setting ${String(key)}`, err)
      toast.error('Failed to update setting', {
        description: error.value
      })
    }
  }

  // Update multiple settings at once
  const updateSettings = (updates: Partial<AllSettings[K]>) => {
    try {
      settingsStore.updateCategory(category, updates)
      error.value = null
    } catch (err) {
      error.value = 'Failed to update settings'
      logger.error('Failed to update settings', err)
      toast.error('Failed to update settings', {
        description: error.value
      })
    }
  }

  // Reset category to defaults
  const resetToDefaults = () => {
    try {
      settingsStore.resetCategory(category)
      error.value = null
      toast.success(`${category} settings reset to defaults`)
    } catch (err) {
      error.value = 'Failed to reset settings'
      logger.error('Failed to reset settings', err)
      toast.error('Failed to reset settings', {
        description: error.value
      })
    }
  }

  // Save settings manually (usually auto-saved)
  const saveSettings = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      await settingsStore.saveSettings()
      toast.success('Settings saved successfully')
    } catch (err) {
      error.value = 'Failed to save settings'
      toast.error('Failed to save settings', {
        description: error.value
      })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    settings,
    isLoading,
    error,
    hasUnsavedChanges,
    
    // Actions
    updateSetting,
    updateSettings,
    resetToDefaults,
    saveSettings
  }
}

// Helper composable for specific setting types
export function useToggleSetting<K extends keyof AllSettings>(
  category: K,
  key: keyof AllSettings[K]
) {
  const { settings, updateSetting } = useSettings(category)
  
  const value = computed(() => settings.value[key] as boolean)
  
  const toggle = () => {
    updateSetting(key, !value.value as AllSettings[K][typeof key])
  }
  
  const setValue = (newValue: boolean) => {
    updateSetting(key, newValue as AllSettings[K][typeof key])
  }
  
  return {
    value,
    toggle,
    setValue
  }
}

export function useSliderSetting<K extends keyof AllSettings>(
  category: K,
  key: keyof AllSettings[K]
) {
  const { settings, updateSetting } = useSettings(category)
  
  const value = computed(() => settings.value[key] as number[])
  
  const setValue = (newValue: number[]) => {
    updateSetting(key, newValue as AllSettings[K][typeof key])
  }
  
  return {
    value,
    setValue
  }
}

export function useSelectSetting<K extends keyof AllSettings>(
  category: K,
  key: keyof AllSettings[K]
) {
  const { settings, updateSetting } = useSettings(category)
  
  const value = computed(() => settings.value[key] as string)
  
  const setValue = (newValue: string) => {
    updateSetting(key, newValue as AllSettings[K][typeof key])
  }
  
  return {
    value,
    setValue
  }
}
