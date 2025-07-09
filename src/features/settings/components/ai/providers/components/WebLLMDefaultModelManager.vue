<template>
  <div class="space-y-6">
    <!-- Default Model Status -->
    <div class="p-4 border rounded-lg">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <Settings class="h-5 w-5 text-primary" />
          <h3 class="font-medium">Default Model Configuration</h3>
        </div>
        <Badge v-if="defaultModel" variant="default" class="bg-green-100 text-green-800 border-green-300">
          <CheckCircle class="h-3 w-3 mr-1" />
          Configured
        </Badge>
        <Badge v-else variant="outline" class="border-orange-300 text-orange-700">
          <AlertTriangle class="h-3 w-3 mr-1" />
          Not Set
        </Badge>
      </div>
      
      <!-- Current Default Model -->
      <div v-if="defaultModel" class="space-y-3">
        <div class="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
          <div class="space-y-1">
            <h4 class="font-medium">{{ getModelDisplayName(defaultModel) }}</h4>
            <p class="text-sm text-muted-foreground">
              {{ getModelDescription(defaultModel) }}
            </p>
            <div class="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>Strategy: {{ config.autoLoadStrategy || 'Not set' }}</span>
              <span v-if="config.lastSetAt">
                Set: {{ formatDate(config.lastSetAt) }}
              </span>
            </div>
          </div>
          <div class="text-right space-y-1">
            <Badge :variant="getSizeBadgeVariant(getModelSize(defaultModel))">
              {{ getModelSize(defaultModel) }}
            </Badge>
            <div class="text-xs text-muted-foreground">
              {{ getModelDownloadSize(defaultModel) }}
            </div>
          </div>
        </div>
        
        <!-- Auto-load Settings -->
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <Switch
                :checked="config.autoLoadOnRequest"
                @update:checked="updateAutoLoad"
              />
              <span class="text-sm font-medium">Auto-load on request</span>
            </div>
            <p class="text-xs text-muted-foreground">
              Automatically load this model when AI assistance is needed
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            @click="clearDefaultModel"
          >
            <XCircle class="h-4 w-4 mr-1" />
            Clear Default
          </Button>
        </div>
      </div>
      
      <!-- No Default Set -->
      <div v-else class="text-center py-6 space-y-3">
        <AlertTriangle class="h-8 w-8 text-orange-500 mx-auto" />
        <div>
          <p class="font-medium">No default model configured</p>
          <p class="text-sm text-muted-foreground">
            Choose a model below or use quick setup to configure automatic loading
          </p>
        </div>
        <Button
          @click="showQuickSetup = true"
          variant="default"
        >
          <Zap class="h-4 w-4 mr-2" />
          Quick Setup
        </Button>
      </div>
    </div>

    <!-- Auto-load Strategy Selection -->
    <div v-if="config.enabled" class="space-y-4">
      <div>
        <h3 class="font-medium mb-2">Auto-load Strategy</h3>
        <p class="text-sm text-muted-foreground mb-4">
          Choose how WebLLM should select models when no specific default is set
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="strategy in strategies"
          :key="strategy.id"
          :class="[
            'p-4 border-2 rounded-lg cursor-pointer transition-all',
            config.autoLoadStrategy === strategy.id
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          ]"
          @click="updateStrategy(strategy.id)"
        >
          <div class="space-y-2">
            <div class="flex items-center space-x-2">
              <component :is="getStrategyIcon(strategy.id)" class="h-4 w-4 text-primary" />
              <span class="font-medium text-sm">{{ strategy.name }}</span>
            </div>
            <p class="text-xs text-muted-foreground">{{ strategy.description }}</p>
            
            <!-- Strategy Details -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span>Size Preference:</span>
                <Badge variant="outline" class="text-xs">
                  {{ strategy.sizePreference }}
                </Badge>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span>Max Download:</span>
                <span class="font-medium">{{ strategy.maxSize }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Available Models for Default Selection -->
    <div v-if="availableModels.length > 0" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-medium">Set as Default Model</h3>
          <p class="text-sm text-muted-foreground">
            Choose any model to set as your default for auto-loading
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            @click="refreshModels"
            :disabled="isLoading"
          >
            <RefreshCw :class="['h-4 w-4 mr-1', isLoading && 'animate-spin']" />
            Refresh
          </Button>
        </div>
      </div>
      
      <!-- Model Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="model in displayedModels"
          :key="model.id"
          :class="[
            'p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm',
            defaultModel === model.id
              ? 'border-green-500 bg-green-50 dark:bg-green-950'
              : 'border-border hover:border-primary/50'
          ]"
          @click="setAsDefault(model)"
        >
          <div class="space-y-2">
            <!-- Model Header -->
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="font-medium text-sm">{{ model.name || model.id }}</h4>
                <p class="text-xs text-muted-foreground">{{ model.downloadSize }}</p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <Badge :variant="getSizeBadgeVariant(getModelCategory(model.downloadSize))">
                  {{ getModelCategory(model.downloadSize).toUpperCase() }}
                </Badge>
                <div v-if="defaultModel === model.id" class="flex items-center text-xs text-green-600">
                  <Crown class="h-3 w-3 mr-1" />
                  Default
                </div>
              </div>
            </div>
            
            <!-- Model Actions -->
            <div class="flex justify-between items-center">
              <div class="text-xs text-muted-foreground">
                {{ isModelDownloaded(model.id) ? '✓ Downloaded' : 'Not downloaded' }}
              </div>
              <Button
                size="sm"
                variant="outline"
                @click.stop="setAsDefault(model)"
                :disabled="defaultModel === model.id"
                class="text-xs h-7"
              >
                {{ defaultModel === model.id ? 'Is Default' : 'Set Default' }}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Show More Button -->
      <div v-if="availableModels.length > displayedModels.length" class="text-center">
        <Button
          variant="outline"
          @click="showAllModels = true"
        >
          Show All Models ({{ availableModels.length - displayedModels.length }} more)
        </Button>
      </div>
    </div>

    <!-- Quick Setup Dialog -->
    <Dialog v-model:open="showQuickSetup">
      <DialogContent class="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Quick WebLLM Setup</DialogTitle>
        </DialogHeader>
        <WebLLMQuickSetup
          :available-models="availableModels"
          @setup-complete="handleQuickSetupComplete"
          @skip="showQuickSetup = false"
          @preview-model="handlePreviewModel"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Switch } from '@/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/dialog'
