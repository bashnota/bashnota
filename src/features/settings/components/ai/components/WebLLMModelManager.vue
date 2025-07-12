<template>
  <div class="space-y-6">
    <!-- Browser Compatibility Check -->
    <div v-if="!isCompatible" class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-start">
        <AlertTriangleIcon class="h-5 w-5 text-red-600 mt-0.5 mr-3" />
        <div>
          <h4 class="text-sm font-medium text-red-800">Browser Not Compatible</h4>
          <p class="text-sm text-red-700 mt-1">{{ compatibilityMessage }}</p>
          <div class="mt-3 text-sm text-red-700">
            <p class="font-medium">Requirements:</p>
            <ul class="list-disc list-inside mt-1 space-y-1">
              <li>Chrome 113+ or Edge 113+ (recommended)</li>
              <li>WebGL 2.0 support</li>
              <li>WebAssembly support</li>
              <li>At least 4GB of available RAM</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Current Model Status -->
    <div class="p-4 bg-muted/50 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <GaugeIcon class="h-5 w-5 mr-2 text-primary" />
          <div>
            <h3 class="font-medium">Current Model</h3>
            <p class="text-sm text-muted-foreground">
              {{ currentModel ? getModelName(currentModel) : 'No model loaded' }}
            </p>
            <!-- Loading indicator for current model area -->
            <p v-if="isModelLoading && currentLoadingModel" class="text-sm text-blue-600 flex items-center gap-1 mt-1">
              <Loader2Icon class="h-3 w-3 animate-spin" />
              Loading {{ getModelName(currentLoadingModel) }}...
                             <span v-if="loadingDuration > 0" class="text-xs">
                 ({{ formatDuration(loadingDuration) }})
               </span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Badge 
            :variant="
              isModelLoading ? 'outline' :
              currentModel ? 'default' : 'outline'
            "
          >
            <Loader2Icon v-if="isModelLoading" class="h-3 w-3 mr-1 animate-spin" />
            {{ 
              isModelLoading ? 'Loading...' :
              currentModel ? 'Loaded' : 'None' 
            }}
          </Badge>
          <Button
            v-if="currentModel"
            @click="showModelDetails = !showModelDetails"
            variant="outline"
            size="sm"
          >
            {{ showModelDetails ? 'Hide' : 'Show' }} Details
          </Button>
        </div>
      </div>

      <!-- Model Details -->
      <div v-if="showModelDetails && currentModel" class="mt-4 pt-4 border-t">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="font-medium">Model ID:</span>
            <span class="ml-2 text-muted-foreground">{{ currentModel }}</span>
          </div>
          <div>
            <span class="font-medium">Status:</span>
            <span class="ml-2 text-green-600">Active</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Default Model Configuration -->
    <div v-if="isCompatible" class="p-4 border rounded-lg bg-background/50">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-medium">Auto-Loading Configuration</h4>
        <Switch
          :checked="autoLoadEnabled"
          @update:checked="setAutoLoadEnabled"
        />
      </div>
      
      <div v-if="autoLoadEnabled" class="space-y-3">
        <div class="text-xs text-muted-foreground mb-2">
          Choose a default model that will automatically load when WebLLM is requested
        </div>
        
        <!-- Quick Recommendations -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <Button
            v-for="(recommendation, key) in recommendations"
            :key="key"
            @click="setDefaultModel((recommendation as any)?.id || '')"
            :disabled="!recommendation"
            variant="outline"
            size="sm"
            :class="[
              'text-xs flex flex-col h-auto py-2 px-3',
              defaultModelId === (recommendation as any)?.id ? 'border-primary bg-primary/5' : ''
            ]"
          >
            <div class="font-medium capitalize">{{ key.replace('_', ' ') }}</div>
            <div class="text-xs text-muted-foreground mt-1">
              {{ recommendation ? getModelName((recommendation as any).id) : 'None' }}
            </div>
            <div v-if="recommendation" class="text-xs text-muted-foreground">
              {{ (recommendation as any).downloadSize }}
            </div>
          </Button>
        </div>
        
        <!-- Custom Selection -->
        <div class="space-y-2">
          <label class="text-xs text-muted-foreground">Or choose a specific model:</label>
          <CustomSelect
            :value="defaultModelId"
            @update:value="setDefaultModel"
            :options="(webLLMModels as any[]).map((m: any) => ({ value: m.id || m.model_id, label: getModelName(m.id || m.model_id) }))"
            placeholder="Select default model..."
            class="w-full"
          />
        </div>
        
        <!-- Auto-Load Strategy -->
        <div class="space-y-2">
          <label class="text-xs text-muted-foreground">Fallback strategy when no default is set:</label>
          <CustomSelect
            :value="autoLoadStrategy"
            @update:value="(v: 'smallest' | 'fastest' | 'balanced' | 'none') => autoLoadStrategy = v"
            :options="[
              { value: 'smallest', label: 'Smallest Model (Fastest)' },
              { value: 'fastest', label: 'Fastest Model (Optimized)' },
              { value: 'balanced', label: 'Balanced Model (Medium)' },
              { value: 'none', label: 'No Fallback' }
            ]"
            placeholder="Select strategy..."
            class="w-full"
          />
        </div>
        
        <!-- Current Status -->
        <div v-if="defaultModelId" class="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircleIcon class="h-3 w-3 text-green-600" />
          Default model: {{ getModelName(defaultModelId) }}
          <span v-if="currentModel === defaultModelId" class="text-green-600">(Currently loaded)</span>
        </div>
      </div>
    </div>

    <!-- Model Categories -->
    <div v-if="isCompatible">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium">Available Models</h3>
        <div class="flex items-center gap-2">
          <Badge variant="outline">{{ webLLMModels.length }} available</Badge>
          <Badge variant="secondary">{{ downloadedModels.length }} cached</Badge>
        </div>
      </div>

      <!-- Category Tabs -->
      <div class="flex space-x-1 p-1 bg-muted rounded-lg mb-4">
        <button
          v-for="category in modelCategories"
          :key="category.id"
          @click="selectedCategory = category.id as any"
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
      <div v-if="downloadedModels.length > 0" class="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center">
            <HardDriveIcon class="h-5 w-5 mr-2 text-green-600" />
            <h4 class="font-medium text-green-800">Downloaded Models</h4>
          </div>
          <div class="text-sm text-green-600">{{ cacheSize }} used</div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="modelId in downloadedModels"
            :key="modelId"
            @click="loadModel(modelId)"
            :disabled="isModelLoading && loadingModelId !== modelId"
            :class="[
              'px-3 py-1 text-sm rounded-md border transition-colors relative',
              currentModel === modelId
                ? 'bg-green-600 text-white border-green-600'
                : loadingModelId === modelId
                ? 'bg-blue-500 text-white border-blue-500'
                : modelLoadingStates[modelId] === 'error'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
            ]"
          >
            <span class="flex items-center gap-1">
              <Loader2Icon 
                v-if="loadingModelId === modelId" 
                class="h-3 w-3 animate-spin" 
              />
              {{ getModelName(modelId) }}
              <span v-if="currentModel === modelId && loadingModelId !== modelId" class="ml-1">✓</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Model Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="model in filteredModels"
          :key="(model as any).id"
          :class="[
            'p-4 border-2 rounded-lg transition-all hover:shadow-md',
            selectedModelId === (model as any).id
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          ]"
        >
          <div class="space-y-3">
            <!-- Model Header -->
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="font-medium">{{ (model as any).name || (model as any).id || 'Unknown Model' }}</h4>
                <p class="text-sm text-muted-foreground mt-1">{{ (model as any).size }}</p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <Badge :variant="getModelSizeBadgeVariant((model as any).size)">
                  {{ getModelCategory((model as any).size).toUpperCase() }}
                </Badge>
                <Badge v-if="downloadedModels.includes((model as any).id)" variant="default" class="text-xs">
                  <CheckCircleIcon class="h-3 w-3 mr-1" />
                  Downloaded
                </Badge>
              </div>
            </div>

            <!-- Model Actions -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">{{ (model as any).downloadSize }}</span>
              <div class="flex gap-2">
                <Button
                  @click="selectModel((model as any).id)"
                  :variant="selectedModelId === (model as any).id ? 'default' : 'outline'"
                  size="sm"
                  class="text-xs"
                >
                  {{ selectedModelId === (model as any).id ? 'Selected' : 'Select' }}
                </Button>
                <Button
                  @click="loadModel((model as any).id)"
                  :disabled="(isModelLoading && loadingModelId !== (model as any).id) || currentModel === (model as any).id"
                  :variant="
                    currentModel === (model as any).id ? 'default' :
                    loadingModelId === (model as any).id ? 'outline' :
                    modelLoadingStates[(model as any).id] === 'error' ? 'destructive' :
                    modelLoadingStates[(model as any).id] === 'success' ? 'default' :
                    'default'
                  "
                  size="sm"
                  class="text-xs relative min-w-[80px]"
                >
                  <!-- Loading state for this specific model -->
                  <template v-if="loadingModelId === (model as any).id">
                    <Loader2Icon class="mr-1 h-3 w-3 animate-spin" />
                    {{ downloadedModels.includes((model as any).id) ? 'Loading...' : 'Downloading...' }}
                  </template>
                  
                  <!-- Success state -->
                  <template v-else-if="modelLoadingStates[(model as any).id] === 'success'">
                    <CheckCircleIcon class="mr-1 h-3 w-3 text-green-600" />
                    Loaded!
                  </template>
                  
                  <!-- Error state -->
                  <template v-else-if="modelLoadingStates[(model as any).id] === 'error'">
                    <AlertTriangleIcon class="mr-1 h-3 w-3" />
                    Retry
                  </template>
                  
                  <!-- Normal states -->
                  <template v-else>
                    <DownloadIcon v-if="!downloadedModels.includes((model as any).id)" class="mr-1 h-3 w-3" />
                    <CheckCircleIcon v-else class="mr-1 h-3 w-3" />
                    {{
                      currentModel === (model as any).id ? 'Active' :
                      downloadedModels.includes((model as any).id) ? 'Load' : 'Download'
                    }}
                  </template>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Progress -->
      <div v-if="isModelLoading && currentLoadingModel" class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <Loader2Icon class="h-4 w-4 animate-spin text-blue-600" />
            <span class="text-sm font-medium text-blue-800">
              {{ downloadedModels.includes(currentLoadingModel) ? 'Loading' : 'Downloading' }} Model
            </span>
          </div>
          <div class="flex items-center gap-2 text-sm text-blue-600">
            <span>{{ Math.round(loadingProgress * 100) }}%</span>
                         <span v-if="loadingDuration > 0" class="text-xs text-blue-500">
               {{ formatDuration(loadingDuration) }}
             </span>
          </div>
        </div>
        <div class="w-full bg-blue-200 rounded-full h-2 mb-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            :style="{ width: `${loadingProgress * 100}%` }"
          ></div>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-blue-600">
            {{ getModelName(currentLoadingModel) }}
          </span>
          <span class="text-blue-500">
            {{ downloadedModels.includes(currentLoadingModel) ? 'Loading from cache...' : 'Downloading and caching model...' }}
          </span>
        </div>
        
        <!-- Additional loading info -->
        <div v-if="!downloadedModels.includes(currentLoadingModel)" class="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-700">
          <p class="flex items-center gap-1">
            <HardDriveIcon class="h-3 w-3" />
            Model will be cached locally for faster future loading
          </p>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="loadingError" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <AlertTriangleIcon class="h-4 w-4 text-red-600" />
          <span class="text-sm font-medium text-red-800">Loading Failed</span>
        </div>
        <p class="text-xs text-red-600">{{ loadingError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  AlertTriangle as AlertTriangleIcon, 
  Gauge as GaugeIcon, 
  HardDrive as HardDriveIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Loader2 as Loader2Icon
} from 'lucide-vue-next'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Switch } from '@/ui/switch'
import CustomSelect from '@/ui/CustomSelect.vue'
import { toast } from '@/ui/toast'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'

