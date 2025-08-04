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
      <div class="space-y-4">
        <div class="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <div class="flex items-center justify-between">
            <!-- Status Summary -->
            <div class="flex items-center space-x-4">
              <div class="flex items-center space-x-2">
                <div :class="[
                  'w-3 h-3 rounded-full',
                  connectionState === 'connected' ? 'bg-green-500' : 
                  connectionState === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                ]"></div>
                <span class="text-sm font-medium">
                  {{ getStatusText() }}
                </span>
              </div>
              
              <!-- Current Model Badge -->
              <Badge v-if="currentModel" variant="default" class="bg-blue-100 text-blue-800">
                <Crown class="h-3 w-3 mr-1" />
                {{ getModelName(currentModel) }}
              </Badge>
              
              <!-- Default Model Badge -->
              <Badge v-if="defaultModelId && defaultModelId !== currentModel" variant="outline" class="border-blue-300">
                <Settings class="h-3 w-3 mr-1" />
                Default: {{ getModelName(defaultModelId) }}
              </Badge>
            </div>
            
            <!-- Quick Actions -->
            <div class="flex items-center space-x-2">
              <!-- Browser Compatibility Indicator -->
              <div class="flex items-center space-x-1">
                <CheckCircleIcon v-if="isCompatible" class="h-4 w-4 text-green-500" />
                <AlertTriangleIcon v-else class="h-4 w-4 text-red-500" />
                <span class="text-xs text-muted-foreground">
                  {{ isCompatible ? 'Compatible' : 'Incompatible' }}
                </span>
              </div>
              

              
              <Button
                @click="handleRefresh"
                :disabled="isLoadingWebLLMModels"
                variant="outline"
                size="sm"
              >
                <RefreshCwIcon :class="['h-4 w-4', isLoadingWebLLMModels && 'animate-spin']" />
              </Button>
            </div>
          </div>
          
          <!-- Loading Progress (when applicable) -->
          <div v-if="isModelLoading" class="mt-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium">Loading {{ selectedModelName }}...</span>
              <span>{{ Math.round(loadingProgress) }}%</span>
            </div>
            <div class="w-full bg-white/50 rounded-full h-1.5">
              <div 
                class="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                :style="{ width: `${loadingProgress}%` }"
              ></div>
            </div>
          </div>
          
          <!-- Compatibility Warning (compact) -->
          <div v-if="!isCompatible" class="mt-3 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
            <AlertTriangleIcon class="h-3 w-3 inline mr-1" />
            {{ compatibilityMessage }}
          </div>
        </div>

        <div class="border rounded-lg">
          <!-- Tab Headers -->
          <div class="flex border-b bg-muted/30">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
                activeTab === tab.id
                  ? 'text-primary bg-background border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              ]"
            >
              <component :is="tab.icon" class="h-4 w-4 mr-2 inline" />
              {{ tab.name }}
              <Badge v-if="tab.badge" variant="secondary" class="ml-2 text-xs">
                {{ tab.badge }}
              </Badge>
            </button>
          </div>
          
          <!-- Tab Content -->
          <div class="p-4">

            
            <!-- Models Tab -->
            <div v-if="activeTab === 'models'" class="space-y-4">
              <!-- Model Management Header -->
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-medium">Model Management</h3>
                  <p class="text-sm text-muted-foreground">
                    {{ webLLMModels.length }} available • {{ downloadedModels.length }} downloaded • {{ cacheSize }} used
                  </p>
                </div>
                
                <!-- Filter & Sort -->
                <div class="flex items-center space-x-2">
                  <select v-model="selectedCategory" class="text-sm border rounded px-2 py-1">
                    <option value="all">All Models</option>
                    <option value="downloaded">Downloaded Only</option>
                    <option value="small">Small Models</option>
                    <option value="medium">Medium Models</option>
                    <option value="large">Large Models</option>
                  </select>
                </div>
              </div>
              
              <!-- Unified Model Grid -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div
                  v-for="model in filteredAndSortedModels"
                  :key="model.id"
                  :class="[
                    'p-3 border rounded-lg transition-all hover:shadow-sm cursor-pointer',
                    currentModel === model.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' :
                    isDefaultModel(model.id) ? 'border-purple-300 bg-purple-50 dark:bg-purple-950' :
                    downloadedModels.includes(model.id) ? 'border-green-300 bg-green-50 dark:bg-green-950' :
                    'border-border hover:border-primary/50'
                  ]"
                  @click="selectModel(model.id)"
                >
                  <!-- Model Header -->
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1 min-w-0">
                      <h4 class="font-medium text-sm truncate">{{ model.name || model.id }}</h4>
                      <p class="text-xs text-muted-foreground">{{ model.downloadSize }}</p>
                    </div>
                    
                    <!-- Status Badges -->
                    <div class="flex flex-col items-end gap-1 ml-2">
                      <div class="flex flex-wrap gap-1 justify-end">
                        <Badge v-if="currentModel === model.id" variant="default" class="text-xs bg-blue-100 text-blue-800">
                          <Play class="h-2 w-2 mr-1" />
                          Active
                        </Badge>
                        <Badge v-if="isDefaultModel(model.id)" variant="default" class="text-xs bg-purple-100 text-purple-800">
                          <Crown class="h-2 w-2 mr-1" />
                          Default
                        </Badge>
                        <Badge v-if="downloadedModels.includes(model.id)" variant="outline" class="text-xs border-green-300 text-green-700">
                          <HardDriveIcon class="h-2 w-2 mr-1" />
                          Cached
                        </Badge>
                      </div>
                      <Badge :variant="getSizeBadgeVariant(getModelCategory(model.downloadSize))" class="text-xs">
                        {{ getModelCategory(model.downloadSize).toUpperCase() }}
                      </Badge>
                    </div>
                  </div>
                  
                  <!-- Quick Actions -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <Button
                        v-if="!isDefaultModel(model.id)"
                        @click.stop="handleModelSelected(model.id)"
                        variant="outline"
                        size="sm"
                        class="text-xs h-6 px-2"
                      >
                        <Crown class="h-3 w-3 mr-1" />
                        Set Default
                      </Button>
                      
                      <Button
                        @click.stop="loadModel(model.id)"
                        :disabled="isModelLoading || currentModel === model.id"
                        variant="default"
                        size="sm"
                        class="text-xs h-6 px-2"
                      >
                        <template v-if="!isModelLoading || selectedModelId !== model.id">
                          <DownloadIcon v-if="!downloadedModels.includes(model.id)" class="h-3 w-3 mr-1" />
                          <Play v-else-if="currentModel !== model.id" class="h-3 w-3 mr-1" />
                          <CheckCircleIcon v-else class="h-3 w-3 mr-1" />
                          {{
                            currentModel === model.id ? 'Active' :
                            downloadedModels.includes(model.id) ? 'Load' : 'Download'
                          }}
                        </template>
                        <div v-else class="flex items-center">
                          <RefreshCwIcon class="h-3 w-3 mr-1 animate-spin" />
                          Loading
                        </div>
                      </Button>
                    </div>
                    
                    <!-- Model Actions Menu -->
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button variant="ghost" size="sm" class="h-6 w-6 p-0">
                          <MoreHorizontal class="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem @click="handlePreviewModel(model)">
                          <Eye class="h-3 w-3 mr-2" />
                          Preview Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          v-if="downloadedModels.includes(model.id) && currentModel !== model.id"
                          @click="removeDownloadedModel(model.id)"
                          class="text-red-600"
                        >
                          <Trash class="h-3 w-3 mr-2" />
                          Remove from Cache
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              
              <!-- Cache Management (compact) -->
              <div v-if="downloadedModels.length > 0" class="p-3 bg-muted/50 rounded-lg">
                <div class="flex items-center justify-between">
                  <div class="text-sm">
                    <span class="font-medium">Cache:</span> {{ cacheSize }} used by {{ downloadedModels.length }} models
                  </div>
                  <Button
                    @click="clearAllCache"
                    variant="outline"
                    size="sm"
                    class="text-red-600 hover:text-red-700 text-xs"
                  >
                    <Trash class="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
            
            <!-- Settings Tab -->
            <div v-if="activeTab === 'settings'" class="space-y-4">
              <WebLLMDefaultModelManager
                :available-models="webLLMModels"
                :downloaded-models="downloadedModels"
                :current-model="currentModel"
                :is-loading="isLoadingWebLLMModels"
                @refresh-models="handleRefresh"
                @model-selected="handleModelSelected"
                @preview-model="handlePreviewModel"
              />
              
              <!-- Advanced Settings (compact) -->
              <div class="space-y-3">
                <h3 class="font-medium">Advanced Settings</h3>
                
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-xs font-medium">Temperature ({{ temperature[0].toFixed(1) }})</label>
                    <input
                      type="range"
                      :value="temperature[0]"
                      @input="(e: Event) => temperature[0] = parseFloat((e.target as HTMLInputElement).value)"
                      min="0"
                      max="2"
                      step="0.1"
                      class="w-full mt-1"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-medium">Top P ({{ topP[0].toFixed(2) }})</label>
                    <input
                      type="range"
                      :value="topP[0]"
                      @input="(e: Event) => topP[0] = parseFloat((e.target as HTMLInputElement).value)"
                      min="0"
                      max="1"
                      step="0.05"
                      class="w-full mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Info Tab -->
            <div v-if="activeTab === 'info'" class="space-y-4">
              <!-- Browser Compatibility (detailed) -->
              <div class="space-y-3">
                <h3 class="font-medium">Browser Compatibility</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex items-center space-x-2 p-2 border rounded text-sm">
                    <CheckCircleIcon v-if="webGLSupported" class="h-4 w-4 text-green-500" />
                    <XCircleIcon v-else class="h-4 w-4 text-red-500" />
                    WebGL Support
                  </div>
                  <div class="flex items-center space-x-2 p-2 border rounded text-sm">
                    <CheckCircleIcon v-if="wasmSupported" class="h-4 w-4 text-green-500" />
                    <XCircleIcon v-else class="h-4 w-4 text-red-500" />
                    WebAssembly
                  </div>
                  <div class="flex items-center space-x-2 p-2 border rounded text-sm">
                    <CheckCircleIcon v-if="isWebLLMSupported" class="h-4 w-4 text-green-500" />
                    <AlertTriangleIcon v-else class="h-4 w-4 text-yellow-500" />
                    WebGPU Support
                  </div>
                  <div class="flex items-center space-x-2 p-2 border rounded text-sm">
                    <CheckCircleIcon v-if="memoryEstimate && memoryEstimate >= 4" class="h-4 w-4 text-green-500" />
                    <AlertTriangleIcon v-else class="h-4 w-4 text-yellow-500" />
                    RAM: {{ memoryEstimate ? `${memoryEstimate}GB` : 'Unknown' }}
                  </div>
                </div>
              </div>
              
              <!-- About WebLLM (compact) -->
              <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950">
                <h4 class="font-medium text-blue-800 dark:text-blue-200">About WebLLM</h4>
                <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  WebLLM runs AI models directly in your browser with complete privacy. 
                  Models are downloaded once and cached locally for offline use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseProviderSettings>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Globe as GlobeIcon, RefreshCw as RefreshCwIcon, HardDrive as HardDriveIcon, CheckCircle as CheckCircleIcon, Download as DownloadIcon, XCircle as XCircleIcon, AlertTriangle as AlertTriangleIcon, Gauge as GaugeIcon, X as XIcon, Info as InfoIcon, Crown, Settings, Play, MoreHorizontal, Eye, Trash } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import BaseProviderSettings from '@/features/settings/components/ai/BaseProviderSettings.vue'