import { 
  Settings,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  Crown,
  RefreshCw,
  User,
  Gauge,
  Scale,
  Minimize
} from 'lucide-vue-next'
import { webLLMDefaultModelService } from '@/features/ai/services/webLLMDefaultModelService'
import type { DefaultModelConfig } from '@/features/ai/services/webLLMDefaultModelService'
import type { WebLLMModelInfo } from '@/features/ai/services/types'
import WebLLMQuickSetup from './WebLLMQuickSetup.vue'
import { toast } from '@/ui/toast'
import { logger } from '@/services/logger'

interface Props {
  availableModels: WebLLMModelInfo[]
  downloadedModels: string[]
  currentModel?: string | null
  isLoading?: boolean
}

interface Emits {
  'refresh-models': []
  'model-selected': [modelId: string]
  'preview-model': [model: WebLLMModelInfo]
}

const props = withDefaults(defineProps<Props>(), {
  currentModel: null,
  isLoading: false
})

const emit = defineEmits<Emits>()

// State
const config = ref<DefaultModelConfig>(webLLMDefaultModelService.getDefaultModelConfig())
const showQuickSetup = ref(false)
const showAllModels = ref(false)

// Computed
const defaultModel = computed(() => webLLMDefaultModelService.getUserDefaultModel())

const displayedModels = computed(() => {
  if (showAllModels.value) return props.availableModels
  return props.availableModels.slice(0, 6)
})

const strategies = computed(() => [
  {
    id: 'user-selected' as const,
    name: 'User Selected',
    description: 'Use your manually selected default model',
    sizePreference: 'Varies',
    maxSize: 'N/A'
  },
  {
    id: 'smallest' as const,
    name: 'Smallest',
    description: 'Prioritize fastest downloads and lowest memory',
    sizePreference: 'Small',
    maxSize: '1GB'
  },
  {
    id: 'fastest' as const,
    name: 'Fastest',
    description: 'Balance download size with response speed',
    sizePreference: 'Small',
    maxSize: '2GB'
  },
  {
    id: 'balanced' as const,
    name: 'Balanced',
    description: 'Good balance of quality and performance',
    sizePreference: 'Medium',
    maxSize: '4GB'
  }
])

