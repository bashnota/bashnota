<template>
  <BaseProviderSettings
    title="WebLLM"
    description="Run AI models directly in your browser"
    :icon="GlobeIcon"
    provider-id="webllm"
    test-button-text="Initialize WebLLM"
    @save="handleSave"
    @test="handleTest"
    @refresh="handleRefresh"
  >
    <template #content>
      <div class="space-y-6">
        <!-- Browser Compatibility -->
        <div class="space-y-3">
          <Label class="text-sm font-medium">Browser Compatibility</Label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex items-center space-x-2 p-3 border rounded-md">
              <component :is="webGLSupported ? CheckCircleIcon : XCircleIcon" 
                         :class="webGLSupported ? 'text-green-500' : 'text-red-500'" 
                         class="h-4 w-4" />
              <span class="text-sm">WebGL Support</span>
            </div>
            <div class="flex items-center space-x-2 p-3 border rounded-md">
              <component :is="wasmSupported ? CheckCircleIcon : XCircleIcon" 
                         :class="wasmSupported ? 'text-green-500' : 'text-red-500'" 
                         class="h-4 w-4" />
              <span class="text-sm">WebAssembly Support</span>
            </div>
            <div class="flex items-center space-x-2 p-3 border rounded-md">
              <component :is="isWebLLMSupported ? CheckCircleIcon : AlertTriangleIcon" 
                         :class="isWebLLMSupported ? 'text-green-500' : 'text-yellow-500'" 
                         class="h-4 w-4" />
              <span class="text-sm">WebGPU Support</span>
            </div>
            <div class="flex items-center space-x-2 p-3 border rounded-md">
              <component :is="memoryEstimate ? CheckCircleIcon : AlertTriangleIcon" 
                         :class="memoryEstimate && memoryEstimate >= 4 ? 'text-green-500' : 'text-yellow-500'" 
                         class="h-4 w-4" />
              <span class="text-sm">RAM: {{ memoryEstimate ? `${memoryEstimate}GB` : 'Unknown' }}</span>
            </div>
          </div>
          
          <div v-if="!isCompatible" class="p-3 bg-red-50 border border-red-200 rounded-md">
            <div class="flex items-start">
              <AlertTriangleIcon class="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div class="text-sm text-red-700">
                <p class="font-medium">Browser Not Compatible</p>
                <p class="mt-1">{{ compatibilityMessage }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Current Model Status -->
        <div class="p-4 bg-muted/50 rounded-lg">
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

        <!-- Connection Status -->
        <ConnectionStatus
          :state="connectionState"
          provider-name="WebLLM"
          :error="connectionError || undefined"
          :last-tested="lastTested || undefined"
          @retry="handleTest"
        />

        <!-- Downloaded Models Summary -->
        <div v-if="downloadedModels.length > 0" class="p-4 bg-muted/50 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <HardDriveIcon class="h-5 w-5 mr-2 text-primary" />
              <h3 class="font-medium">Downloaded Models</h3>
            </div>
            <Badge variant="outline">{{ cacheSize }} used</Badge>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <Badge 
              v-for="modelId in downloadedModels" 
              :key="modelId" 
              :variant="currentModel === modelId ? 'default' : 'outline'"
              class="flex items-center gap-1"
            >
              <CheckCircleIcon class="h-3 w-3" />
              {{ getModelName(modelId) }}
            </Badge>
          </div>
          <p class="mt-2 text-xs text-muted-foreground">
            These models are already downloaded and cached in your browser.
          </p>
        </div>

        <!-- Model Selection -->
        <div :class="{ 'opacity-50 pointer-events-none': !isCompatible }">
          <div class="space-y-2">
            <Label for="model-select">Select a Model</Label>
            <SearchableSelect
              v-model="selectedModelId"
              :options="modelOptions"
              placeholder="Select a model"
              max-height="400px"
              search-placeholder="Search models..."
              :disabled="isModelLoading"
            />
          </div>

          <!-- Model Information -->
          <div v-if="selectedModel" class="mt-4 p-3 bg-purple-50 rounded-md">
            <div class="flex items-start justify-between">
              <div>
                <h4 class="font-medium text-purple-900">{{ selectedModel.name }}</h4>
                <p class="text-sm text-purple-700 mt-1">{{ selectedModel.description || 'AI model for text generation' }}</p>
              </div>
              <div class="text-right text-xs text-purple-600 space-y-1">
                <div>
                  <Badge variant="outline" class="border-purple-300 text-purple-700">{{ selectedModel.size }}</Badge>
                </div>
                <div class="text-xs">{{ selectedModel.downloadSize }}</div>
              </div>
            </div>
            
            <!-- Download/Load Status -->
            <div class="mt-3 flex items-center justify-between">
              <div class="text-sm">
                <span v-if="isModelDownloaded" class="text-green-600">✓ Downloaded</span>
                <span v-else class="text-gray-600">Not downloaded</span>
                <span v-if="currentModel === selectedModelId" class="text-blue-600 ml-2">• Currently loaded</span>
              </div>
              <Button
                variant="default"
                size="sm"
                @click="loadModel"
                :disabled="isModelLoading || currentModel === selectedModelId"
                class="text-xs"
              >
                <template v-if="!isModelLoading">
                  <DownloadIcon v-if="!isModelDownloaded" class="mr-2 h-4 w-4" />
                  <CheckCircleIcon v-else class="mr-2 h-4 w-4" />
                  {{ getLoadButtonText() }}
                </template>
                <RefreshCwIcon v-else class="mr-2 h-4 w-4 animate-spin" />
                <span v-if="isModelLoading">Loading...</span>
              </Button>
            </div>
          </div>

          <!-- Loading Progress -->
          <div v-if="isModelLoading" class="mt-4 space-y-2">
            <div class="flex items-center justify-between">
              <Label>Loading Progress</Label>
              <span class="text-sm">{{ Math.round(loadingProgress) }}%</span>
            </div>
            <div class="w-full bg-blue-200 rounded-full h-2">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                :style="{ width: `${loadingProgress}%` }"
              ></div>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ loadingStatusText }}
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="loadingError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div class="flex items-start">
              <XCircleIcon class="h-4 w-4 text-red-600 mt-0.5 mr-2" />
              <div>
                <p class="text-sm font-medium text-red-800">Error Loading Model</p>
                <p class="text-sm text-red-700 mt-1">{{ loadingError }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Advanced Settings -->
        <div v-if="isCompatible && isConnected" class="space-y-4">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">Advanced Settings</Label>
            <Button
              variant="ghost"
              size="sm"
              @click="showAdvanced = !showAdvanced"
            >
              {{ showAdvanced ? 'Hide' : 'Show' }} Advanced
            </Button>
          </div>

          <div v-if="showAdvanced" class="space-y-4 p-4 border rounded-md">
            <!-- Model Parameters -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <Label class="text-xs">Temperature ({{ temperature[0].toFixed(1) }})</Label>
                <Slider
                  v-model="temperature"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  class="mt-2"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Controls randomness in responses
                </p>
              </div>
              <div>
                <Label class="text-xs">Top P ({{ topP[0].toFixed(2) }})</Label>
                <Slider
                  v-model="topP"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  class="mt-2"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Nucleus sampling parameter
                </p>
              </div>
            </div>

            <!-- Performance Settings -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <Label class="text-sm">Enable WebGPU Acceleration</Label>
                  <p class="text-xs text-gray-500">Use GPU for faster inference (if supported)</p>
                </div>
                <Switch v-model="useWebGPU" :disabled="!isWebLLMSupported" />
              </div>
              
              <div class="space-y-2">
                <Label class="text-xs">Max Tokens ({{ maxTokens[0] }})</Label>
                <Slider
                  v-model="maxTokens"
                  :min="100"
                  :max="2048"
                  :step="50"
                  class="mt-2"
                />
                <p class="text-xs text-gray-500">
                  Maximum response length
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Cache Management -->
        <div v-if="isCompatible && downloadedModels.length > 0" class="space-y-4">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">Cache Management</Label>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="refreshCacheInfo"
                :disabled="isCheckingCache"
              >
                <RefreshCwIcon :class="{ 'animate-spin': isCheckingCache }" class="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                @click="clearAllCache"
                class="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>

        <!-- Browser Requirements Help -->
        <div v-if="!isCompatible" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div class="flex items-start">
            <AlertTriangleIcon class="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 class="text-sm font-medium text-red-800">Browser Requirements</h4>
              <div class="text-sm text-red-700 mt-1 space-y-2">
                <p>WebLLM requires a modern browser with specific features:</p>
                <ul class="list-disc list-inside space-y-1 ml-2">
                  <li>Chrome 113+ or Edge 113+ (recommended)</li>
                  <li>WebGL 2.0 support</li>
                  <li>WebAssembly support</li>
                  <li>At least 4GB of available RAM</li>
                  <li>WebGPU support (optional, for better performance)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- WebLLM Information -->
        <div class="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div class="flex items-start">
            <InfoIcon class="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 class="text-sm font-medium text-blue-800">About WebLLM</h4>
              <div class="text-sm text-blue-700 mt-1">
                <p>WebLLM runs AI models directly in your browser without sending data to external servers. This provides privacy and works offline once models are downloaded.</p>
                <p class="mt-2">Models are downloaded once and cached in your browser. Larger models provide better quality but require more memory and processing power.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseProviderSettings>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Globe as GlobeIcon, CheckCircle as CheckCircleIcon, XCircle as XCircleIcon, AlertTriangle as AlertTriangleIcon, Info as InfoIcon, Gauge as GaugeIcon, HardDrive as HardDriveIcon, Download as DownloadIcon, RefreshCw as RefreshCwIcon } from 'lucide-vue-next'
