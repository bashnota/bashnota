<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SparklesIcon, KeyIcon, Save, Trash2Icon, CpuIcon, RefreshCcwIcon, ServerIcon } from 'lucide-vue-next'
import WebLLMSettings from '@/components/settings/WebLLMSettings.vue'
import GeminiSettings from '@/components/settings/GeminiSettings.vue'
import OllamaSettings from '@/components/settings/OllamaSettings.vue'
import type { GeminiModelInfo } from '@/services/ai'
import SearchableSelect from '@/components/ui/searchable-select.vue'
// Import the composable
import { useAIProviders } from '@/components/sidebars/ai-assistant/composables/useAIProviders'

const aiSettings = useAISettingsStore()
// Use the composable
const {
  providers,
  geminiModels,
  isLoadingGeminiModels,
  fetchGeminiModels,
  setDefaultModel
} = useAIProviders()

const apiKeys = ref<Record<string, string>>({...aiSettings.settings.apiKeys})
const customPrompt = ref(aiSettings.settings.customPrompt)
const maxTokens = ref([aiSettings.settings.maxTokens])
const temperature = ref([aiSettings.settings.temperature])
const preferredProviderId = ref(aiSettings.settings.preferredProviderId)
const activeTab = ref('general')
const selectedGeminiModel = ref(aiSettings.settings.geminiModel || 'gemini-1.5-pro')
const safetyThreshold = ref(aiSettings.settings.geminiSafetyThreshold || 'BLOCK_MEDIUM_AND_ABOVE')
const showAdvancedGeminiSettings = ref(false)
const sidebarWidth = ref([aiSettings.settings.sidebarWidth || 350])

/**
 * Save all settings across tabs
 */
const saveSettings = () => {
  // Update API keys
  Object.entries(apiKeys.value).forEach(([providerId, key]) => {
    if (key) {
      aiSettings.setApiKey(providerId, key)
    }
  })

  // Update other settings
  aiSettings.updateSettings({
    preferredProviderId: preferredProviderId.value,
    customPrompt: customPrompt.value,
    maxTokens: maxTokens.value[0],
    temperature: temperature.value[0],
    geminiModel: selectedGeminiModel.value,
    geminiSafetyThreshold: safetyThreshold.value,
    sidebarWidth: sidebarWidth.value[0]
  })

  // Set default model for current provider
  if (preferredProviderId.value === 'gemini') {
    setDefaultModel('gemini', selectedGeminiModel.value)
  }

  toast({
    title: 'Settings Saved',
    description: 'Your AI generation settings have been updated.',
  })
}

/**
 * Clear API key for a provider
 */
const clearApiKey = (providerId: string) => {
  apiKeys.value[providerId] = ''
  aiSettings.setApiKey(providerId, '')
  
  toast({
    title: 'API Key Removed',
    description: `API key for provider has been removed.`,
  })
}

/**
 * Format temperature label for UI display
 */
const formatTemperature = (temp: number) => {
  if (temp < 0.3) return 'More precise'
  if (temp > 0.7) return 'More creative'
  return 'Balanced'
}

/**
 * Get API key instructions for a provider
 */
const getApiKeyInstructions = (providerId: string) => {
  switch(providerId) {
    case 'gemini':
      return 'Available from Google AI Studio at https://makersuite.google.com/app/apikey'
    case 'ollama':
      return 'Not required for local Ollama installation'
    default:
      return 'API key required for this provider'
  }
}

/**
 * Fetch Gemini models from API
 */
const loadGeminiModels = async () => {
  const apiKey = aiSettings.getApiKey('gemini')
  if (!apiKey) {
    toast({
      title: 'API Key Required',
      description: 'Please enter a Gemini API key to fetch available models.',
      variant: 'destructive'
    })
    return
  }
  
  try {
    const models = await fetchGeminiModels(apiKey)
    
    // If current model isn't in the list, select the first one
    if (!models.find(m => m.id === selectedGeminiModel.value) && models.length > 0) {
      selectedGeminiModel.value = models[0].id
    }
    
    toast({
      title: 'Models Loaded',
      description: `Found ${models.length} Gemini models.`
    })
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to fetch Gemini models. Using default models instead.',
      variant: 'destructive'
    })
  }
}

// Watch for provider changes
watch(preferredProviderId, (newValue) => {
  // Set the active tab to the selected provider
  activeTab.value = newValue
  
  if (newValue === 'gemini') {
    // Try to load models with existing API key
    const apiKey = aiSettings.getApiKey('gemini')
    if (apiKey) {
      loadGeminiModels()
    }
  }
})

// Watch for active tab changes
watch(activeTab, (newValue) => {
  // Exclude general and webllm tabs from changing preferred provider
  if (newValue !== 'general' && newValue !== 'webllm') {
    preferredProviderId.value = newValue
  }
})

onMounted(() => {
  // Initialize API keys from store
  aiSettings.providers.forEach(provider => {
    if (provider.requiresApiKey) {
      const key = aiSettings.getApiKey(provider.id)
      if (key) {
        apiKeys.value[provider.id] = key
      }
    }
  })
  
  // Set active tab to preferred provider if there is one
  if (preferredProviderId.value) {
    activeTab.value = preferredProviderId.value
  }
  
  // Try to load Gemini models if Gemini is selected
  if (preferredProviderId.value === 'gemini') {
    const apiKey = aiSettings.getApiKey('gemini')
    if (apiKey) {
      loadGeminiModels()
    }
  }
})

/**
 * Handle API key change
 */
