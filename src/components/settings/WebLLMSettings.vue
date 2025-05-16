<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted, defineComponent, h } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { 
  DownloadIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  InfoIcon,
  CpuIcon,
  GaugeIcon,
  RefreshCwIcon,
  HardDriveIcon
} from 'lucide-vue-next'
import type { WebLLMModelInfo } from '@/services/ai'
import { logger } from '@/services/logger'
import SearchableSelect from '@/components/ui/searchable-select.vue'
// Import the composable
import { useAIProviders } from '@/components/sidebars/ai-assistant/composables/useAIProviders'

// Create a simple Progress component since it might not exist
const Progress = defineComponent({
  name: 'Progress',
  props: {
    value: {
      type: Number,
      default: 0
    }
  },
  setup(props: { value: number }) {
    return () => h('div', { class: 'h-2 w-full bg-secondary rounded-full overflow-hidden' }, [
      h('div', {
        class: 'h-full bg-primary transition-all duration-300 ease-in-out',
        style: { width: `${props.value}%` }
      })
    ])
  }
})

// Use the composable
const {
  webLLMModels,
  isLoadingWebLLMModels,
  webLLMModelLoadingState,
  isWebLLMSupported,
  checkWebLLMSupport,
  fetchWebLLMModels,
  loadWebLLMModel
} = useAIProviders()

// State variables
const availableModels = ref<WebLLMModelInfo[]>([])
const downloadedModels = ref<string[]>([]) // Track which models are downloaded
const selectedModelId = ref<string>('')
const isLoading = ref(true)
const loadingProgress = ref(0)
const isModelLoading = ref(false)
const loadingError = ref<string | null>(null)
const currentModel = ref<string | null>(null)
const isCheckingCache = ref(false)

// Computed properties
const selectedModel = computed(() => {
  return availableModels.value.find(model => model.id === selectedModelId.value)
})

const modelStatus = computed(() => {
  if (currentModel.value) {
    return `Model loaded: ${currentModel.value}`
  }
  return 'No model loaded'
})

const smallModels = computed(() => {
  return availableModels.value.filter(model => 
    model.size.includes('0.5B') || 
    model.size.includes('1B') || 
    model.size.includes('1.5B') || 
    model.size.includes('2B')
  )
})

const mediumModels = computed(() => {
  return availableModels.value.filter(model => 
    model.size.includes('3B') || 
    model.size.includes('7B') || 
    model.size.includes('8B')
  )
})

const largeModels = computed(() => {
  return availableModels.value.filter(model => 
    model.size.includes('13B') || 
    model.size.includes('70B')
  )
})

// Check if a model is already downloaded
const isModelDownloaded = (modelId: string) => {
  return downloadedModels.value.includes(modelId)
}

// Load available models
const loadAvailableModels = async () => {
  try {
    isLoading.value = true
    const models = await fetchWebLLMModels()
    availableModels.value = models
    
    // Set the first model as selected by default
    if (availableModels.value.length > 0 && !selectedModelId.value) {
      // Prefer smaller models for initial selection
      const smallModel = availableModels.value.find(m => 
        m.size.includes('0.5B') || m.size.includes('1B') || m.size.includes('1.5B')
      )
      selectedModelId.value = smallModel?.id || availableModels.value[0].id
    }
    
    // Check which models are already downloaded
    await checkDownloadedModels()
  } catch (error) {
    logger.error('Error loading WebLLM models:', error)
    toast({
      title: 'Error',
      description: 'Failed to load available WebLLM models',
      variant: 'destructive'
    })
  } finally {
    isLoading.value = false
  }
}

// Check which models are already in browser cache
const checkDownloadedModels = async () => {
  isCheckingCache.value = true
  
  try {
    // WebLLM doesn't have a direct API to check cached models
    // We can detect by looking at IndexedDB or trying to estimate from browser storage
    // For now, we'll use a mock approach that would need to be replaced with actual implementation
    
    // In a real implementation, this would be a check to WebLLM's cache
    // For example, something like webllm.checkModelCache() if it existed
    
    // For demonstration purposes, let's assume models are cached if:
    // 1. They were previously loaded according to localStorage history
    // 2. The current model is definitely downloaded
    
    const modelHistory = localStorage.getItem('webllm-models-history')
    const cachedModels = new Set<string>()
    
    if (modelHistory) {
      try {
        const history = JSON.parse(modelHistory)
        if (Array.isArray(history)) {
          history.forEach(modelId => cachedModels.add(modelId))
        }
      } catch (e) {
        logger.error('Error parsing model history:', e)
      }
    }
    
    // Current model is definitely downloaded
    if (currentModel.value) {
      cachedModels.add(currentModel.value)
    }
    
    downloadedModels.value = Array.from(cachedModels)
    
    // Save updated history
    localStorage.setItem('webllm-models-history', JSON.stringify(downloadedModels.value))
    
  } catch (error) {
    logger.error('Error checking downloaded models:', error)
  } finally {
    isCheckingCache.value = false
  }
}