// Methods
const getStrategyIcon = (strategyId: string) => {
  const icons = {
    'user-selected': User,
    'smallest': Minimize,
    'fastest': Zap,
    'balanced': Scale
  }
  return icons[strategyId as keyof typeof icons] || Gauge
}

const getModelDisplayName = (modelId: string): string => {
  const model = props.availableModels.find(m => m.id === modelId)
  return model?.name || modelId
}

const getModelDescription = (modelId: string): string => {
  const model = props.availableModels.find(m => m.id === modelId)
  return model?.description || 'AI model for text generation'
}

const getModelSize = (modelId: string): string => {
  const model = props.availableModels.find(m => m.id === modelId)
  return model ? getModelCategory(model.downloadSize) : 'unknown'
}

const getModelDownloadSize = (modelId: string): string => {
  const model = props.availableModels.find(m => m.id === modelId)
  return model?.downloadSize || 'Unknown size'
}

const getModelCategory = (downloadSize: string): string => {
  const sizeMatch = downloadSize.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/)
  if (sizeMatch) {
    const value = parseFloat(sizeMatch[1])
    const unit = sizeMatch[2]
    const sizeInGB = unit === 'GB' ? value : value / 1024
    
    if (sizeInGB <= 2) return 'small'
    if (sizeInGB <= 6) return 'medium'
    return 'large'
  }
  return 'unknown'
}

const getSizeBadgeVariant = (size: string) => {
  switch (size) {
    case 'small': return 'default'
    case 'medium': return 'secondary'
    case 'large': return 'outline'
    default: return 'outline'
  }
}

const isModelDownloaded = (modelId: string): boolean => {
  return props.downloadedModels.includes(modelId)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

const setAsDefault = (model: WebLLMModelInfo) => {
  webLLMDefaultModelService.setUserDefaultModel(model.id)
  config.value = webLLMDefaultModelService.getDefaultModelConfig()
  
  logger.info(`Set default model: ${model.id}`)
  emit('model-selected', model.id)
}

const clearDefaultModel = () => {
  webLLMDefaultModelService.saveDefaultModelConfig({
    modelId: '',
    userSelectedModel: '',
    autoLoadStrategy: 'smallest'
  })
  
  config.value = webLLMDefaultModelService.getDefaultModelConfig()
  
  toast({
    title: 'Default Cleared',
    description: 'No default model is set. WebLLM will use automatic selection.',
    variant: 'default'
  })
}

const updateAutoLoad = (enabled: boolean) => {
  webLLMDefaultModelService.saveDefaultModelConfig({
    autoLoadOnRequest: enabled
  })
  
  config.value = webLLMDefaultModelService.getDefaultModelConfig()
  
  toast({
    title: enabled ? 'Auto-load Enabled' : 'Auto-load Disabled',
    description: enabled 
      ? 'Models will automatically load when AI assistance is needed'
      : 'You will need to manually load models before using AI features',
    variant: 'default'
  })
}

const updateStrategy = (strategyId: DefaultModelConfig['autoLoadStrategy']) => {
  webLLMDefaultModelService.saveDefaultModelConfig({
    autoLoadStrategy: strategyId
  })
  
  config.value = webLLMDefaultModelService.getDefaultModelConfig()
  
  toast({
    title: 'Strategy Updated',
    description: `Auto-load strategy set to: ${strategies.value.find(s => s.id === strategyId)?.name}`,
    variant: 'default'
  })
}

const refreshModels = () => {
  emit('refresh-models')
}

const handleQuickSetupComplete = (modelId: string) => {
  showQuickSetup.value = false
  config.value = webLLMDefaultModelService.getDefaultModelConfig()
  emit('model-selected', modelId)
}

const handlePreviewModel = (model: WebLLMModelInfo) => {
  emit('preview-model', model)
}

// Watch for external config changes
watch(() => props.currentModel, () => {
  config.value = webLLMDefaultModelService.getDefaultModelConfig()
}, { immediate: true })

onMounted(() => {
  // Check if user has completed setup
  if (!webLLMDefaultModelService.hasCompletedQuickSetup() && props.availableModels.length > 0) {
    // Auto-show quick setup for new users
    setTimeout(() => {
      showQuickSetup.value = true
    }, 1000)
  }
})
</script> 