// Local interface for WebLLM models to ensure type safety
interface LocalWebLLMModelInfo {
  id: string
  name: string
  description: string
  size: string
  downloadSize: string
}

// WebLLM state
const selectedCategory = ref<'all' | 'small' | 'medium' | 'large'>('all')
const selectedModelId = ref<string>('')
const showModelDetails = ref(false)
const loadingModelId = ref<string>('')
const modelLoadingStates = ref<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({})
const loadingStartTime = ref<number>(0)

// Browser compatibility
const webGLSupported = ref(false)
const wasmSupported = ref(false)
const memoryEstimate = ref<number | null>(null)

// Use AI providers composable
const {
  webLLMModels,
  isLoadingWebLLMModels,
  isWebLLMSupported,
  checkWebLLMSupport,
  fetchWebLLMModels,
  loadWebLLMModel,
  currentWebLLMModel,
  webLLMProgress,
  webLLMError,
  setDefaultWebLLMModel,
  getRecommendedDefaultModels,
  autoSelectDefaultModel
} = useAIProviders()

// Use AI settings store
const aiSettings = useAISettingsStore()

// Aliases for template
const currentModel = currentWebLLMModel
const isModelLoading = isLoadingWebLLMModels
const loadingProgress = webLLMProgress
const loadingError = webLLMError

