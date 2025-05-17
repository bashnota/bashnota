<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { 
  SparklesIcon,
  RefreshCwIcon,
  ServerIcon,
  InfoIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-vue-next'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { logger } from '@/services/logger'
import SearchableSelect from '@/components/ui/searchable-select.vue'
// Import the composable
import { useAIProviders } from '@/components/sidebars/ai-assistant/composables/useAIProviders'

// Use the composable
const aiSettings = useAISettingsStore()

// State variables
const serverUrl = ref('http://localhost:11434')
const isConnected = ref(false)
const isCheckingConnection = ref(false)
const availableModels = ref([
  { id: 'llama2', name: 'Llama 2', description: 'Meta\'s Llama 2 model' },
  { id: 'mistral', name: 'Mistral', description: 'Mistral AI\'s model' },
  { id: 'codellama', name: 'Code Llama', description: 'Specialized for code generation' },
  { id: 'phi2', name: 'Phi-2', description: 'Microsoft\'s small but capable model' },
])
const selectedModelId = ref('llama2')
const isLoading = ref(false)

// Function to check Ollama connection
const checkConnection = async () => {
  isCheckingConnection.value = true
  
  try {
    // In a real implementation, this would make an API call to check the connection
    // For now we'll simulate it with a timeout
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simulate a successful connection
    isConnected.value = true
    
    toast({
      title: 'Connected',
      description: 'Successfully connected to Ollama server.',
    })
    
    // Load available models
    await loadOllamaModels()
  } catch (error) {
    logger.error('Error connecting to Ollama:', error)
    isConnected.value = false
    
    toast({
      title: 'Connection Failed',
      description: 'Could not connect to Ollama server. Please check the server URL and ensure Ollama is running.',
      variant: 'destructive'
    })
  } finally {
    isCheckingConnection.value = false
  }
}

// Function to load available Ollama models
const loadOllamaModels = async () => {
  if (!isConnected.value) return
  
  isLoading.value = true
  
  try {
    // In a real implementation, this would fetch models from the Ollama API
    // For now we'll simulate it with a timeout
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In a real implementation, we would update availableModels based on the API response
    
    toast({
      title: 'Models Loaded',
      description: `Found ${availableModels.value.length} Ollama models.`,
    })
  } catch (error) {
    logger.error('Error loading Ollama models:', error)
    
    toast({
      title: 'Error',
      description: 'Failed to load Ollama models.',
      variant: 'destructive'
    })
  } finally {
    isLoading.value = false
  }
}

// Computed to disable UI elements if not connected
const isDisabled = computed(() => !isConnected.value || isLoading.value)

// Save settings
const saveSettings = () => {
  // Create a settings object with proper typing
  const ollamaSettings: Record<string, any> = {
    ollamaServerUrl: serverUrl.value,
    ollamaModel: selectedModelId.value
  };
  
  // Save to settings store
  aiSettings.updateSettings(ollamaSettings);
  
  toast({
    title: 'Settings Saved',
    description: 'Your Ollama settings have been updated.',
  })
}

// Lifecycle hooks
onMounted(async () => {
  // Load saved settings
  if (aiSettings.settings.ollamaServerUrl) {
    serverUrl.value = aiSettings.settings.ollamaServerUrl
  }
  
  if (aiSettings.settings.ollamaModel) {
    selectedModelId.value = aiSettings.settings.ollamaModel
  }
  
  // Check connection automatically on mount
  await checkConnection()
})
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center text-xl font-semibold">
          <ServerIcon class="mr-2 h-5 w-5" /> Ollama Settings
        </CardTitle>
        <CardDescription>
          Configure local AI models using Ollama
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <!-- Server Configuration -->
        <div class="space-y-2 mb-6">
          <Label for="server-url">Ollama Server URL</Label>
          <div class="flex space-x-2">
            <Input
              id="server-url"
              v-model="serverUrl"
              type="text"
              placeholder="http://localhost:11434"
              class="flex-1"
            />
            <Button 
              variant="outline" 
              @click="checkConnection"
              :disabled="isCheckingConnection"
              class="whitespace-nowrap"
            >
              <RefreshCwIcon :class="{'animate-spin': isCheckingConnection}" class="mr-2 h-4 w-4" />
              {{ isCheckingConnection ? 'Connecting...' : 'Test Connection' }}
            </Button>
          </div>
          <p class="text-xs text-gray-500">
            Enter the URL of your Ollama server. Default is http://localhost:11434
          </p>
        </div>
        
        <!-- Connection Status -->
        <Alert :variant="isConnected ? 'default' : 'destructive'" class="mb-6">
          <div class="flex items-start">
            <div v-if="isConnected" class="mr-2 mt-0.5">
              <CheckCircleIcon class="h-5 w-5 text-green-500" />
            </div>
            <div v-else class="mr-2 mt-0.5">
              <XCircleIcon class="h-5 w-5 text-red-500" />
            </div>
            <div>
              <AlertTitle>{{ isConnected ? 'Connected to Ollama' : 'Not Connected' }}</AlertTitle>
              <AlertDescription>
                <p v-if="isConnected">
                  Successfully connected to Ollama server. You can now configure model settings.
                </p>
                <p v-else>
                  Not connected to Ollama server. Please check the server URL and ensure Ollama is running.
                </p>
              </AlertDescription>
            </div>
          </div>
        </Alert>
        
        <!-- Model Configuration -->
        <div class="space-y-6" :class="{ 'opacity-50 pointer-events-none': isDisabled }">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="ollama-model">Ollama Model</Label>
              <Button 
                variant="outline" 
                size="sm" 
                @click="loadOllamaModels" 
                :disabled="isLoading || !isConnected"
                class="h-8 px-2 text-xs"
              >
                <RefreshCwIcon :class="{'animate-spin': isLoading}" class="mr-2 h-3 w-3" />
                Refresh Models
              </Button>
            </div>
            <SearchableSelect
              v-model="selectedModelId"
              :options="availableModels.map(model => ({
                value: model.id,
                label: model.name,
                description: model.description
              }))"
              placeholder="Select Ollama model"
              max-height="300px"
              search-placeholder="Search Ollama models..."
              :disabled="isLoading"
            />
            <p class="text-xs text-gray-500">
              Select an Ollama model to use for AI text generation.
            </p>
          </div>
          
          <!-- Model Parameters -->
          <div class="space-y-2">
            <Label>Model Parameters</Label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <Label class="text-xs">Temperature</Label>
                <Input type="number" min="0" max="2" step="0.1" value="0.7" />
              </div>
              <div>
                <Label class="text-xs">Top P</Label>
                <Input type="number" min="0" max="1" step="0.05" value="0.9" />
              </div>
            </div>
            <p class="text-xs text-gray-500">
              Additional parameters to control model generation behavior
            </p>
          </div>
          
          <!-- Save Button -->
          <Button @click="saveSettings" class="w-full" :disabled="!isConnected">
            Save Ollama Settings
          </Button>
        </div>
      </CardContent>
      
      <CardFooter class="flex flex-col space-y-4">
        <Alert>
          <InfoIcon class="h-4 w-4" />
          <AlertTitle>About Ollama</AlertTitle>
          <AlertDescription>
            <p class="text-sm">
              Ollama lets you run large language models locally on your computer. 
              Make sure you have Ollama installed and running before using this feature.
            </p>
          </AlertDescription>
        </Alert>
        
        <div class="text-xs text-muted-foreground">
          <p>
            Download Ollama from <a href="https://ollama.ai" target="_blank" class="text-primary hover:underline">ollama.ai</a>
          </p>
        </div>
      </CardFooter>
    </Card>
  </div>
</template> 