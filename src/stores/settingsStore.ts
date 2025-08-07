import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { 
  AllSettings, 
  EditorSettings, 
  AppearanceSettings, 
  AISettings, 
  KeyboardSettings, 
  IntegrationSettings, 
  AdvancedSettings 
} from '@/features/settings/types'
import { 
  editorSettingsDefaults 
} from '@/features/settings/types/editor'
import { 
  appearanceSettingsDefaults 
} from '@/features/settings/types/appearance'
import { 
  aiSettingsDefaults 
} from '@/features/settings/types/ai'
import { 
  keyboardSettingsDefaults 
} from '@/features/settings/types/keyboard'
import { 
  integrationSettingsDefaults 
} from '@/features/settings/types/integrations'
import { 
  advancedSettingsDefaults 
} from '@/features/settings/types/advanced'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref<AllSettings>({
    editor: { ...editorSettingsDefaults },
    appearance: { ...appearanceSettingsDefaults },
    ai: { ...aiSettingsDefaults },
    keyboard: { ...keyboardSettingsDefaults },
    integrations: { ...integrationSettingsDefaults },
    advanced: { ...advancedSettingsDefaults }
  })

  const isLoading = ref(false)
  const lastSaved = ref<Date | null>(null)
  const hasUnsavedChanges = ref(false)

  // Computed
  const allSettings = computed(() => settings.value)

  // Category getters
  const editorSettings = computed(() => settings.value.editor)
  const appearanceSettings = computed(() => settings.value.appearance)
  const aiSettings = computed(() => settings.value.ai)
  const keyboardSettings = computed(() => settings.value.keyboard)
  const integrationSettings = computed(() => settings.value.integrations)
  const advancedSettings = computed(() => settings.value.advanced)

  // Actions
  const loadSettings = async () => {
    isLoading.value = true
    try {
      // Load from localStorage with backward compatibility
      const loadedSettings = { ...settings.value }
      
      // Load each category separately for backward compatibility
      const categories = [
        { key: 'editor', storageKey: 'editor-settings', defaults: editorSettingsDefaults },
        { key: 'ai', storageKey: 'ai-settings', defaults: aiSettingsDefaults },
        { key: 'keyboard', storageKey: 'keyboard-settings', defaults: keyboardSettingsDefaults },
        { key: 'integrations', storageKey: 'integration-settings', defaults: integrationSettingsDefaults },
        { key: 'advanced', storageKey: 'advanced-settings', defaults: advancedSettingsDefaults }
      ]

      for (const category of categories) {
        try {
          const stored = localStorage.getItem(category.storageKey)
          if (stored) {
            const parsed = JSON.parse(stored)
            loadedSettings[category.key as keyof AllSettings] = {
              ...category.defaults,
              ...parsed
            } as any
          }
        } catch (error) {
          logger.warn(`Failed to load ${category.key} settings from localStorage`, error)
        }
      }

      // Handle appearance settings separately (backward compatibility)
      try {
        let mergedAppearance = { ...appearanceSettingsDefaults }
        
        const themeSettings = localStorage.getItem('theme-settings')
        if (themeSettings) {
          const parsed = JSON.parse(themeSettings)
          mergedAppearance = { ...mergedAppearance, ...parsed }
        }
        
        const interfaceSettings = localStorage.getItem('interface-settings')
        if (interfaceSettings) {
          const parsed = JSON.parse(interfaceSettings)
          mergedAppearance = { ...mergedAppearance, ...parsed }
        }
        
        loadedSettings.appearance = mergedAppearance
      } catch (error) {
        logger.warn('Failed to load appearance settings from localStorage', error)
      }

      // Check for unified settings (new format)
      try {
        const unifiedSettings = localStorage.getItem('bashnota-settings')
        if (unifiedSettings) {
          const parsed = JSON.parse(unifiedSettings)
          // Merge with loaded settings, giving priority to unified format
          Object.assign(loadedSettings, parsed)
        }
      } catch (error) {
        logger.warn('Failed to load unified settings', error)
      }

      settings.value = loadedSettings
      hasUnsavedChanges.value = false
      logger.info('Settings loaded successfully')
    } catch (error) {
      logger.error('Failed to load settings', error)
      toast.error('Failed to load settings', {
        description: 'Using default settings instead'
      })
    } finally {
      isLoading.value = false
    }
  }

  const saveSettings = async () => {
    try {
      // Save to new unified format
      localStorage.setItem('bashnota-settings', JSON.stringify(settings.value))
      
      // Keep backward compatibility by saving individual categories
      localStorage.setItem('editor-settings', JSON.stringify(settings.value.editor))
      localStorage.setItem('ai-settings', JSON.stringify(settings.value.ai))
      
      // For appearance, merge theme and interface settings
      const appearanceForBackcompat = {
        theme: settings.value.appearance.theme,
        themeColor: settings.value.appearance.themeColor,
        highContrast: settings.value.appearance.highContrast,
        reducedMotion: settings.value.appearance.reducedMotion,
        darkModeSchedule: settings.value.appearance.darkModeSchedule
      }
      localStorage.setItem('theme-settings', JSON.stringify(appearanceForBackcompat))
      
      const interfaceForBackcompat = {
        sidebarWidth: settings.value.appearance.sidebarWidth,
        sidebarPosition: settings.value.appearance.sidebarPosition,
        density: settings.value.appearance.density,
        showStatusBar: settings.value.appearance.showStatusBar,
        showMenuBar: settings.value.appearance.showMenuBar,
        customCss: settings.value.appearance.customCss
      }
      localStorage.setItem('interface-settings', JSON.stringify(interfaceForBackcompat))

      lastSaved.value = new Date()
      hasUnsavedChanges.value = false
      
      // Emit global event for other parts of the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settings-changed', { 
          detail: { settings: settings.value, timestamp: lastSaved.value } 
        }))
      }
      
      logger.info('Settings saved successfully')
    } catch (error) {
      logger.error('Failed to save settings', error)
      toast.error('Failed to save settings', {
        description: 'Your changes may be lost'
      })
      throw error
    }
  }

  const updateCategory = <K extends keyof AllSettings>(
    category: K, 
    updates: Partial<AllSettings[K]>
  ) => {
    settings.value[category] = {
      ...settings.value[category],
      ...updates
    }
    hasUnsavedChanges.value = true
    
    // Auto-save after a short delay
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = setTimeout(() => {
      saveSettings().catch(console.error)
    }, 1000)
  }

  const resetCategory = <K extends keyof AllSettings>(category: K) => {
    const defaults = {
      editor: editorSettingsDefaults,
      appearance: appearanceSettingsDefaults,
      ai: aiSettingsDefaults,
      keyboard: keyboardSettingsDefaults,
      integrations: integrationSettingsDefaults,
      advanced: advancedSettingsDefaults
    }
    
    settings.value[category] = { ...defaults[category] } as AllSettings[K]
    hasUnsavedChanges.value = true
    saveSettings().catch(console.error)
    
    toast.success(`${category} settings reset to defaults`)
  }

  const resetAllSettings = () => {
    settings.value = {
      editor: { ...editorSettingsDefaults },
      appearance: { ...appearanceSettingsDefaults },
      ai: { ...aiSettingsDefaults },
      keyboard: { ...keyboardSettingsDefaults },
      integrations: { ...integrationSettingsDefaults },
      advanced: { ...advancedSettingsDefaults }
    }
    hasUnsavedChanges.value = true
    saveSettings().catch(console.error)
    
    toast.success('All settings reset to defaults')
  }

  const exportSettings = () => {
    const data = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      settings: settings.value
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bashnota-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Settings exported successfully')
  }

  const importSettings = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (data.settings) {
        // Validate and merge imported settings
        const mergedSettings = {
          editor: { ...editorSettingsDefaults, ...data.settings.editor },
          appearance: { ...appearanceSettingsDefaults, ...data.settings.appearance },
          ai: { ...aiSettingsDefaults, ...data.settings.ai },
          keyboard: { ...keyboardSettingsDefaults, ...data.settings.keyboard },
          integrations: { ...integrationSettingsDefaults, ...data.settings.integrations },
          advanced: { ...advancedSettingsDefaults, ...data.settings.advanced }
        }
        
        settings.value = mergedSettings
        hasUnsavedChanges.value = true
        await saveSettings()
        
        toast.success('Settings imported successfully')
      } else {
        throw new Error('Invalid settings file format')
      }
    } catch (error) {
      logger.error('Failed to import settings', error)
      toast.error('Failed to import settings', {
        description: 'Please check the file format'
      })
      throw error
    }
  }

  // Auto-save timeout
  let autoSaveTimeout: NodeJS.Timeout

  // Watch for changes and mark as unsaved
  watch(
    () => settings.value,
    () => {
      hasUnsavedChanges.value = true
    },
    { deep: true }
  )

  return {
    // State
    settings: allSettings,
    isLoading,
    lastSaved,
    hasUnsavedChanges,
    
    // Category getters
    editorSettings,
    appearanceSettings,
    aiSettings,
    keyboardSettings,
    integrationSettings,
    advancedSettings,
    
    // Actions
    loadSettings,
    saveSettings,
    updateCategory,
    resetCategory,
    resetAllSettings,
    exportSettings,
    importSettings
  }
})