import ConnectionStatus from '@/features/settings/components/ai/components/ConnectionStatus.vue'
import WebLLMDefaultModelManager from './components/WebLLMDefaultModelManager.vue'
import { useProviderSettings, type ModelInfo } from '@/features/settings/components/ai/composables/useProviderSettings'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import type { ConnectionState } from '@/features/settings/components/ai/components/ConnectionStatus.vue'
import { logger } from '@/services/logger'
import type { WebLLMModelInfo } from '@/features/ai/services'

import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'

// Initialize AI Actions Store for settings sync
const aiActionsStore = useAIActionsStore()

// Simple inline components for better maintainability

// Use the AI providers composable for WebLLM functionality
const {
  webLLMModels,
  isLoadingWebLLMModels,
  isWebLLMSupported,
  checkWebLLMSupport,
  fetchWebLLMModels,
  loadWebLLMModel
} = useAIProviders()

// Manual loading state since webLLMModelLoadingState doesn't exist
const isModelLoading = ref(false)
const loadingProgress = ref(0)
const loadingError = ref<string | null>(null)
const currentModel = ref<string | null>(null)

// Browser compatibility state
const webGLSupported = ref(false)
const wasmSupported = ref(false)
const memoryEstimate = ref<number | null>(null)

// WebLLM-specific state
const downloadedModels = ref<string[]>([])
const cacheSize = ref('0 MB')
const lastTested = ref<Date | null>(null)
const isCheckingCache = ref(false)
const selectedCategory = ref<'all' | 'downloaded' | 'small' | 'medium' | 'large'>('all')
const showAdvanced = ref(false)

