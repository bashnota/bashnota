import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { aiService } from '@/features/ai/services'
import type { ProviderConfig as LLMProvider } from '@/features/ai/services'
import { toast } from '@/ui/toast'
import { logger } from '@/services/logger'

export interface AISettings {
  preferredProviderId: string
  apiKeys: Record<string, string>
  customPrompt: string
  maxTokens: number
  temperature: number
  geminiModel?: string // The specific Gemini model to use
  geminiSafetyThreshold?: string // Safety threshold for content filtering
  sidebarWidth?: number // Width of the AI assistant sidebar
  ollamaServerUrl?: string // Ollama server URL
  ollamaModel?: string // The selected Ollama model
  webllmModel?: string // The selected WebLLM model
  webllmDefaultModel?: string // The default WebLLM model to auto-load
  webllmAutoLoad?: boolean // Whether to auto-load WebLLM model on request
  webllmAutoLoadStrategy?: 'default' | 'smallest' | 'fastest' | 'balanced' | 'none' // Auto-load strategy
  autoSelectProvider?: boolean // Whether to auto-select the best available provider
  requestTimeout?: number // Request timeout in seconds
}

export const useAISettingsStore = defineStore('aiSettings', () => {
  const settings = ref<AISettings>({
    preferredProviderId: 'gemini',
    apiKeys: {},
    customPrompt: '',
    maxTokens: 2048, // Increased from 1024 to avoid token limit issues
    temperature: 0.7,
    geminiModel: 'gemini-1.5-pro', // Default to stable Gemini 1.5 Pro instead of experimental model
    geminiSafetyThreshold: 'BLOCK_MEDIUM_AND_ABOVE', // Default safety threshold
    sidebarWidth: 350, // Default sidebar width
    ollamaServerUrl: 'http://localhost:11434', // Default Ollama server URL
    ollamaModel: 'llama2', // Default Ollama model
    webllmModel: '', // Current WebLLM model
    webllmDefaultModel: '', // Default WebLLM model to auto-load
    webllmAutoLoad: true, // Auto-load default model on request
    webllmAutoLoadStrategy: 'smallest', // Default to smallest model for better UX
    autoSelectProvider: true // Default to auto-selecting the best available provider
  })

  const providers = computed(() => aiService.getProviderConfigs())
  
  const preferredProvider = computed<LLMProvider | undefined>(
    () => (aiService.getProviderConfigs() as LLMProvider[]).find(p => p.id === settings.value.preferredProviderId)
  )

  const getApiKey = (providerId: string): string => {
    return settings.value.apiKeys[providerId] || ''
  }

  const setApiKey = (providerId: string, apiKey: string) => {
    settings.value.apiKeys = {
      ...settings.value.apiKeys,
      [providerId]: apiKey
    }
    saveSettings()
  }

  const setPreferredProvider = (providerId: string) => {
    settings.value.preferredProviderId = providerId
    saveSettings()
    
    // Update the AI service's default provider to match
    try {
      import('@/features/ai/services').then(({ aiService }) => {
        aiService.setDefaultProviderId(providerId)
      })
    } catch (error) {
      logger.error('Failed to update AI service provider', error)
    }
  }

  const updateSettings = (newSettings: Partial<AISettings>) => {
    settings.value = {
      ...settings.value,
      ...newSettings
    }
    saveSettings()
  }

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('ai-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        settings.value = {
          ...settings.value,
          ...parsed
        }
      } catch (error) {
        logger.error('Failed to parse saved AI settings', error)
      }
    }
  }

  const saveSettings = () => {
    localStorage.setItem('ai-settings', JSON.stringify(settings.value))
  }

  const setWebLLMDefaultModel = (modelId: string) => {
    settings.value.webllmDefaultModel = modelId
    saveSettings()
    logger.info(`WebLLM default model set to: ${modelId}`)
    
    // 🔥 NEW: Also update the WebLLM default model service
    import('@/features/ai/services/webLLMDefaultModelService').then(({ webLLMDefaultModelService }) => {
      webLLMDefaultModelService.setUserDefaultModel(modelId)
    }).catch(error => {
      logger.error('Failed to update WebLLM default model service:', error)
    })
  }

  const setWebLLMAutoLoad = (enabled: boolean) => {
    settings.value.webllmAutoLoad = enabled
    saveSettings()
    logger.info(`WebLLM auto-load ${enabled ? 'enabled' : 'disabled'}`)
    
    // 🔥 NEW: Sync with WebLLM default model service
    import('@/features/ai/services/webLLMDefaultModelService').then(({ webLLMDefaultModelService }) => {
      webLLMDefaultModelService.saveDefaultModelConfig({
        autoLoadOnRequest: enabled
      })
    }).catch(error => {
      logger.error('Failed to update WebLLM auto-load setting:', error)
    })
  }

  const setWebLLMAutoLoadStrategy = (strategy: 'default' | 'smallest' | 'fastest' | 'balanced' | 'none') => {
    settings.value.webllmAutoLoadStrategy = strategy
    saveSettings()
    logger.info(`WebLLM auto-load strategy set to: ${strategy}`)
    
    // 🔥 NEW: Sync with WebLLM default model service
    import('@/features/ai/services/webLLMDefaultModelService').then(({ webLLMDefaultModelService }) => {
      webLLMDefaultModelService.saveDefaultModelConfig({
        autoLoadStrategy: strategy === 'default' ? 'balanced' : strategy as any
      })
    }).catch(error => {
      logger.error('Failed to update WebLLM auto-load strategy:', error)
    })
  }

  const getWebLLMSettings = () => ({
    currentModel: settings.value.webllmModel,
    defaultModel: settings.value.webllmDefaultModel,
    autoLoad: settings.value.webllmAutoLoad,
    autoLoadStrategy: settings.value.webllmAutoLoadStrategy
  })

  // 🔥 NEW: Sync settings with WebLLM default model service
  const syncWebLLMSettings = async () => {
    try {
      const { webLLMDefaultModelService } = await import('@/features/ai/services/webLLMDefaultModelService')
      const config = webLLMDefaultModelService.getDefaultModelConfig()
      
      // Sync from WebLLM service to store
      if (config.userSelectedModel && config.userSelectedModel !== settings.value.webllmDefaultModel) {
        settings.value.webllmDefaultModel = config.userSelectedModel
      }
      
      if (config.autoLoadOnRequest !== settings.value.webllmAutoLoad) {
        settings.value.webllmAutoLoad = config.autoLoadOnRequest
      }
      
      if (config.autoLoadStrategy && config.autoLoadStrategy !== settings.value.webllmAutoLoadStrategy) {
        settings.value.webllmAutoLoadStrategy = config.autoLoadStrategy as any
      }
      
      saveSettings()
    } catch (error) {
      logger.error('Failed to sync WebLLM settings:', error)
    }
  }

  // Load settings on store initialization
  loadSettings()

  // Add a watcher that auto-saves when API keys change
  watch(settings.value.apiKeys, (newKeys, oldKeys) => {
    // Only process keys that have changed
    Object.entries(newKeys).forEach(([providerId, key]) => {
      if (key !== oldKeys[providerId]) {
        setApiKey(providerId, key)
        if (key) {
          toast({
            title: 'API Key Saved',
            description: `API key for ${providerId} has been saved.`,
          })
        }
      }
    })
  }, { deep: true })

  return {
    settings,
    providers,
    preferredProvider,
    getApiKey,
    setApiKey,
    setPreferredProvider,
    updateSettings,
    setWebLLMDefaultModel,
    setWebLLMAutoLoad,
    setWebLLMAutoLoadStrategy,
    getWebLLMSettings,
    syncWebLLMSettings
  }
})








