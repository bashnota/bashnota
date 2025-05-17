<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { 
  SparklesIcon, 
  KeyIcon, 
  InfoIcon,
  Trash2Icon,
  RefreshCwIcon
} from 'lucide-vue-next'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { logger } from '@/services/logger'
import SearchableSelect from '@/components/ui/searchable-select.vue'
// Import the composable
import { useAIProviders } from '@/components/sidebars/ai-assistant/composables/useAIProviders'

// Use the composable
const {
  geminiModels,
  isLoadingGeminiModels,
  fetchGeminiModels,
  setDefaultModel
} = useAIProviders()

const aiSettings = useAISettingsStore()

// State variables
const apiKey = ref(aiSettings.getApiKey('gemini') || '')
const selectedModelId = ref(aiSettings.settings.geminiModel || 'gemini-1.5-pro')
const safetyThreshold = ref(aiSettings.settings.geminiSafetyThreshold || 'BLOCK_MEDIUM_AND_ABOVE')
const showAdvancedSettings = ref(false)
const isAvailable = ref(false)

// Load available models
const loadGeminiModels = async () => {
  if (!apiKey.value) {
    toast({
      title: 'API Key Required',
      description: 'Please enter a Gemini API key to fetch available models.',
      variant: 'destructive'
    })
    return
  }
  
  try {
    // Set the API key in the store first, then fetch models
    aiSettings.setApiKey('gemini', apiKey.value)
    const models = await fetchGeminiModels() || []
    
    // If current model isn't in the list, select the first one
    if (!models.find(m => m.id === selectedModelId.value) && models.length > 0) {
      selectedModelId.value = models[0].id
    }
    
    isAvailable.value = models.length > 0
    
    toast({
      title: 'Models Loaded',
      description: `Found ${models.length} Gemini models.`
    })
  } catch (error) {
    logger.error('Error loading Gemini models:', error)
    isAvailable.value = false
    
    toast({
      title: 'Error',
      description: 'Failed to fetch Gemini models. Check your API key and internet connection.',
      variant: 'destructive'
    })
  }
}

// Handle API key changes
const handleApiKeyChange = (newKey: string) => {
  // Only proceed if the key has actually changed
  if (newKey !== apiKey.value) {
    apiKey.value = newKey
    aiSettings.setApiKey('gemini', newKey)
    
    // Show appropriate notification
    if (newKey) {
      toast({
        title: 'API Key Saved',
        description: 'Gemini API key has been saved.',
      })
      // Try to load models with the new key
      loadGeminiModels()
    } else {
      toast({
        title: 'API Key Removed',
        description: 'Gemini API key has been removed.',
      })
      isAvailable.value = false
    }
  }
}

// Handle paste event for API key
const handlePaste = (event: ClipboardEvent) => {
  const clipboardText = event.clipboardData?.getData('text') || ''
  
  if (clipboardText.trim()) {
    handleApiKeyChange(clipboardText.trim())
  }
}

// Clear API key
const clearApiKey = () => {
  apiKey.value = ''
  aiSettings.setApiKey('gemini', '')
  isAvailable.value = false
  
  toast({
    title: 'API Key Removed',
    description: 'Gemini API key has been removed.',
  })
}

// Save settings
const saveSettings = () => {
  // Save to settings store
  aiSettings.updateSettings({
    geminiModel: selectedModelId.value,
    geminiSafetyThreshold: safetyThreshold.value
  })
  
  // Set as default model if Gemini is the preferred provider
  if (aiSettings.settings.preferredProviderId === 'gemini') {
    setDefaultModel('gemini', selectedModelId.value)
  }
  
  toast({
    title: 'Settings Saved',
    description: 'Your Gemini settings have been updated.',
  })
}