import { Label } from '@/ui/label'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Slider } from '@/ui/slider'
import { Switch } from '@/ui/switch'
import { toast } from '@/ui/toast'
import BaseProviderSettings from '@/features/settings/components/ai/BaseProviderSettings.vue'
import ConnectionStatus from '@/features/settings/components/ai/components/ConnectionStatus.vue'
import SearchableSelect from '@/ui/searchable-select.vue'
import { useProviderSettings, type ModelInfo } from '@/features/settings/components/ai/composables/useProviderSettings'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import type { ConnectionState } from '@/features/settings/components/ai/components/ConnectionStatus.vue'
import { logger } from '@/services/logger'
import type { WebLLMModelInfo } from '@/features/ai/services'

// Use the AI providers composable for WebLLM functionality
const {
  webLLMModels,
  isLoadingWebLLMModels,
  webLLMModelLoadingState,
  isWebLLMSupported,
  checkWebLLMSupport,
  fetchWebLLMModels,
  loadWebLLMModel
} = useAIProviders()

// Browser compatibility checks
const webGLSupported = ref(false)
const wasmSupported = ref(false)
const memoryEstimate = ref<number | null>(null)

// WebLLM-specific state
const downloadedModels = ref<string[]>([])
const cacheSize = ref('0 MB')
const showAdvanced = ref(false)
const lastTested = ref<Date | null>(null)
const isCheckingCache = ref(false)

