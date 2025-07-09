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
        <!-- Browser Compatibility Status -->
        <div class="space-y-3">
          <h3 class="text-sm font-medium">Browser Compatibility</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="flex items-center space-x-2 p-3 border rounded-md">
              <CheckCircleIcon v-if="webGLSupported" class="h-4 w-4 text-green-500" />
              <XCircleIcon v-else class="h-4 w-4 text-red-500" />
              <span class="text-sm">WebGL Support</span>
            </div>
            <div class="flex items-center space-x-2 p-3 border rounded-md">
              <CheckCircleIcon v-if="wasmSupported" class="h-4 w-4 text-green-500" />
              <XCircleIcon v-else class="h-4 w-4 text-red-500" />
              <span class="text-sm">WebAssembly Support</span>
            </div>
            <div class="flex items-center space-x-2 p-3 border rounded-md">
              <CheckCircleIcon v-if="isWebLLMSupported" class="h-4 w-4 text-green-500" />
              <AlertTriangleIcon v-else class="h-4 w-4 text-yellow-500" />
              <span class="text-sm">WebGPU Support</span>
            </div>
            <div class="flex items-center space-x-2 p-3 border rounded-md">
              <CheckCircleIcon v-if="memoryEstimate && memoryEstimate >= 4" class="h-4 w-4 text-green-500" />
              <AlertTriangleIcon v-else class="h-4 w-4 text-yellow-500" />
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

        <!-- Connection Status -->
        <ConnectionStatus
          :state="connectionState"
          provider-name="WebLLM"
          :error="connectionError || undefined"
          :last-tested="lastTested || undefined"
          @retry="handleTest"
        />

        <!-- Current Model Status -->
        <div class="p-4 bg-muted/50 rounded-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <GaugeIcon class="h-5 w-5 mr-2 text-primary" />
              <h3 class="font-medium">Current Status</h3>
            </div>
            <div class="flex items-center gap-2">
              <Badge :variant="currentModel ? 'default' : 'outline'">
                {{ currentModel ? 'Model Loaded' : 'No Model' }}
              </Badge>
              <Button
                v-if="currentModel"
                @click="unloadCurrentModel"
                variant="outline"
                size="sm"
                class="text-red-600 hover:text-red-700"
              >
                <XIcon class="h-4 w-4 mr-1" />
                Unload
              </Button>
            </div>
          </div>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ modelStatus }}
          </p>

          <!-- Loading Progress -->
          <div v-if="isModelLoading" class="mt-4 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">Loading Progress</span>
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

          <!-- Loading Error -->
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

        <!-- 🔥 NEW: Default Model Management -->
        <div v-if="isCompatible">
          <WebLLMDefaultModelManager
            :available-models="webLLMModels"
            :downloaded-models="downloadedModels"
            :current-model="currentModel"
            :is-loading="isLoadingWebLLMModels"
            @refresh-models="handleRefresh"
            @model-selected="handleModelSelected"
            @preview-model="handlePreviewModel"
          />
        </div>

        <!-- Model Selection -->
        <div v-if="isCompatible" class="space-y-4">
          <!-- Model Selection Header -->
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-medium">All Available Models</h3>
              <p class="text-sm text-muted-foreground">
                {{ webLLMModels.length }} models available • {{ downloadedModels.length }} downloaded
              </p>
            </div>
            <Button
              @click="handleRefresh"
              :disabled="isLoadingWebLLMModels"
              variant="outline"
              size="sm"
            >
              <RefreshCwIcon :class="['h-4 w-4 mr-2', isLoadingWebLLMModels && 'animate-spin']" />
              Refresh
            </Button>
          </div>

          <!-- Model Categories -->
          <div class="flex space-x-1 p-1 bg-muted rounded-lg">
            <button
              v-for="category in modelCategories"
              :key="category.id"
                             @click="() => selectedCategory = category.id as 'all' | 'small' | 'medium' | 'large'"
              :class="[
                'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                selectedCategory === category.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              ]"
            >
              {{ category.name }}
              <span class="ml-1 text-xs opacity-60">({{ category.count }})</span>
            </button>
          </div>

          <!-- Downloaded Models Quick Access -->
          <div v-if="downloadedModels.length > 0" class="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <HardDriveIcon class="h-5 w-5 mr-2 text-green-600" />
                <h4 class="font-medium text-green-800">Downloaded Models</h4>
              </div>
              <Badge variant="outline" class="border-green-300 text-green-700">{{ cacheSize }} used</Badge>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="modelId in downloadedModels"
                :key="modelId"
                @click="selectModel(modelId)"
                :class="[
                  'px-3 py-1 text-sm rounded-md border transition-colors',
                  selectedModelId === modelId
                    ? 'bg-green-600 text-white border-green-600'
                    : currentModel === modelId
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                ]"
              >
                {{ getModelName(modelId) }}
                <span v-if="currentModel === modelId" class="ml-1 text-xs">• Active</span>
              </button>
            </div>
          </div>

          <!-- Model Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="model in filteredModels"
              :key="(model as any).id || (model as any).model_id || 'unknown'"
              :class="[
                'p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md',
                selectedModelId === ((model as any).id || (model as any).model_id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              ]"
              @click="selectModel((model as any).id || (model as any).model_id)"
            >
              <div class="space-y-3">
                <!-- Model Header -->
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h4 class="font-medium">{{ (model as any).name || (model as any).model_id || 'Unknown Model' }}</h4>
                    <p class="text-sm text-muted-foreground mt-1">{{ (model as any).size || 'Unknown Size' }}</p>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <Badge :variant="getModelSizeBadgeVariant((model as any).size || '')">
                      {{ getModelCategory((model as any).size || '').toUpperCase() }}
                    </Badge>
                    <!-- 🔥 NEW: Default Model Indicator -->
                    <Badge v-if="isDefaultModel((model as any).id || (model as any).model_id)" variant="default" class="text-xs bg-blue-100 text-blue-800 border-blue-300">
                      <Crown class="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                    <Badge v-if="downloadedModels.includes((model as any).id || (model as any).model_id)" variant="default" class="text-xs">
                      <CheckCircleIcon class="h-3 w-3 mr-1" />
                      Downloaded
                    </Badge>
                  </div>
                </div>

                <!-- Model Status -->
                <div class="flex items-center justify-between">
                  <span class="text-xs text-muted-foreground">{{ (model as any).downloadSize || 'Unknown Size' }}</span>
                  <div class="flex items-center gap-2">
                    <!-- 🔥 NEW: Set as Default Button -->
                    <Button
                      v-if="!isDefaultModel((model as any).id || (model as any).model_id)"
                      @click.stop="handleModelSelected((model as any).id || (model as any).model_id)"
                      variant="outline"
                      size="sm"
                      class="text-xs"
                    >
                      <Crown class="mr-1 h-3 w-3" />
                      Set Default
                    </Button>
                    
                    <Button
                      @click.stop="loadModel((model as any).id || (model as any).model_id)"
                      :disabled="isModelLoading || currentModel === ((model as any).id || (model as any).model_id)"
                      variant="default"
                      size="sm"
                      class="text-xs"
                    >
                      <template v-if="!isModelLoading || selectedModelId !== ((model as any).id || (model as any).model_id)">
                        <DownloadIcon v-if="!downloadedModels.includes((model as any).id || (model as any).model_id)" class="mr-1 h-3 w-3" />
                        <CheckCircleIcon v-else class="mr-1 h-3 w-3" />
                        {{
                          currentModel === ((model as any).id || (model as any).model_id) ? 'Active' :
                          downloadedModels.includes((model as any).id || (model as any).model_id) ? 'Load' : 'Download'
                        }}
                      </template>
                      <div v-else class="flex items-center">
                        <RefreshCwIcon class="mr-1 h-3 w-3 animate-spin" />
                        Loading...
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Selected Model Details -->
          <div v-if="selectedModel" class="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div class="flex items-start justify-between">
              <div>
                <h4 class="font-medium text-purple-900">{{ (selectedModel as any).name || (selectedModel as any).model_id || 'Unknown Model' }}</h4>
                <p class="text-sm text-purple-700 mt-1">{{ (selectedModel as any).description || 'AI model for text generation' }}</p>
              </div>
              <div class="text-right text-xs text-purple-600 space-y-1">
                <div>
                  <Badge variant="outline" class="border-purple-300 text-purple-700">{{ (selectedModel as any).size }}</Badge>
                </div>
                <div class="text-xs">{{ (selectedModel as any).downloadSize }}</div>
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
                @click="loadModel()"
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
        </div>

        <!-- Advanced Settings -->
        <div v-if="isCompatible && isConnected" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium">Advanced Settings</h3>
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
                <h4 class="text-xs font-medium">Temperature ({{ temperature[0].toFixed(1) }})</h4>
                <div class="mt-2 space-y-1">
                  <input
                    type="range"
                    :value="temperature[0]"
                    @input="(e: Event) => temperature[0] = parseFloat((e.target as HTMLInputElement).value)"
                    min="0"
                    max="2"
                    step="0.1"
                    class="w-full"
                  />
                  <p class="text-xs text-gray-500">Controls randomness in responses</p>
                </div>
              </div>
              <div>
                <h4 class="text-xs font-medium">Top P ({{ topP[0].toFixed(2) }})</h4>
                <div class="mt-2 space-y-1">
                  <input
                    type="range"
                    :value="topP[0]"
                    @input="(e: Event) => topP[0] = parseFloat((e.target as HTMLInputElement).value)"
                    min="0"
                    max="1"
                    step="0.05"
                    class="w-full"
                  />
                  <p class="text-xs text-gray-500">Nucleus sampling parameter</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cache Management -->
        <div v-if="isCompatible && downloadedModels.length > 0" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium">Cache Management</h3>
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
import { ref, computed, onMounted, watch } from 'vue'
import { Globe as GlobeIcon, RefreshCw as RefreshCwIcon, HardDrive as HardDriveIcon, CheckCircle as CheckCircleIcon, Download as DownloadIcon, XCircle as XCircleIcon, AlertTriangle as AlertTriangleIcon, Gauge as GaugeIcon, X as XIcon, Info as InfoIcon, Crown } from 'lucide-vue-next'
import { toast } from '@/ui/toast'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import BaseProviderSettings from '@/features/settings/components/ai/BaseProviderSettings.vue'
import ConnectionStatus from '@/features/settings/components/ai/components/ConnectionStatus.vue'
import WebLLMDefaultModelManager from './components/WebLLMDefaultModelManager.vue'
import { useProviderSettings, type ModelInfo } from '@/features/settings/components/ai/composables/useProviderSettings'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import type { ConnectionState } from '@/features/settings/components/ai/components/ConnectionStatus.vue'
import { logger } from '@/services/logger'
import type { WebLLMModelInfo } from '@/features/ai/services'

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
const selectedCategory = ref<'all' | 'small' | 'medium' | 'large'>('all')
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

// 🔥 NEW: Check if a model is set as default
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

// 🔥 NEW: Event handlers for WebLLMDefaultModelManager
const handleModelSelected = (modelId: string) => {
  selectedModelId.value = modelId
  
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







