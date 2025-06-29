<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">AI Settings</h2>
        <p class="text-muted-foreground">
          Configure AI providers and global settings for your workspace
        </p>
      </div>
      <Badge :variant="hasConfiguredProvider ? 'default' : 'secondary'">
        {{ configuredProvidersCount }} provider{{ configuredProvidersCount !== 1 ? 's' : '' }} configured
      </Badge>
    </div>

    <!-- Global Settings Card -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center">
          <Settings class="mr-2 h-5 w-5" />
          Global AI Settings
        </CardTitle>
        <CardDescription>
          Default parameters applied to all AI providers
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- Global Parameters -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <Label class="text-sm">Default Temperature ({{ temperature[0].toFixed(1) }})</Label>
            <Slider
              v-model="temperature"
              :min="0"
              :max="2"
              :step="0.1"
            />
            <p class="text-xs text-gray-500">
              {{ getTemperatureDescription(temperature[0]) }}
            </p>
          </div>
          <div class="space-y-2">
            <Label class="text-sm">Default Max Tokens ({{ maxTokens[0] }})</Label>
            <Slider
              v-model="maxTokens"
              :min="100"
              :max="4000"
              :step="100"
            />
            <p class="text-xs text-gray-500">
              Maximum length for AI responses
            </p>
          </div>
        </div>

        <!-- Custom System Prompt -->
        <div class="space-y-2">
          <Label for="custom-prompt">Custom System Prompt (Optional)</Label>
          <Textarea
            id="custom-prompt"
            v-model="customPrompt"
            placeholder="Enter a custom system prompt to influence AI behavior..."
            rows="3"
          />
          <p class="text-xs text-gray-500">
            This prompt will be prepended to all AI conversations
          </p>
        </div>

        <!-- Auto-selection Settings -->
        <div class="flex items-center space-x-2">
          <Checkbox v-model="autoSelectProvider" />
          <Label for="auto-select">Automatically select best available provider</Label>
        </div>
      </CardContent>
    </Card>

    <!-- Provider Selection & Configuration -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center">
          <SparklesIcon class="mr-2 h-5 w-5" />
          AI Providers
        </CardTitle>
        <CardDescription>
          Select and configure your preferred AI provider
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- Active Provider Selection -->
        <div class="space-y-3">
          <Label class="text-sm font-medium">Active Provider</Label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              v-for="provider in providerConfigs" 
              :key="provider.id"
              :class="[
                'relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md',
                activeProviderId === provider.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              ]"
              @click="selectProvider(provider.id)"
            >
              <div class="flex items-start space-x-3">
                <component :is="provider.icon" class="h-6 w-6 mt-1" />
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium">{{ provider.name }}</h3>
                  <p class="text-sm text-muted-foreground mt-1">{{ provider.description }}</p>
                  
                  <div class="flex items-center justify-between mt-3">
                    <Badge 
                      :variant="getProviderStatus(provider.id) === 'connected' ? 'default' : 'secondary'" 
                      class="text-xs"
                    >
                      {{ getProviderStatusText(provider.id) }}
                    </Badge>
                    <div v-if="activeProviderId === provider.id" class="flex items-center text-primary">
                      <CheckCircleIcon class="h-4 w-4 mr-1" />
                      <span class="text-xs font-medium">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Provider Configuration -->
        <div v-if="activeProvider" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium">{{ activeProvider.name }} Configuration</h3>
            <Button
              variant="ghost"
              size="sm"
              @click="showProviderConfig = !showProviderConfig"
            >
              {{ showProviderConfig ? 'Hide' : 'Show' }} Configuration
            </Button>
          </div>

          <div v-if="showProviderConfig" class="border rounded-lg p-1">
            <!-- Gemini Configuration -->
            <GeminiProviderSettings v-if="activeProviderId === 'gemini'" />
            
            <!-- Ollama Configuration -->
            <OllamaProviderSettings v-if="activeProviderId === 'ollama'" />
            
            <!-- WebLLM Configuration -->
            <WebLLMProviderSettings v-if="activeProviderId === 'webllm'" />
          </div>
        </div>

        <!-- Quick Provider Status Overview -->
        <div class="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 class="font-medium mb-3">All Providers Status</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div 
              v-for="provider in providerStatus" 
              :key="provider.id"
              class="flex items-center justify-between p-3 bg-background rounded border"
            >
              <div class="flex items-center space-x-2">
                <component :is="provider.icon" class="h-4 w-4" />
                <span class="text-sm font-medium">{{ provider.name }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <Badge 
                  :variant="provider.status === 'connected' ? 'default' : 'secondary'" 
                  class="text-xs"
                >
                  {{ provider.statusText }}
                </Badge>
                <span v-if="provider.modelCount" class="text-xs text-muted-foreground">
                  {{ provider.modelCount }} models
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Save Actions -->
    <div class="flex justify-between items-center pt-6 border-t">
      <div class="text-sm text-muted-foreground">
        Changes are saved automatically
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="resetToDefaults">
          Reset to Defaults
        </Button>
        <Button @click="saveAllSettings" :disabled="isSaving">
          <Save class="mr-2 h-4 w-4" />
          {{ isSaving ? 'Saving...' : 'Save All Settings' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Button } from '@/ui/button'
import { Label } from '@/ui/label'
import { Slider } from '@/ui/slider'
import { Textarea } from '@/ui/textarea'
import { Checkbox } from '@/ui/checkbox'
import { Badge } from '@/ui/badge'
import { toast } from '@/ui/toast'
import { 
  SparklesIcon, 
  ServerIcon, 
  Globe as GlobeIcon, 
  Settings, 
  Save,
  CheckCircle as CheckCircleIcon
} from 'lucide-vue-next'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import GeminiProviderSettings from './providers/GeminiProviderSettings.vue'
import OllamaProviderSettings from './providers/OllamaProviderSettings.vue'
import WebLLMProviderSettings from './providers/WebLLMProviderSettings.vue'

// Stores and composables
const aiSettings = useAISettingsStore()
const aiProviders = useAIProviders()

// State
const isSaving = ref(false)
const showProviderConfig = ref(true)

// Settings
const activeProviderId = ref(aiSettings.settings.preferredProviderId || 'gemini')
const temperature = ref([aiSettings.settings.temperature])
const maxTokens = ref([aiSettings.settings.maxTokens])
const customPrompt = ref(aiSettings.settings.customPrompt)
const autoSelectProvider = ref(aiSettings.settings.autoSelectProvider ?? true)

// Provider configurations
const providerConfigs = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: SparklesIcon,
    requiresApiKey: true,
    description: 'Google\'s most capable AI model with excellent reasoning'
  },
  {
    id: 'ollama',
    name: 'Ollama',
    icon: ServerIcon,
    requiresApiKey: false,
    description: 'Run powerful AI models locally on your machine'
  },
  {
    id: 'webllm',
    name: 'WebLLM',
    icon: GlobeIcon,
    requiresApiKey: false,
    description: 'Privacy-focused AI that runs entirely in your browser'
  }
]

