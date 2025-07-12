<template>
  <div class="space-y-4">
    <!-- 🔥 Compact Status Header -->
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

    <!-- 🔥 Tabbed Interface -->
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
                {{ filteredAndSortedModels.length }} of {{ webLLMModels.length }} models • {{ downloadedModels.length }} downloaded • {{ cacheSize }} used
              </p>
            </div>
            
            <!-- Search and Filter -->
            <div class="flex items-center space-x-2">
              <div class="relative">
                <Search class="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  v-model="searchQuery"
                  placeholder="Search models..."
                  class="pl-8 w-48 text-sm"
                />
              </div>
              <select v-model="selectedCategory" class="text-sm border border-input rounded-md px-2 py-1 bg-background">
                <option value="all">All Models</option>
                <option value="downloaded">Downloaded Only</option>
                <option value="small">Small Models</option>
                <option value="medium">Medium Models</option>
                <option value="large">Large Models</option>
              </select>
            </div>
          </div>
          
          <!-- Unified Model Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            <div
              v-for="model in filteredAndSortedModels"
              :key="model.id"
              :class="[
                'p-3 border rounded-lg transition-all hover:shadow-sm cursor-pointer',
                currentModel === model.id ? 'border-primary bg-primary/5' :
                isDefaultModel(model.id) ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20' :
                isModelDownloaded(model.id) ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
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
                    <Badge v-if="currentModel === model.id" variant="default" class="text-xs">
                      <Play class="h-2 w-2 mr-1" />
                      Active
                    </Badge>
                    <Badge v-if="isDefaultModel(model.id)" variant="secondary" class="text-xs">
                      <Crown class="h-2 w-2 mr-1" />
                      Default
                    </Badge>
                    <Badge v-if="isModelDownloaded(model.id)" variant="outline" class="text-xs">
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
                      <DownloadIcon v-if="!isModelDownloaded(model.id)" class="h-3 w-3 mr-1" />
                      <Play v-else-if="currentModel !== model.id" class="h-3 w-3 mr-1" />
                      <CheckCircleIcon v-else class="h-3 w-3 mr-1" />
                      {{
                        currentModel === model.id ? 'Active' :
                        isModelDownloaded(model.id) ? 'Load' : 'Download'
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
                      v-if="isModelDownloaded(model.id) && currentModel !== model.id"
                      @click="removeDownloadedModel(model.id)"
                      class="text-destructive"
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
                variant="destructive"
                size="sm"
                class="text-xs"
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

<script setup lang="ts">
// Import all the necessary logic from the original WebLLM provider settings
// This is a simplified content-only version for modal usage
import { ref, computed, onMounted, watch } from 'vue'
import { Crown, Settings, RefreshCw as RefreshCwIcon, HardDrive as HardDriveIcon, CheckCircle as CheckCircleIcon, Download as DownloadIcon, XCircle as XCircleIcon, AlertTriangle as AlertTriangleIcon, Play, MoreHorizontal, Eye, Trash, Search } from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Input } from '@/ui/input'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/ui/dropdown-menu'
import { toast } from '@/ui/toast'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import { useProviderSettings, type ModelInfo } from '@/features/settings/components/ai/composables/useProviderSettings'
import { logger } from '@/services/logger'
import type { WebLLMModelInfo } from '@/features/ai/services'

import WebLLMDefaultModelManager from '../providers/components/WebLLMDefaultModelManager.vue'
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'

// Initialize AI Actions Store for settings sync
const aiActionsStore = useAIActionsStore()

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
const selectedCategory = ref<'all' | 'downloaded' | 'small' | 'medium' | 'large'>('all')
const searchQuery = ref('')

// WebLLM settings
const temperature = ref([0.7])
const topP = ref([0.9])

// Simplified provider settings for modal context
const selectedModelId = ref<string | null>(null)

// Computed properties
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

const connectionState = computed(() => {
  if (isLoadingWebLLMModels.value) return 'connecting'
  if (loadingError.value) return 'error'
  if (isWebLLMSupported.value) return 'connected'
  return 'disconnected'
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

const filteredAndSortedModels = computed(() => {
  let filtered = webLLMModels.value
  
  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((model: any) => {
      const name = (model.name || model.id || model.model_id || '').toLowerCase()
      const description = (model.description || '').toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }
  
  // Apply category filter
  if (selectedCategory.value === 'downloaded') {
    filtered = filtered.filter((model: any) => isModelDownloaded(model.id || model.model_id))
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

// Computed properties for tabbed interface
const tabs = computed(() => [
  { id: 'models', name: 'Models', icon: HardDriveIcon, badge: webLLMModels.value.length },
  { id: 'settings', name: 'Settings', icon: Settings, badge: null },
  { id: 'info', name: 'Info', icon: AlertTriangleIcon, badge: null }
])

const activeTab = ref('models')

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
  try {
    const { webLLMDefaultModelService } = require('@/features/ai/services/webLLMDefaultModelService')
    const defaultModelId = webLLMDefaultModelService.getUserDefaultModel()
    return defaultModelId === modelId
  } catch {
    return false
  }
}

const isModelDownloaded = (modelId: string): boolean => {
  return downloadedModels.value.includes(modelId)
}

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

// Event handlers
const selectModel = (modelId: string) => {
  selectedModelId.value = modelId
}

const loadModel = async (modelId: string) => {
  if (isModelLoading.value) return
  
  try {
    isModelLoading.value = true
    selectedModelId.value = modelId
    const success = await loadWebLLMModel(modelId)
    
    if (success) {
      currentModel.value = modelId
      // Track downloaded models
      if (!isModelDownloaded(modelId)) {
        downloadedModels.value.push(modelId)
        // Persist to localStorage
        localStorage.setItem('webllm-downloaded-models', JSON.stringify(downloadedModels.value))
      }
      
      toast({
        title: 'Model Loaded',
        description: `${getModelName(modelId)} has been loaded successfully`,
        variant: 'default'
      })
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
  } finally {
    isModelLoading.value = false
    selectedModelId.value = null
  }
}

const handleRefresh = async () => {
  await fetchWebLLMModels()
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



const removeDownloadedModel = async (modelId: string) => {
  downloadedModels.value = downloadedModels.value.filter(id => id !== modelId)
  // Persist to localStorage
  localStorage.setItem('webllm-downloaded-models', JSON.stringify(downloadedModels.value))
  
  toast({
    title: 'Model Removed',
    description: `${getModelName(modelId)} has been removed from cache.`,
    variant: 'default'
  })
}

const clearAllCache = () => {
  if (confirm('Are you sure you want to clear all cached models?')) {
    downloadedModels.value = []
    cacheSize.value = '0 MB'
    // Clear from localStorage
    localStorage.removeItem('webllm-downloaded-models')
    
    toast({
      title: 'Cache Cleared',
      description: 'All cached WebLLM models have been removed.',
      variant: 'default'
    })
  }
}

// Browser compatibility check
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

// Initialize
onMounted(async () => {
  // Load downloaded models from localStorage
  try {
    const saved = localStorage.getItem('webllm-downloaded-models')
    if (saved) {
      downloadedModels.value = JSON.parse(saved)
    }
  } catch (error) {
    logger.warn('Failed to load downloaded models from localStorage:', error)
  }
  
  await checkBrowserCompatibility()
  await checkWebLLMSupport()
  await fetchWebLLMModels()
})
</script> 