const loadModel = async () => {
  if (!selectedModelId.value || isModelLoading.value) return
  
  try {
    isModelLoading.value = true
    loadingError.value = null
    
    // Start loading the model
    const success = await loadWebLLMModel(selectedModelId.value)
    
    if (success) {
      // Update the current model
      currentModel.value = selectedModelId.value
      
      // Add to downloaded models
      if (!downloadedModels.value.includes(selectedModelId.value)) {
        downloadedModels.value.push(selectedModelId.value)
        localStorage.setItem('webllm-models-history', JSON.stringify(downloadedModels.value))
      }
      
      toast({
        title: 'Model Loaded',
        description: `${selectedModel.value?.name || selectedModelId.value} has been loaded successfully`,
        variant: 'default'
      })
    } else {
      throw new Error('Failed to load model')
    }
  } catch (error) {
    logger.error('Error loading model:', error)
    loadingError.value = error instanceof Error ? error.message : 'Unknown error loading model'
    
    toast({
      title: 'Error',
      description: 'Failed to load model. See details in the WebLLM settings panel.',
      variant: 'destructive'
    })
  } finally {
    isModelLoading.value = false
  }
}

// Poll for loading progress
const startProgressPolling = () => {
  const pollInterval = setInterval(() => {
    if (isModelLoading.value) {
      const state = webLLMModelLoadingState.value
      loadingProgress.value = state.progress * 100
      
      if (state.error) {
        loadingError.value = state.error
      }
    } else {
      clearInterval(pollInterval)
    }
  }, 100)
  
  // Clean up interval when component is unmounted
  onUnmounted(() => {
    clearInterval(pollInterval)
  })
}

// Lifecycle hooks
onMounted(async () => {
  await checkWebLLMSupport()
  await loadAvailableModels()
  
  // Check if a model is already loaded
  const state = webLLMModelLoadingState.value
  currentModel.value = state.currentModel
  
  // If there's a current model, it's definitely downloaded
  if (currentModel.value && !downloadedModels.value.includes(currentModel.value)) {
    downloadedModels.value.push(currentModel.value)
    localStorage.setItem('webllm-models-history', JSON.stringify(downloadedModels.value))
  }
  
  // Start polling for progress updates
  startProgressPolling()
})