// Computed
const activeProvider = computed(() => 
  providerConfigs.find(p => p.id === activeProviderId.value)
)

const configuredProvidersCount = computed(() => {
  return providerConfigs.filter(provider => {
    if (provider.requiresApiKey) {
      return !!aiSettings.getApiKey(provider.id)
    }
    return true // Assume non-API key providers are always "configured"
  }).length
})

const hasConfiguredProvider = computed(() => configuredProvidersCount.value > 0)

const providerStatus = computed(() => {
  return providerConfigs.map(provider => ({
    ...provider,
    status: getProviderStatus(provider.id),
    statusText: getProviderStatusText(provider.id),
    modelCount: getProviderModelCount(provider.id)
  }))
})

// Methods
const getProviderStatus = (providerId: string): 'connected' | 'disconnected' => {
  const provider = providerConfigs.find(p => p.id === providerId)
  if (!provider) return 'disconnected'
  
  if (provider.requiresApiKey) {
    return aiSettings.getApiKey(providerId) ? 'connected' : 'disconnected'
  }
  
  return 'connected' // Assume local providers are always available
}

const getProviderStatusText = (providerId: string): string => {
  const status = getProviderStatus(providerId)
  return status === 'connected' ? 'Ready' : 'Not Configured'
}

const getProviderModelCount = (providerId: string): number => {
  switch (providerId) {
    case 'gemini':
      return aiProviders.geminiModels.value.length
    case 'webllm':
      return aiProviders.webLLMModels.value.length
    default:
      return 0
  }
}

const getTemperatureDescription = (temp: number): string => {
  if (temp < 0.3) return 'More precise and deterministic'
  if (temp > 0.7) return 'More creative and varied'
  return 'Balanced creativity and precision'
}

const selectProvider = (providerId: string) => {
  activeProviderId.value = providerId
  showProviderConfig.value = true
}

const saveAllSettings = async () => {
  try {
    isSaving.value = true
    
    await aiSettings.updateSettings({
      preferredProviderId: activeProviderId.value,
      temperature: temperature.value[0],
      maxTokens: maxTokens.value[0],
      customPrompt: customPrompt.value,
      autoSelectProvider: autoSelectProvider.value
    })
    
    toast({
      title: 'Settings Saved',
      description: 'All AI settings have been saved successfully.'
    })
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to save settings.',
      variant: 'destructive'
    })
  } finally {
    isSaving.value = false
  }
}

const resetToDefaults = () => {
  activeProviderId.value = 'gemini'
  temperature.value = [0.7]
  maxTokens.value = [2048]
  customPrompt.value = ''
  autoSelectProvider.value = true
  
  toast({
    title: 'Reset to Defaults',
    description: 'Settings have been reset to default values.'
  })
}

// Initialize
onMounted(() => {
  aiProviders.initialize()
})
</script> 