// WebLLM settings
const temperature = ref([0.7])
const topP = ref([0.9])
const useWebGPU = ref(true)
const maxTokens = ref([512])

// Loading state - removed since webLLMModelLoadingState doesn't exist

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
      return models.map((model: any) => ({
        id: model.id || model.model_id || `model-${Math.random()}`,
        name: model.name || model.model_id || 'Unknown Model',
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
  return webLLMModels.value.find((model: any) => (model.id || model.model_id) === selectedModelId.value)
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
    const model = webLLMModels.value.find((m: any) => (m.id || m.model_id) === currentModel.value)
    return `Model loaded: ${(model as any)?.name || (model as any)?.model_id || currentModel.value}`
  }
  return 'No model loaded'
})

const loadingStatusText = computed(() => {
  if (isModelDownloaded.value) {
    return 'Loading model from browser cache...'
  }
  return 'First-time downloads may take several minutes depending on your internet connection. The model will be cached for future use.'
})

const modelCategories = computed(() => {
  const categories = [
    { id: 'all', name: 'All Models', count: webLLMModels.value.length },
    { id: 'small', name: 'Small', count: 0 },
    { id: 'medium', name: 'Medium', count: 0 },
    { id: 'large', name: 'Large', count: 0 }
  ]

  webLLMModels.value.forEach((model: WebLLMModelInfo) => {
    const category = getModelCategory(model.size)
    const categoryItem = categories.find(c => c.id === category)
    if (categoryItem) categoryItem.count++
  })

  return categories
})

