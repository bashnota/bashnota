<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted, defineComponent, h } from 'vue'
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
  DownloadIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  InfoIcon,
  CpuIcon,
  GaugeIcon,
  TrashIcon,
  RefreshCwIcon
} from 'lucide-vue-next'
import { aiService } from '@/services/aiService'
import type { WebLLMModelInfo } from '@/services/aiService'
import { logger } from '@/services/logger'

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

// State variables
const availableModels = ref<WebLLMModelInfo[]>([])
const selectedModelId = ref<string>('')
const isLoading = ref(true)
const isWebGPUSupported = ref(false)
const loadingProgress = ref(0)
const isModelLoading = ref(false)
const loadingError = ref<string | null>(null)
const currentModel = ref<string | null>(null)

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

// Methods
const checkWebGPUSupport = async () => {
  isWebGPUSupported.value = await aiService.isWebGPUSupported()
}

const loadAvailableModels = async () => {
  try {
    isLoading.value = true
    availableModels.value = await aiService.getAvailableWebLLMModels()
    
    // Set the first model as selected by default
    if (availableModels.value.length > 0 && !selectedModelId.value) {
      // Prefer smaller models for initial selection
      const smallModel = availableModels.value.find(m => 
        m.size.includes('0.5B') || m.size.includes('1B') || m.size.includes('1.5B')
      )
      selectedModelId.value = smallModel?.id || availableModels.value[0].id
    }
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

const loadModel = async () => {
  if (!selectedModelId.value || isModelLoading.value) return
  
  try {
    isModelLoading.value = true
    loadingError.value = null
    
    // Start loading the model
    await aiService.setWebLLMModel(selectedModelId.value)
    
    // Update the current model
    currentModel.value = selectedModelId.value
    
    toast({
      title: 'Model Loaded',
      description: `${selectedModel.value?.name || selectedModelId.value} has been loaded successfully`,
      variant: 'default'
    })
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
      const state = aiService.getModelLoadingState()
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
  await checkWebGPUSupport()
  await loadAvailableModels()
  
  // Check if a model is already loaded
  const state = aiService.getModelLoadingState()
  currentModel.value = state.currentModel
  
  // Start polling for progress updates
  startProgressPolling()
})

// Watch for changes in the loading state
watch(() => aiService.getModelLoadingState().isLoading, (newIsLoading) => {
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
        <Alert :variant="isWebGPUSupported ? 'default' : 'destructive'" class="mb-6">
          <div class="flex items-start">
            <div v-if="isWebGPUSupported" class="mr-2 mt-0.5">
              <CheckCircleIcon class="h-5 w-5 text-green-500" />
            </div>
            <div v-else class="mr-2 mt-0.5">
              <AlertTriangleIcon class="h-5 w-5 text-red-500" />
            </div>
            <div>
              <AlertTitle>{{ isWebGPUSupported ? 'WebGPU Supported' : 'WebGPU Not Supported' }}</AlertTitle>
              <AlertDescription>
                <p v-if="isWebGPUSupported">
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
        
        <!-- Model Selection -->
        <div class="space-y-6">
          <div class="space-y-2">
            <Label for="model-select">Select a Model</Label>
            <Select v-model="selectedModelId" :disabled="isModelLoading">
              <SelectTrigger id="model-select">
                <SelectValue :placeholder="selectedModel?.name || 'Select a model'" />
              </SelectTrigger>
              <SelectContent>
                <div class="p-2">
                  <h4 class="text-xs font-semibold text-muted-foreground mb-1">Small Models (Faster)</h4>
                  <SelectItem 
                    v-for="model in smallModels" 
                    :key="model.id" 
                    :value="model.id"
                    class="mb-1"
                  >
                    <div class="flex items-center justify-between w-full">
                      <span>{{ model.name }}</span>
                      <Badge variant="outline" class="ml-2">{{ model.size }}</Badge>
                    </div>
                  </SelectItem>
                </div>
                
                <Separator class="my-2" />
                
                <div class="p-2">
                  <h4 class="text-xs font-semibold text-muted-foreground mb-1">Medium Models (Balanced)</h4>
                  <SelectItem 
                    v-for="model in mediumModels" 
                    :key="model.id" 
                    :value="model.id"
                    class="mb-1"
                  >
                    <div class="flex items-center justify-between w-full">
                      <span>{{ model.name }}</span>
                      <Badge variant="outline" class="ml-2">{{ model.size }}</Badge>
                    </div>
                  </SelectItem>
                </div>
                
                <Separator class="my-2" v-if="largeModels.length > 0" />
                
                <div class="p-2" v-if="largeModels.length > 0">
                  <h4 class="text-xs font-semibold text-muted-foreground mb-1">Large Models (Better Quality)</h4>
                  <SelectItem 
                    v-for="model in largeModels" 
                    :key="model.id" 
                    :value="model.id"
                    class="mb-1"
                  >
                    <div class="flex items-center justify-between w-full">
                      <span>{{ model.name }}</span>
                      <Badge variant="outline" class="ml-2">{{ model.size }}</Badge>
                    </div>
                  </SelectItem>
                </div>
              </SelectContent>
            </Select>
          </div>
          
          <!-- Model Details -->
          <div v-if="selectedModel" class="p-4 bg-muted/50 rounded-lg space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-medium">{{ selectedModel.name }}</h3>
              <Badge>{{ selectedModel.size }}</Badge>
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
                  {{ currentModel === selectedModelId ? 'Loaded' : 'Not Loaded' }}
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
                <DownloadIcon v-if="!isModelLoading" class="mr-2 h-4 w-4" />
                <RefreshCwIcon v-if="isModelLoading" class="mr-2 h-4 w-4 animate-spin" />
                {{ isModelLoading ? 'Loading...' : currentModel === selectedModelId ? 'Already Loaded' : 'Load Model' }}
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
              First-time downloads may take several minutes depending on your internet connection.
              The model will be cached for future use.
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