// WebLLM settings
const temperature = ref([0.7])
const topP = ref([0.9])
const useWebGPU = ref(true)
const maxTokens = ref([512])

// Loading state from composable
const isModelLoading = computed(() => webLLMModelLoadingState.value.isLoading)
const loadingProgress = computed(() => (webLLMModelLoadingState.value.progress || 0) * 100)
const loadingError = computed(() => webLLMModelLoadingState.value.error)
const currentModel = computed(() => webLLMModelLoadingState.value.currentModel)

// Configure the provider settings
const providerSettings = useProviderSettings({
  providerId: 'webllm',
  requiresApiKey: false,
  supportsModelSelection: true,
  supportsCustomUrl: false,
  connectionTestFn: async (): Promise<boolean> => {
    try {
      if (!isCompatible.value) return false
      await checkWebLLMSupport()
      return isWebLLMSupported.value
    } catch {
      return false
    }
  },
  modelsFetchFn: async (): Promise<ModelInfo[]> => {
    try {
      const models = await fetchWebLLMModels()
      return models.map((model: WebLLMModelInfo) => ({
        id: model.id,
        name: model.name,
        description: model.description || `${model.size} model for text generation`,
        size: model.downloadSize,
        category: getModelCategory(model.size)
      }))
    } catch (error) {
      logger.error('Error fetching WebLLM models:', error)
      return []
    }
  }
})

