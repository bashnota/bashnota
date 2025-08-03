<template>
  <div class="space-y-4">
    <!-- Browser Compatibility Status -->
    <div v-if="!isCompatible" class="p-3 bg-amber-50 border border-amber-200 rounded-md">
      <div class="flex items-start">
        <AlertTriangleIcon class="h-4 w-4 text-amber-600 mt-0.5 mr-2" />
        <div class="text-sm text-amber-700">
          <p class="font-medium">Browser Compatibility Check</p>
          <p class="mt-1">{{ compatibilityMessage }}</p>
        </div>
      </div>
    </div>

    <!-- Quick Status -->
    <div class="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div class="flex items-center gap-2">
        <Loader2Icon v-if="isModelLoading || loadingModelId" class="h-4 w-4 animate-spin text-blue-600" />
        <GaugeIcon v-else class="h-4 w-4" />
        <span class="text-sm font-medium">
          {{ 
            loadingModelId ? `Loading: ${getModelName(loadingModelId)}` :
            currentModel ? `Model: ${getModelName(currentModel)}` : 'No model loaded' 
          }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <Badge v-if="downloadedModels.length > 0" variant="outline" class="text-xs">
          {{ downloadedModels.length }} cached
        </Badge>
        <Button
          v-if="isSelected"
          @click="showModelManager = !showModelManager"
          variant="outline"
          size="sm"
        >
          {{ showModelManager ? 'Hide' : 'Manage' }} Models
        </Button>
      </div>
    </div>

    <!-- Model Manager (Collapsed by default) -->
    <div v-if="showModelManager && isSelected" class="border rounded-lg p-4 bg-background">
      <div class="space-y-4">
        <!-- Quick Model Selection -->
        <div v-if="downloadedModels.length > 0">
          <h4 class="text-sm font-medium mb-2">Downloaded Models</h4>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="modelId in downloadedModels"
              :key="modelId"
              @click="loadModel(modelId)"
              :disabled="isModelLoading && loadingModelId !== modelId"
              :class="[
                'px-3 py-1 text-sm rounded-md border transition-colors relative',
                currentModel === modelId
                  ? 'bg-primary text-primary-foreground border-primary'
                  : loadingModelId === modelId
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-background hover:bg-muted border-border'
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

        <!-- Browse All Models Link -->
        <div class="flex items-center justify-between pt-2 border-t">
          <span class="text-xs text-muted-foreground">
            {{ availableModels.length }} models available
          </span>
          <Button
            @click="openFullModelManager"
            variant="ghost"
            size="sm"
            class="text-xs"
          >
            Browse All Models
            <ExternalLinkIcon class="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Loading Status -->
    <div v-if="isModelLoading || loadingModelId" class="p-3 bg-blue-50 border border-blue-200 rounded-md">
      <div class="flex items-center gap-2">
        <Loader2Icon class="h-4 w-4 animate-spin text-blue-600" />
        <div class="flex-1">
          <p class="text-sm font-medium text-blue-800">
            {{ loadingModelId ? `Loading ${getModelName(loadingModelId)}` : 'Loading Model' }}
          </p>
          <p class="text-xs text-blue-600">{{ Math.round(loadingProgress) }}% complete</p>
        </div>
      </div>
      <div class="mt-2 w-full bg-blue-200 rounded-full h-1">
        <div 
          class="bg-blue-600 h-1 rounded-full transition-all duration-300" 
          :style="{ width: `${loadingProgress}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AlertTriangle as AlertTriangleIcon, Gauge as GaugeIcon, ExternalLink as ExternalLinkIcon, Loader2 as Loader2Icon } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import { useRouter } from 'vue-router'
import type { WebLLMModelInfo } from '@/features/ai/services'

interface Props {
  isSelected: boolean
}

interface Emits {
  (e: 'model-loaded'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

// WebLLM state
const showModelManager = ref(false)
const loadingModelId = ref<string>('')

// Use AI providers composable
const {
  webLLMModels,
  isWebLLMSupported,
  checkWebLLMSupport,
  fetchWebLLMModels,
  loadWebLLMModel,
  currentWebLLMModel,
  isLoadingWebLLMModels,
  webLLMProgress,
} = useAIProviders()

// Browser compatibility
const webGLSupported = ref(false)
const wasmSupported = ref(false)

// Computed
const currentModel = currentWebLLMModel
const isModelLoading = isLoadingWebLLMModels
const loadingProgress = computed(() => (webLLMProgress.value || 0) * 100)

const downloadedModels = computed(() => {
  try {
    const history = localStorage.getItem('webllm-models-history')
    return history ? JSON.parse(history) : []
  } catch {
    return []
  }
})

const availableModels = computed(() => webLLMModels.value)

const isCompatible = computed(() => 
  webGLSupported.value && wasmSupported.value && isWebLLMSupported.value
)

const compatibilityMessage = computed(() => {
  if (!isWebLLMSupported.value) {
    return 'WebGPU not supported. Chrome 113+ or Edge 113+ recommended.'
  }
  if (!webGLSupported.value) {
    return 'WebGL 2.0 support required.'
  }
  if (!wasmSupported.value) {
    return 'WebAssembly support required.'
  }
  return 'Browser compatible'
})

// Methods
const getModelName = (modelId: string): string => {
  const model = webLLMModels.value.find((m: WebLLMModelInfo) => m.id === modelId)
  return model?.name || modelId
}

const loadModel = async (modelId: string) => {
  // Set loading state
  loadingModelId.value = modelId
  
  try {
    const success = await loadWebLLMModel(modelId)
    if (success) {
      emit('model-loaded')
    }
  } catch (error) {
    console.error('Error loading model:', error)
  } finally {
    // Clear loading state
    loadingModelId.value = ''
  }
}

const openFullModelManager = () => {
  // Navigate to full WebLLM settings or open in a modal
  router.push('/settings?tab=ai&provider=webllm')
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
}

// Initialize
onMounted(async () => {
  await checkBrowserCompatibility()
  await checkWebLLMSupport()
  await fetchWebLLMModels()
})
</script> 