const handleApiKeyChange = (providerId: string, newKey: string) => {
  // Get the old key for comparison
  const oldKey = aiSettings.getApiKey(providerId) || ''
  
  // Only proceed if the key has actually changed
  if (newKey !== oldKey) {
    // Save the key
    aiSettings.setApiKey(providerId, newKey)
    
    // Show appropriate notification
    if (newKey) {
      toast({
        title: 'API Key Saved',
        description: `API key for ${providerId} has been saved.`,
      })
    } else {
      toast({
        title: 'API Key Removed',
        description: `API key for ${providerId} has been removed.`,
      })
    }
  }
}

/**
 * Handle paste event properly
 */ 
const handlePaste = (providerId: string, event: ClipboardEvent) => {
  // Access the clipboard data directly instead of relying on the input value
  const clipboardText = event.clipboardData?.getData('text') || ''
  
  if (clipboardText.trim()) {
    // Update the reactive reference
    apiKeys.value[providerId] = clipboardText.trim()
    // Call API key change handler directly with the clipboard text
    handleApiKeyChange(providerId, clipboardText.trim())
  }
}

/**
 * Get provider icon component
 */
const getProviderIcon = (providerId: string) => {
  switch(providerId) {
    case 'webllm':
      return CpuIcon
    case 'ollama':
      return ServerIcon
    default:
      return SparklesIcon
  }
}
</script>

<template>
  <div class="space-y-6">
    <Tabs v-model="activeTab" class="w-full">
      <!-- Dynamic tabs list with one tab per provider plus general settings -->
      <TabsList class="grid" :class="`grid-cols-${providers.length + 1}`">
        <!-- General Settings Tab -->
        <TabsTrigger value="general" class="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          <div class="flex items-center justify-center gap-2 p-2">
            <SparklesIcon class="w-4 h-4 shrink-0" />
            <span class="text-sm font-medium">General</span>
          </div>
        </TabsTrigger>
        
        <!-- One tab per provider -->
        <TabsTrigger 
          v-for="provider in providers" 
          :key="provider.id"
          :value="provider.id" 
          class="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <div class="flex items-center justify-center gap-2 p-2">
            <component :is="getProviderIcon(provider.id)" class="w-4 h-4 shrink-0" />
            <span class="text-sm font-medium">{{ provider.name }}</span>
          </div>
        </TabsTrigger>
      </TabsList>

      <!-- General settings content -->
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center text-xl font-semibold">
              <SparklesIcon class="mr-2 h-5 w-5" /> General AI Settings
            </CardTitle>
            <CardDescription>
              Configure common AI text generation settings
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div class="space-y-6">
              <!-- Provider Selection -->
              <div class="space-y-2">
                <Label for="preferred-provider">Preferred AI Provider</Label>
                <Select v-model="preferredProviderId">
                  <SelectTrigger id="preferred-provider">
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent class="max-h-[200px] overflow-auto">
                    <SelectItem 
                      v-for="provider in providers" 
                      :key="provider.id" 
                      :value="provider.id"
                    >
                      {{ provider.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p class="text-xs text-gray-500">
                  Select your preferred AI provider for text generation
                </p>
              </div>

              <!-- Common Advanced Settings -->
              <div class="space-y-4">
                <h3 class="text-lg font-medium">Advanced Settings</h3>

                <!-- Custom System Prompt -->
                <div class="space-y-2">
                  <Label for="custom-prompt">Custom System Prompt</Label>
                  <Textarea
                    id="custom-prompt"
                    v-model="customPrompt"
                    placeholder="Optional: Add a custom system prompt that will be used for all generations"
                    rows="3"
                  />
                  <p class="text-xs text-gray-500">
                    A system prompt helps guide the AI's behavior. Leave empty to use default.
                  </p>
                </div>

                <!-- Temperature -->
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <Label for="temperature">Temperature: {{ temperature[0].toFixed(1) }}</Label>
                    <span class="text-xs text-gray-500">{{ formatTemperature(temperature[0]) }}</span>
                  </div>
                  <Slider
                    id="temperature"
                    v-model="temperature"
                    :min="0"
                    :max="1"
                    :step="0.1"
                  />
                  <p class="text-xs text-gray-500">
                    Controls randomness: lower values are more deterministic, higher values are more creative
                  </p>
                </div>

                <!-- Max Tokens -->
                <div class="space-y-2">
                  <Label for="max-tokens">Max Tokens: {{ maxTokens[0] }}</Label>
                  <Slider
                    id="max-tokens"
                    v-model="maxTokens"
                    :min="100"
                    :max="8192"
                    :step="100"
                  />
                  <p class="text-xs text-gray-500">
                    Maximum number of tokens to generate
                  </p>
                </div>

                <!-- Sidebar Width -->
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <Label for="sidebar-width">AI Assistant Sidebar Width: {{ sidebarWidth[0] }}px</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      @click="sidebarWidth = [350]" 
                      class="h-7 text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                  <Slider
                    id="sidebar-width"
                    v-model="sidebarWidth"
                    :min="250"
                    :max="800"
                    :step="10"
                  />
                  <p class="text-xs text-gray-500">
                    Controls the width of the AI Assistant sidebar (min: 250px, max: 800px)
                  </p>
                </div>
              </div>

              <!-- Save Button -->
              <Button @click="saveSettings" class="w-full">
                <Save class="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- Provider-specific tabs -->
      <TabsContent value="webllm">
        <WebLLMSettings />
      </TabsContent>
      
      <TabsContent value="gemini">
        <GeminiSettings />
      </TabsContent>
      
      <TabsContent value="ollama">
        <OllamaSettings />
      </TabsContent>
    </Tabs>
  </div>
</template>