const currentLoadingModel = computed(() => {
  return loadingModelId.value || (isModelLoading.value ? selectedModelId.value : '')
})

const loadingDuration = computed(() => {
  if (!isModelLoading.value || !loadingStartTime.value) return 0
  return Math.floor((Date.now() - loadingStartTime.value) / 1000)
})

const downloadedModels = computed<string[]>(() => {
  try {
    const history = localStorage.getItem('webllm-models-history')
    return history ? JSON.parse(history) : []
  } catch {
    return []
  }
})

const cacheSize = computed(() => {
  const totalSize = downloadedModels.value.reduce((total: number, modelId: string) => {
    const model = (webLLMModels.value || []).find((m: any) => (m.id || m.model_id) === modelId)
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
  
  return totalSize > 1024 
    ? `${(totalSize / 1024).toFixed(1)} GB` 
    : `${totalSize.toFixed(0)} MB`
})

const isCompatible = computed(() => 
  webGLSupported.value && wasmSupported.value && isWebLLMSupported.value
)

const compatibilityMessage = computed(() => {
  if (!isWebLLMSupported.value) {
    return 'WebGPU not supported. Chrome 113+ or Edge 113+ recommended for optimal performance.'
  }
  if (!webGLSupported.value) {
    return 'WebGL 2.0 support required for WebLLM to function properly.'
  }
  if (!wasmSupported.value) {
    return 'WebAssembly support required for WebLLM to function properly.'
  }
  return 'Browser compatible'
})

const modelCategories = computed(() => {
  const categories = [
    { id: 'all', name: 'All Models', count: webLLMModels.value.length },
    { id: 'small', name: 'Small', count: 0 },
    { id: 'medium', name: 'Medium', count: 0 },
    { id: 'large', name: 'Large', count: 0 }
  ]

  webLLMModels.value.forEach((model: any) => {
    const category = getModelCategory(model.size)
    const categoryItem = categories.find(c => c.id === category)
    if (categoryItem) categoryItem.count++
  })

  return categories
})

const filteredModels = computed(() => {
  if (selectedCategory.value === 'all') {
    return webLLMModels.value || []
  }
  return (webLLMModels.value || []).filter((model: any) => 
    getModelCategory(model.size) === selectedCategory.value
  )
})

// Default model settings
const autoLoadEnabled = computed({
  get: () => aiSettings.getWebLLMSettings().autoLoad || false,
  set: (value: boolean) => aiSettings.setWebLLMAutoLoad(value)
})

const defaultModelId = computed({
  get: () => aiSettings.getWebLLMSettings().defaultModel || '',
  set: (value: string) => aiSettings.setWebLLMDefaultModel(value)
})

const autoLoadStrategy = computed({
  get: () => aiSettings.getWebLLMSettings().autoLoadStrategy || 'smallest',
  set: (value: 'default' | 'smallest' | 'fastest' | 'balanced' | 'none') => aiSettings.setWebLLMAutoLoadStrategy(value)
})

const recommendations = computed(() => getRecommendedDefaultModels())

// Methods
const getModelCategory = (size: string): 'small' | 'medium' | 'large' => {
  if (size.includes('0.5B') || size.includes('1B') || size.includes('1.5B') || size.includes('2B')) return 'small'
  if (size.includes('3B') || size.includes('7B') || size.includes('8B')) return 'medium'
  if (size.includes('13B') || size.includes('70B')) return 'large'
  return 'medium'
}

const getModelName = (modelId: string): string => {
  const model = (webLLMModels.value || []).find((m: any) => (m.id || m.model_id) === modelId)
  return (model as any)?.name || (model as any)?.model_id || modelId
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

const selectModel = (modelId: string) => {
  selectedModelId.value = modelId
}

const setDefaultModel = (modelId: string) => {
  defaultModelId.value = modelId
  setDefaultWebLLMModel(modelId)
}

const setAutoLoadEnabled = (enabled: boolean) => {
  autoLoadEnabled.value = enabled
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

const loadModel = async (modelId: string) => {
  // Prevent loading if already loading another model
  if (isModelLoading.value && loadingModelId.value !== modelId) {
    toast({
      title: 'Model Loading in Progress',
      description: 'Please wait for the current model to finish loading.',
      variant: 'destructive'
    })
    return
  }

  // Set loading state
  loadingModelId.value = modelId
  selectedModelId.value = modelId
  modelLoadingStates.value[modelId] = 'loading'
  loadingStartTime.value = Date.now()

  const model = (webLLMModels.value || []).find((m: any) => (m.id || m.model_id) === modelId)
  const isDownloaded = downloadedModels.value.includes(modelId)
  
  // Show initial loading toast
  toast({
    title: isDownloaded ? 'Loading Model' : 'Downloading Model',
    description: `${isDownloaded ? 'Loading' : 'Downloading'} ${((model as any)?.name || (model as any)?.model_id) || modelId}...`,
    variant: 'default'
  })

  try {
    const success = await loadWebLLMModel(modelId)
    
    if (success) {
      // Update cached models list
      const history = downloadedModels.value.slice()
      if (!history.includes(modelId)) {
        history.push(modelId)
        localStorage.setItem('webllm-models-history', JSON.stringify(history))
      }
      
      const model = (webLLMModels.value || []).find((m: any) => (m.id || m.model_id) === modelId)
      // Set success state
      modelLoadingStates.value[modelId] = 'success'
      
      // Success feedback
      toast({
        title: 'Model Loaded Successfully',
        description: `${((model as any)?.name || (model as any)?.model_id) || modelId} is now ready to use`,
        variant: 'default'
      })
      
      // Auto-hide success state after 3 seconds
      setTimeout(() => {
        if (modelLoadingStates.value[modelId] === 'success') {
          modelLoadingStates.value[modelId] = 'idle'
        }
      }, 3000)
    } else {
      throw new Error('Model loading failed')
    }
  } catch (error) {
    console.error('Error loading model:', error)
    modelLoadingStates.value[modelId] = 'error'
    const model = (webLLMModels.value || []).find((m: any) => (m.id || m.model_id) === modelId)
    
    toast({
      title: 'Model Loading Failed',
      description: `Failed to load ${((model as any)?.name || (model as any)?.model_id) || modelId}. Please try again.`,
      variant: 'destructive'
    })
    
    // Auto-hide error state after 5 seconds
    setTimeout(() => {
      if (modelLoadingStates.value[modelId] === 'error') {
        modelLoadingStates.value[modelId] = 'idle'
      }
    }, 5000)
  } finally {
    // Clear loading state
    loadingModelId.value = ''
    loadingStartTime.value = 0
  }
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
    }
  } catch {
    memoryEstimate.value = null
  }
}

// Initialize
onMounted(async () => {
  await checkBrowserCompatibility()
  await checkWebLLMSupport()
  await fetchWebLLMModels()
  
  // Set default selection to first small model
  if (webLLMModels.value.length > 0 && !selectedModelId.value) {
    const smallModel = webLLMModels.value.find((m: any) => getModelCategory(m.size) === 'small')
    selectedModelId.value = (smallModel as any)?.id || (smallModel as any)?.model_id || (webLLMModels.value[0] as any)?.id
  }
})
</script> 