// Destructure what we need from the composable
const {
  selectedModelId,
  models,
  isConnected,
  isLoading,
  connectionError,
  saveSettings,
  testConnection,
  loadModels
} = providerSettings

// Computed properties
const selectedModel = computed(() => {
  return webLLMModels.value.find((model: WebLLMModelInfo) => model.id === selectedModelId.value)
})

const isCompatible = computed(() => 
  webGLSupported.value && wasmSupported.value && isWebLLMSupported.value
)

const compatibilityMessage = computed(() => {
  if (!isWebLLMSupported.value) {
    return 'Your browser does not support WebGPU. WebLLM requires Chrome 113+ or Edge 113+ for optimal performance.'
  }
  if (!webGLSupported.value) {
    return 'WebGL 2.0 support is required for WebLLM to function properly.'
  }
  if (!wasmSupported.value) {
    return 'WebAssembly support is required for WebLLM to function properly.'
  }
  return 'Your browser meets the minimum requirements for WebLLM.'
})

const connectionState = computed((): ConnectionState => {
  if (isLoading.value || isLoadingWebLLMModels.value) return 'connecting'
  if (connectionError.value || loadingError.value) return 'error'
  if (isConnected.value && isWebLLMSupported.value) return 'connected'
  return 'disconnected'
})

const isModelDownloaded = computed(() => {
  if (!selectedModelId.value) return false
  return downloadedModels.value.includes(selectedModelId.value)
})

const modelStatus = computed(() => {
  if (currentModel.value) {
    return `Model loaded: ${getModelName(currentModel.value)}`
  }
  return 'No model loaded'
})

const loadingStatusText = computed(() => {
  if (isModelDownloaded.value) {
    return 'Loading model from browser cache...'
  }
  return 'First-time downloads may take several minutes depending on your internet connection. The model will be cached for future use.'
})

const modelOptions = computed(() => {
  const small = webLLMModels.value.filter((model: WebLLMModelInfo) => getModelCategory(model.size) === 'small')
  const medium = webLLMModels.value.filter((model: WebLLMModelInfo) => getModelCategory(model.size) === 'medium')
  const large = webLLMModels.value.filter((model: WebLLMModelInfo) => getModelCategory(model.size) === 'large')

  return [
    ...small.map((model: WebLLMModelInfo) => ({
      value: model.id,
      label: downloadedModels.value.includes(model.id) ? `${model.name} (Downloaded)` : model.name,
      description: `Small Model (${model.size}) - Faster inference`
    })),
    ...medium.map((model: WebLLMModelInfo) => ({
      value: model.id,
      label: downloadedModels.value.includes(model.id) ? `${model.name} (Downloaded)` : model.name,
      description: `Medium Model (${model.size}) - Balanced performance`
    })),
    ...large.map((model: WebLLMModelInfo) => ({
      value: model.id,
      label: downloadedModels.value.includes(model.id) ? `${model.name} (Downloaded)` : model.name,
      description: `Large Model (${model.size}) - Better quality`
    }))
  ]
})

// Methods
const getModelCategory = (size: string): 'small' | 'medium' | 'large' => {
  if (size.includes('0.5B') || size.includes('1B') || size.includes('1.5B') || size.includes('2B')) return 'small'
  if (size.includes('3B') || size.includes('7B') || size.includes('8B')) return 'medium'
  if (size.includes('13B') || size.includes('70B')) return 'large'
  return 'medium'
}

const getModelName = (modelId: string): string => {
  const model = webLLMModels.value.find((m: WebLLMModelInfo) => m.id === modelId)
  return model?.name || modelId
}

const getLoadButtonText = (): string => {
  if (currentModel.value === selectedModelId.value) return 'Already Loaded'
  if (isModelDownloaded.value) return 'Load Model'
  return 'Download & Load'
}