// Watch for changes in the loading state
watch(() => webLLMModelLoadingState.value.isLoading, (newIsLoading) => {
  isModelLoading.value = newIsLoading
})
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center text-xl font-semibold">
          <CpuIcon class="mr-2 h-5 w-5" /> WebLLM Models
        </CardTitle>
        <CardDescription>
          Run AI models directly in your browser with WebLLM
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <!-- WebGPU Support Check -->
        <Alert :variant="isWebLLMSupported ? 'default' : 'destructive'" class="mb-6">
          <div class="flex items-start">
            <div v-if="isWebLLMSupported" class="mr-2 mt-0.5">
              <CheckCircleIcon class="h-5 w-5 text-green-500" />
            </div>
            <div v-else class="mr-2 mt-0.5">
              <AlertTriangleIcon class="h-5 w-5 text-red-500" />
            </div>
            <div>
              <AlertTitle>{{ isWebLLMSupported ? 'WebGPU Supported' : 'WebGPU Not Supported' }}</AlertTitle>
              <AlertDescription>
                <p v-if="isWebLLMSupported">
                  Your browser supports WebGPU, which enables hardware acceleration for local AI models.
                </p>
                <p v-else>
                  Your browser does not support WebGPU. WebLLM will run in CPU mode, which is significantly slower.
                  Consider using a browser with WebGPU support like Chrome 113+ or Edge 113+.
                </p>
              </AlertDescription>
            </div>
          </div>
        </Alert>
        
        <!-- Current Model Status -->
        <div class="mb-6 p-4 bg-muted rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <GaugeIcon class="h-5 w-5 mr-2 text-primary" />
              <h3 class="font-medium">Current Status</h3>
            </div>
            <Badge :variant="currentModel ? 'default' : 'outline'">
              {{ currentModel ? 'Model Loaded' : 'No Model' }}
            </Badge>
          </div>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ modelStatus }}
          </p>
        </div>
        
        <!-- Downloaded Models Summary -->
        <div class="mb-6 p-4 bg-muted rounded-lg" v-if="downloadedModels.length > 0">
          <div class="flex items-center">
            <HardDriveIcon class="h-5 w-5 mr-2 text-primary" />
            <h3 class="font-medium">Downloaded Models</h3>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <Badge 
              v-for="modelId in downloadedModels" 
              :key="modelId" 
              :variant="currentModel === modelId ? 'default' : 'outline'"
              class="flex items-center gap-1"
            >
              <CheckCircleIcon class="h-3 w-3" />
              {{ availableModels.find(m => m.id === modelId)?.name || modelId }}
            </Badge>
          </div>
          <p class="mt-2 text-xs text-muted-foreground">
            These models are already downloaded and cached in your browser.
          </p>
        </div>
        
        <!-- Model Selection -->
        <div class="space-y-6">
          <div class="space-y-2">
            <Label for="model-select">Select a Model</Label>
            <SearchableSelect
              v-model="selectedModelId"
              :options="[
                ...smallModels.map(model => ({
                  value: model.id,
                  label: isModelDownloaded(model.id) ? `${model.name} (Downloaded)` : model.name,
                  description: `Small Model (${model.size}) - Faster inference`
                })),
                ...mediumModels.map(model => ({
                  value: model.id,
                  label: isModelDownloaded(model.id) ? `${model.name} (Downloaded)` : model.name,
                  description: `Medium Model (${model.size}) - Balanced performance`
                })),
                ...largeModels.map(model => ({
                  value: model.id,
                  label: isModelDownloaded(model.id) ? `${model.name} (Downloaded)` : model.name,
                  description: `Large Model (${model.size}) - Better quality`
                }))
              ]"
              placeholder="Select a model"
              max-height="400px"
              search-placeholder="Search models..."
              :disabled="isModelLoading"
            />
          </div>
          
          <!-- Model Details -->
          <div v-if="selectedModel" class="p-4 bg-muted/50 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-medium">{{ selectedModel.name }}</h3>
              <div class="flex items-center gap-2">
                <Badge>{{ selectedModel.size }}</Badge>
                <Badge v-if="isModelDownloaded(selectedModel.id)" variant="default" class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Downloaded
                </Badge>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-muted-foreground">Download Size:</span>
                <span class="ml-1 font-medium">{{ selectedModel.downloadSize }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Status:</span>
                <span 
                  class="ml-1 font-medium"
                  :class="{ 'text-green-500': currentModel === selectedModelId }"
                >
                  {{ currentModel === selectedModelId ? 'Loaded' : isModelDownloaded(selectedModelId) ? 'Downloaded' : 'Not Downloaded' }}
                </span>
              </div>
            </div>
            
            <div class="flex justify-end space-x-2 mt-2">
              <Button 
                variant="default" 
                @click="loadModel" 
                :disabled="isModelLoading || currentModel === selectedModelId"
                class="flex items-center"
              >
                <template v-if="!isModelLoading">
                  <DownloadIcon v-if="!isModelDownloaded(selectedModelId)" class="mr-2 h-4 w-4" />
                  <CheckCircleIcon v-else class="mr-2 h-4 w-4" />
                  {{ 
                    currentModel === selectedModelId ? 'Already Loaded' : 
                    isModelDownloaded(selectedModelId) ? 'Load Model' : 'Download & Load'
                  }}
                </template>
                <RefreshCwIcon v-else class="mr-2 h-4 w-4 animate-spin" />
                <span v-if="isModelLoading">Loading...</span>
              </Button>
            </div>
          </div>
          
          <!-- Loading Progress -->
          <div v-if="isModelLoading" class="space-y-2">
            <div class="flex items-center justify-between">
              <Label>Loading Progress</Label>
              <span class="text-sm">{{ Math.round(loadingProgress) }}%</span>
            </div>
            <Progress :value="loadingProgress" class="w-full" />
            <p class="text-xs text-muted-foreground">
              {{ isModelDownloaded(selectedModelId) ? 
                  'Loading model from browser cache...' : 
                  'First-time downloads may take several minutes depending on your internet connection.' 
              }}
              <span v-if="!isModelDownloaded(selectedModelId)">
                The model will be cached for future use.
              </span>
            </p>
          </div>
          
          <!-- Error Message -->
          <Alert variant="destructive" v-if="loadingError">
            <XCircleIcon class="h-4 w-4" />
            <AlertTitle>Error Loading Model</AlertTitle>
            <AlertDescription>
              {{ loadingError }}
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      
      <CardFooter class="flex flex-col space-y-4">
        <Alert>
          <InfoIcon class="h-4 w-4" />
          <AlertTitle>About WebLLM</AlertTitle>
          <AlertDescription>
            <p class="text-sm">
              WebLLM runs AI models directly in your browser without sending data to external servers.
              This provides privacy and works offline once models are downloaded.
            </p>
          </AlertDescription>
        </Alert>
        
        <div class="text-xs text-muted-foreground">
          <p>
            Models are downloaded once and cached in your browser.
            Larger models provide better quality but require more memory and processing power.
          </p>
        </div>
      </CardFooter>
    </Card>
  </div>
</template>

<style scoped>
.model-card {
  transition: all 0.2s ease;
  cursor: pointer;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.model-card.selected {
  border-color: var(--primary);
  background-color: rgba(var(--primary), 0.1);
}
</style> 