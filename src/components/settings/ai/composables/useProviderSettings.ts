import { ref, computed, watch, onMounted } from 'vue'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { toast } from '@/components/ui/toast'
import { logger } from '@/services/logger'

export interface ModelInfo {
  id: string
  name: string
  description?: string
  size?: string
  maxTokens?: number
  supportsVision?: boolean
  category?: 'small' | 'medium' | 'large'
}

export interface ProviderSettingsOptions {
  providerId: string
  requiresApiKey?: boolean
  apiKeyInstructions?: string
  supportsModelSelection?: boolean
  supportsCustomUrl?: boolean
  defaultUrl?: string
  connectionTestFn?: () => Promise<boolean>
  modelsFetchFn?: () => Promise<ModelInfo[]>
  saveSettingsFn?: (settings: Record<string, any>) => Promise<void>
}

export function useProviderSettings(options: ProviderSettingsOptions) {
  const aiSettings = useAISettingsStore()
  
  // Core state
  const isLoading = ref(false)
  const isConnected = ref(false)
  const hasChanges = ref(false)
  const models = ref<ModelInfo[]>([])
  const selectedModelId = ref('')
  const apiKey = ref('')
  const customUrl = ref(options.defaultUrl || '')
  const connectionError = ref<string | null>(null)

  // Computed properties
  const selectedModel = computed(() => 
    models.value.find(m => m.id === selectedModelId.value)
  )

  const isConfigured = computed(() => {
    if (options.requiresApiKey && !apiKey.value) return false
    if (options.supportsCustomUrl && !customUrl.value) return false
    return true
  })

  const categorizedModels = computed(() => {
    const categorized = {
      small: models.value.filter(m => m.category === 'small'),
      medium: models.value.filter(m => m.category === 'medium'),
      large: models.value.filter(m => m.category === 'large'),
      other: models.value.filter(m => !m.category)
    }
    return categorized
  })

  // API Key management
  const handleApiKeyChange = (newKey: string) => {
    if (newKey !== apiKey.value) {
      apiKey.value = newKey
      aiSettings.setApiKey(options.providerId, newKey)
      hasChanges.value = true
      
      if (newKey) {
        toast({
          title: 'API Key Saved',
          description: `API key for ${options.providerId} has been saved.`
        })
        // Try to load models with new key
        if (options.modelsFetchFn) {
          loadModels()
        }
      } else {
        toast({
          title: 'API Key Removed',
          description: `API key for ${options.providerId} has been removed.`
        })
        models.value = []
        isConnected.value = false
      }
    }
  }

  const handleApiKeyPaste = (event: ClipboardEvent) => {
    const clipboardText = event.clipboardData?.getData('text') || ''
    if (clipboardText.trim()) {
      handleApiKeyChange(clipboardText.trim())
    }
  }

  const clearApiKey = () => {
    handleApiKeyChange('')
  }

  // Model management
  const loadModels = async () => {
    if (!options.modelsFetchFn || !isConfigured.value) {
      return
    }

    try {
      isLoading.value = true
      const fetchedModels = await options.modelsFetchFn()
      models.value = fetchedModels
      
      // Auto-select first model if none selected
      if (fetchedModels.length > 0 && !selectedModelId.value) {
        // Prefer small models for initial selection
        const smallModel = fetchedModels.find(m => m.category === 'small')
        selectedModelId.value = smallModel?.id || fetchedModels[0].id
      }

      // Validate current selection
      if (selectedModelId.value && !fetchedModels.find(m => m.id === selectedModelId.value)) {
        selectedModelId.value = fetchedModels[0]?.id || ''
      }

      isConnected.value = true
      connectionError.value = null
      
      toast({
        title: 'Models Loaded',
        description: `Found ${fetchedModels.length} models.`
      })
    } catch (error) {
      logger.error(`Error loading models for ${options.providerId}:`, error)
      connectionError.value = error instanceof Error ? error.message : 'Unknown error'
      isConnected.value = false
      
      toast({
        title: 'Error Loading Models',
        description: connectionError.value,
        variant: 'destructive'
      })
    } finally {
      isLoading.value = false
    }
  }

  // Connection testing
  const testConnection = async (): Promise<boolean> => {
    if (!options.connectionTestFn) {
      return isConfigured.value
    }

    try {
      isLoading.value = true
      connectionError.value = null
      
      const result = await options.connectionTestFn()
      isConnected.value = result
      
      if (result && options.modelsFetchFn) {
        await loadModels()
      }
      
      return result
    } catch (error) {
      logger.error(`Connection test failed for ${options.providerId}:`, error)
      connectionError.value = error instanceof Error ? error.message : 'Connection failed'
      isConnected.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Settings persistence
  const saveSettings = async () => {
    try {
      const settings: Record<string, any> = {}
      
      if (options.supportsModelSelection && selectedModelId.value) {
        settings[`${options.providerId}Model`] = selectedModelId.value
      }
      
      if (options.supportsCustomUrl && customUrl.value) {
        settings[`${options.providerId}ServerUrl`] = customUrl.value
      }

      // Save to store
      aiSettings.updateSettings(settings)
      
      // Call custom save function if provided
      if (options.saveSettingsFn) {
        await options.saveSettingsFn(settings)
      }
      
      hasChanges.value = false
      
      return settings
    } catch (error) {
      logger.error(`Error saving settings for ${options.providerId}:`, error)
      throw error
    }
  }

  // Initialize settings from store
  const loadInitialSettings = () => {
    // Load API key
    if (options.requiresApiKey) {
      apiKey.value = aiSettings.getApiKey(options.providerId) || ''
    }
    
    // Load selected model
    if (options.supportsModelSelection) {
      const settingsKey = `${options.providerId}Model`
      selectedModelId.value = (aiSettings.settings as any)[settingsKey] || ''
    }
    
    // Load custom URL
    if (options.supportsCustomUrl) {
      const settingsKey = `${options.providerId}ServerUrl`
      customUrl.value = (aiSettings.settings as any)[settingsKey] || options.defaultUrl || ''
    }
  }

  // Watch for changes
  watch([selectedModelId, customUrl], () => {
    hasChanges.value = true
  })

  // Auto-initialize on mount
  onMounted(async () => {
    loadInitialSettings()
    
    // Auto-test connection if configured
    if (isConfigured.value) {
      await testConnection()
    }
  })

  return {
    // State
    isLoading,
    isConnected,
    hasChanges,
    models,
    selectedModelId,
    selectedModel,
    apiKey,
    customUrl,
    connectionError,
    isConfigured,
    categorizedModels,
    
    // Methods
    handleApiKeyChange,
    handleApiKeyPaste,
    clearApiKey,
    loadModels,
    testConnection,
    saveSettings,
    loadInitialSettings,
    
    // Computed
    apiKeyInstructions: options.apiKeyInstructions || `API key required for ${options.providerId}`
  }
} 