const checkBrowserCompatibility = async () => {
  // WebGL check
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    webGLSupported.value = !!gl
  } catch {
    webGLSupported.value = false
  }

  // WebAssembly check
  wasmSupported.value = typeof WebAssembly === 'object'

  // Memory estimate
  try {
    // @ts-ignore - experimental API
    const memInfo = (navigator as any).deviceMemory
    if (memInfo) {
      memoryEstimate.value = memInfo
    } else if ((navigator as any).hardwareConcurrency) {
      // Rough estimate based on CPU cores
      memoryEstimate.value = Math.max(4, (navigator as any).hardwareConcurrency)
    }
  } catch {
    memoryEstimate.value = null
  }
}

const checkDownloadedModels = async () => {
  isCheckingCache.value = true
  
  try {
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
    
    // Calculate cache size
    await refreshCacheInfo()
  } catch (error) {
    logger.error('Error checking downloaded models:', error)
  } finally {
    isCheckingCache.value = false
  }
}

const loadModel = async () => {
  if (!selectedModelId.value || isModelLoading.value) return
  
  try {
    const success = await loadWebLLMModel(selectedModelId.value)
    
    if (success) {
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
      
      await refreshCacheInfo()
    } else {
      throw new Error('Failed to load model')
    }
  } catch (error) {
    logger.error('Error loading model:', error)
    toast({
      title: 'Error',
      description: 'Failed to load model. See details in the WebLLM settings panel.',
      variant: 'destructive'
    })
  }
}

const refreshCacheInfo = async () => {
  // Calculate cache size based on downloaded models
  const totalSize = downloadedModels.value.reduce((total, modelId) => {
    const model = webLLMModels.value.find((m: WebLLMModelInfo) => m.id === modelId)
    if (model) {
      const sizeMatch = model.downloadSize.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/)
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1])
        const unit = sizeMatch[2]
        return total + (unit === 'GB' ? value * 1024 : value)
      }
    }
    return total
  }, 0)
  
  cacheSize.value = totalSize > 1024 
    ? `${(totalSize / 1024).toFixed(1)} GB` 
    : `${totalSize.toFixed(0)} MB`
}

const clearAllCache = async () => {
  if (confirm('Are you sure you want to clear all cached models? This will require re-downloading models when you use them again.')) {
    downloadedModels.value = []
    cacheSize.value = '0 MB'
    localStorage.removeItem('webllm-models-history')
    
    toast({
      title: 'Cache Cleared',
      description: 'All cached WebLLM models have been removed.',
      variant: 'default'
    })
  }
}

const handleSave = async () => {
  await saveSettings()
}

const handleTest = async (): Promise<boolean> => {
  const result = await testConnection()
  if (result) {
    lastTested.value = new Date()
  }
  return result
}

const handleRefresh = async () => {
  await loadModels()
  await checkDownloadedModels()
}

// Watch for changes in the current model
watch(currentModel, (newModel) => {
  if (newModel && !downloadedModels.value.includes(newModel)) {
    downloadedModels.value.push(newModel)
    localStorage.setItem('webllm-models-history', JSON.stringify(downloadedModels.value))
    refreshCacheInfo()
  }
})

// Initialize
onMounted(async () => {
  await checkBrowserCompatibility()
  await checkWebLLMSupport()
  await loadModels()
  await checkDownloadedModels()
  
  // Set default model selection to a small model
  if (webLLMModels.value.length > 0 && !selectedModelId.value) {
    const smallModel = webLLMModels.value.find((m: WebLLMModelInfo) => getModelCategory(m.size) === 'small')
    selectedModelId.value = smallModel?.id || webLLMModels.value[0].id
  }
})

const searchModels = (query: string, models: ModelInfo[]) => {
  if (!query) return models
  return models.filter(model => model.name.toLowerCase().includes(query.toLowerCase()))
}

const getModelLabel = (model: ModelInfo) => model.name
const getModelValue = (model: ModelInfo) => model.id

const isModelDisabled = (model: ModelInfo) => {
  // Example of disabling a model - can be customized
  return false
}
const getModelDescription = (model: ModelInfo) => model.description
const getModelKeywords = (model: ModelInfo) => [model.name, model.size]

// Add a computed property to get the currently selected model object
const selectedModelObject = computed(() => {
  return webLLMModels.value.find((m: WebLLMModelInfo) => m.id === selectedModelId.value)
})

// Add a computed property for available models, which are just webLLM models
const availableModels = computed(() => webLLMModels.value)
</script> 