const filteredModels = computed(() => {
  if (selectedCategory.value === 'all') {
    return webLLMModels.value
  }
  return webLLMModels.value.filter((model: WebLLMModelInfo) => 
    getModelCategory(model.size) === selectedCategory.value
  )
})

// Methods
const getModelCategory = (size: string): 'small' | 'medium' | 'large' => {
  if (size.includes('0.5B') || size.includes('1B') || size.includes('1.5B') || size.includes('2B')) return 'small'
  if (size.includes('3B') || size.includes('7B') || size.includes('8B')) return 'medium'
  if (size.includes('13B') || size.includes('70B')) return 'large'
  return 'medium'
}

const getModelName = (modelId: string): string => {
  const model = webLLMModels.value.find((m: any) => (m.id || m.model_id) === modelId)
  return (model as any)?.name || (model as any)?.model_id || modelId
}

const isDefaultModel = (modelId: string): boolean => {
  // Import and check WebLLM default model service
  try {
    const { webLLMDefaultModelService } = require('@/features/ai/services/webLLMDefaultModelService')
    const defaultModelId = webLLMDefaultModelService.getUserDefaultModel()
    return defaultModelId === modelId
  } catch {
    return false
  }
}

const getModelSizeBadgeVariant = (size: string): 'default' | 'secondary' | 'outline' => {
  const category = getModelCategory(size)
  switch (category) {
    case 'small': return 'secondary'
    case 'medium': return 'default'
    case 'large': return 'outline'
    default: return 'default'
  }
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

const selectModel = (modelId: string) => {
  selectedModelId.value = modelId
}

const loadModel = async (modelId?: string) => {
  const targetModelId = modelId || selectedModelId.value
  if (!targetModelId || isModelLoading.value) return
  
  try {
    const success = await loadWebLLMModel(targetModelId)
    
    if (success) {
      // Add to downloaded models
      if (!downloadedModels.value.includes(targetModelId)) {
        downloadedModels.value.push(targetModelId)
        localStorage.setItem('webllm-models-history', JSON.stringify(downloadedModels.value))
      }
      
      const model = webLLMModels.value.find((m: any) => (m.id || m.model_id) === targetModelId)
      toast({
        title: 'Model Loaded',
        description: `${(model as any)?.name || (model as any)?.model_id || targetModelId} has been loaded successfully`,
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
      description: 'Failed to load model. Please try again.',
      variant: 'destructive'
    })
  }
}

const unloadCurrentModel = async () => {
  if (!currentModel.value) return
  
  try {
    // Note: WebLLM doesn't currently support unloading models
    // This is a placeholder for future functionality
    toast({
      title: 'Model Management',
      description: 'WebLLM models remain loaded in memory. Refresh the page to clear all models.',
      variant: 'default'
    })
  } catch (error) {
    logger.error('Error with model management:', error)
    toast({
      title: 'Error',
      description: 'Failed to manage model state.',
      variant: 'destructive'
    })
  }
}

const removeDownloadedModel = async (modelId: string) => {
  if (currentModel.value === modelId) {
    await unloadCurrentModel()
  }
  
  downloadedModels.value = downloadedModels.value.filter(id => id !== modelId)
  localStorage.setItem('webllm-models-history', JSON.stringify(downloadedModels.value))
  
  const model = webLLMModels.value.find((m: any) => (m.id || m.model_id) === modelId)
  toast({
    title: 'Model Removed',
    description: `${(model as any)?.name || (model as any)?.model_id || modelId} has been removed from cache.`,
    variant: 'default'
  })
  
  await refreshCacheInfo()
}

const refreshCacheInfo = async () => {
  // Calculate cache size based on downloaded models
  const totalSize = downloadedModels.value.reduce((total, modelId) => {
    const model = webLLMModels.value.find((m: any) => (m.id || m.model_id) === modelId)
    if (model) {
      const sizeMatch = (model as any).downloadSize.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/)
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
    // Unload current model if any
    if (currentModel.value) {
      await unloadCurrentModel()
    }
    
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
  // Sync WebLLM-specific settings to main store
  const settings = {
    temperature: temperature.value[0],
    maxTokens: maxTokens.value[0],
    webllmDefaultModel: defaultModelId.value,
    webllmAutoLoad: true
  }
  
  // Update AI actions store with WebLLM settings
  aiActionsStore.updateProviderSettings(settings)
  
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

const handleModelSelected = (modelId: string) => {
  selectedModelId.value = modelId
  
  // Sync default model selection to main store
  aiActionsStore.updateProviderSettings({
    webllmDefaultModel: modelId,
    webllmAutoLoad: true
  })
  
  toast({
    title: 'Model Selected',
    description: `${getModelName(modelId)} set as default model`,
    variant: 'default'
  })
}

const handlePreviewModel = (model: WebLLMModelInfo) => {
  selectedModelId.value = model.id
  
  toast({
    title: 'Model Preview',
    description: `Previewing ${model.name || model.id}`,
    variant: 'default'
  })
}



// Computed properties for tabbed interface
const tabs = computed(() => [
  { id: 'models', name: 'Models', icon: HardDriveIcon, badge: webLLMModels.value.length },
  { id: 'settings', name: 'Settings', icon: Settings, badge: null },
  { id: 'info', name: 'Info', icon: InfoIcon, badge: null }
])

const activeTab = ref('models')

const filteredAndSortedModels = computed(() => {
  let filtered = webLLMModels.value
  
  // Apply category filter
  if (selectedCategory.value === 'downloaded') {
    filtered = filtered.filter((model: any) => downloadedModels.value.includes(model.id || model.model_id))
  } else if (selectedCategory.value !== 'all') {
    filtered = filtered.filter((model: any) => getModelCategory(model.downloadSize || model.size) === selectedCategory.value)
  }
  
  // Sort by name
  return filtered.sort((a: any, b: any) => {
    const aName = a.name || a.id || a.model_id
    const bName = b.name || b.id || b.model_id
    return aName.localeCompare(bName)
  })
})

const selectedModelName = computed(() => {
  const model = webLLMModels.value.find((m: any) => (m.id || m.model_id) === selectedModelId.value)
  return (model as any)?.name || (model as any)?.model_id || selectedModelId.value
})



const defaultModelId = computed(() => {
  try {
    const { webLLMDefaultModelService } = require('@/features/ai/services/webLLMDefaultModelService')
    return webLLMDefaultModelService.getUserDefaultModel()
  } catch {
    return null
  }
})

const getSizeBadgeVariant = (category: 'small' | 'medium' | 'large'): 'default' | 'secondary' | 'outline' => {
  switch (category) {
    case 'small': return 'secondary'
    case 'medium': return 'default'
    case 'large': return 'outline'
    default: return 'default'
  }
}

const getStatusText = () => {
  if (connectionState.value === 'connected') {
    return currentModel.value ? `Connected - ${getModelName(currentModel.value)}` : 'Connected - No Model'
  } else if (connectionState.value === 'error') {
    return 'Connection Error'
  } else {
    return 'Connecting...'
  }
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
    const smallModel = webLLMModels.value.find((m: any) => getModelCategory(m.size) === 'small')
    selectedModelId.value = (smallModel as any)?.id || (smallModel as any)?.model_id || (webLLMModels.value[0] as any)?.id || (webLLMModels.value[0] as any)?.model_id
  }
})
</script> 