// Lifecycle hooks
onMounted(async () => {
  // Try to load models if we have an API key
  if (apiKey.value) {
    await loadGeminiModels()
  }
})
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center text-xl font-semibold">
          <SparklesIcon class="mr-2 h-5 w-5" /> Gemini Settings
        </CardTitle>
        <CardDescription>
          Configure Google's Gemini AI models
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <!-- API Key -->
        <div class="space-y-2 mb-6">
          <Label for="api-key-gemini">Gemini API Key</Label>
          <div class="flex space-x-2">
            <Input
              id="api-key-gemini"
              v-model="apiKey"
              type="password"
              placeholder="Enter Gemini API key"
              class="flex-1"
              @blur="handleApiKeyChange(apiKey)"
              @paste="handlePaste"
            />
            <Button 
              variant="destructive" 
              size="icon"
              @click="clearApiKey"
              v-if="apiKey"
            >
              <Trash2Icon class="h-4 w-4" />
            </Button>
          </div>
          <p class="text-xs text-gray-500">
            Available from Google AI Studio at https://makersuite.google.com/app/apikey
          </p>
        </div>
        
        <!-- Connection Status -->
        <Alert :variant="isAvailable ? 'default' : 'destructive'" class="mb-6">
          <div class="flex items-start">
            <div class="mr-2 mt-0.5">
              <Badge :variant="isAvailable ? 'default' : 'destructive'">
                {{ isAvailable ? 'Connected' : 'Not Connected' }}
              </Badge>
            </div>
            <div>
              <AlertDescription>
                <p v-if="isAvailable">
                  Successfully connected to Google Gemini API. You can now configure model settings.
                </p>
                <p v-else>
                  Not connected to Google Gemini API. Please enter a valid API key.
                </p>
              </AlertDescription>
            </div>
          </div>
        </Alert>
        
        <!-- Model Selection -->
        <div class="space-y-6" :class="{ 'opacity-50 pointer-events-none': !isAvailable }">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="gemini-model">Gemini Model</Label>
              <Button 
                variant="outline" 
                size="sm" 
                @click="loadGeminiModels" 
                :disabled="isLoadingGeminiModels || !apiKey"
                class="h-8 px-2 text-xs"
              >
                <RefreshCwIcon :class="{'animate-spin': isLoadingGeminiModels}" class="mr-2 h-3 w-3" />
                Refresh Models
              </Button>
            </div>
            <SearchableSelect
              v-model="selectedModelId"
              :options="geminiModels.map(model => ({
                value: model.id,
                label: model.name,
                description: model.description
              }))"
              placeholder="Select Gemini model"
              max-height="300px"
              search-placeholder="Search Gemini models..."
              :disabled="isLoadingGeminiModels"
            />
            <p class="text-xs text-gray-500">
              Select the specific Gemini model to use for AI text generation.
              <span v-if="geminiModels.length > 0">
                Token limit: {{ geminiModels.find(m => m.id === selectedModelId)?.maxTokens.toLocaleString() || 'Unknown' }} tokens.
              </span>
            </p>
          </div>
          
          <!-- Advanced Settings Toggle -->
          <div>
            <button 
              @click="showAdvancedSettings = !showAdvancedSettings"
              class="text-sm flex items-center text-primary"
            >
              <span v-if="!showAdvancedSettings">▶</span>
              <span v-else>▼</span>
              Advanced Gemini Settings
            </button>
            
            <div v-if="showAdvancedSettings" class="mt-3 space-y-4">
              <!-- Safety Thresholds -->
              <div class="space-y-2">
                <Label for="safety-threshold">Content Safety Filter</Label>
                <Select v-model="safetyThreshold">
                  <SelectTrigger id="safety-threshold">
                    <SelectValue placeholder="Select safety threshold" />
                  </SelectTrigger>
                  <SelectContent class="max-h-[200px] overflow-auto">
                    <SelectItem value="BLOCK_NONE">
                      <div>
                        <div>No filtering</div>
                        <div class="text-xs text-gray-500">Allow all content without safety filtering</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="BLOCK_LOW_AND_ABOVE">
                      <div>
                        <div>Low filtering</div>
                        <div class="text-xs text-gray-500">Block content with low or higher harm probability</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="BLOCK_MEDIUM_AND_ABOVE">
                      <div>
                        <div>Medium filtering (recommended)</div>
                        <div class="text-xs text-gray-500">Block content with medium or higher harm probability</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="BLOCK_HIGH_AND_ABOVE">
                      <div>
                        <div>High filtering</div>
                        <div class="text-xs text-gray-500">Only block content with high harm probability</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="BLOCK_ONLY_HIGH">
                      <div>
                        <div>Only block highest risk content</div>
                        <div class="text-xs text-gray-500">Minimal filtering for only the highest risk content</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p class="text-xs text-gray-500">
                  Controls how strictly the AI filters potentially harmful or inappropriate content.
                </p>
              </div>
            </div>
          </div>
          
          <!-- Save Button -->
          <Button @click="saveSettings" class="w-full" :disabled="!isAvailable">
            Save Gemini Settings
          </Button>
        </div>
      </CardContent>
      
      <CardFooter class="flex flex-col space-y-4">
        <Alert>
          <InfoIcon class="h-4 w-4" />
          <AlertTitle>About Gemini</AlertTitle>
          <AlertDescription>
            <p class="text-sm">
              Gemini is Google's most capable AI model for text generation, creative writing, and conversational AI.
              API access requires registration with Google AI Studio.
            </p>
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  </div>
</template> 