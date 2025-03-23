import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { supportedProviders, type LLMProvider } from '@/services/aiService'
import { toast } from '@/components/ui/toast'
import { logger } from '@/services/logger'

export interface AISettings {
  preferredProviderId: string
  apiKeys: Record<string, string>
  customPrompt: string
  maxTokens: number
  temperature: number
  geminiModel?: string // The specific Gemini model to use
  geminiSafetyThreshold?: string // Safety threshold for content filtering
}

export const useAISettingsStore = defineStore('aiSettings', () => {
  const settings = ref<AISettings>({
    preferredProviderId: 'gemini',
    apiKeys: {},
    customPrompt: '',
    maxTokens: 1024,
    temperature: 0.7,
    geminiModel: 'gemini-1.5-pro', // Default to Gemini 1.5 Pro
    geminiSafetyThreshold: 'BLOCK_MEDIUM_AND_ABOVE' // Default safety threshold
  })

  const providers = computed(() => supportedProviders)
  
  const preferredProvider = computed<LLMProvider | undefined>(
    () => supportedProviders.find(p => p.id === settings.value.preferredProviderId)
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
    updateSettings
  }
}) 