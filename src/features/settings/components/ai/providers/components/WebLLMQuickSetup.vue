<template>
  <div class="space-y-6">
    <!-- Quick Setup Header -->
    <div class="text-center space-y-3">
      <div class="flex justify-center">
        <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
          <Zap class="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <h2 class="text-xl font-semibold">Quick WebLLM Setup</h2>
      <p class="text-sm text-muted-foreground max-w-md mx-auto">
        Choose your preferred AI model setup. We'll automatically select and configure the best model for your needs.
      </p>
    </div>

    <!-- Preset Selection Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="preset in presets"
        :key="preset.id"
        :class="[
          'relative p-6 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md',
          selectedPreset?.id === preset.id
            ? 'border-primary bg-primary/5 shadow-md'
            : 'border-border hover:border-primary/50'
        ]"
        @click="selectedPreset = preset"
      >
        <!-- Selection Indicator -->
        <div
          v-if="selectedPreset?.id === preset.id"
          class="absolute top-3 right-3 p-1 bg-primary rounded-full"
        >
          <Check class="h-3 w-3 text-primary-foreground" />
        </div>

        <!-- Preset Content -->
        <div class="space-y-3">
          <!-- Icon and Title -->
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-muted rounded-lg">
              <component :is="getIconComponent(preset.icon)" class="h-5 w-5 text-primary" />
            </div>
            <h3 class="font-medium">{{ preset.name }}</h3>
          </div>

          <!-- Description -->
          <p class="text-sm text-muted-foreground">
            {{ preset.description }}
          </p>

          <!-- Technical Details -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Model Size:</span>
              <Badge :variant="getSizeBadgeVariant(preset.criteria.preferredSize)">
                {{ preset.criteria.preferredSize.toUpperCase() }}
              </Badge>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Max Download:</span>
              <span class="font-medium">{{ preset.criteria.maxDownloadSize }}GB</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Quality:</span>
              <div class="flex">
                <Star
                  v-for="i in 3"
                  :key="i"
                  :class="[
                    'h-3 w-3',
                    i <= getQualityStars(preset.id) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  ]"
                />
              </div>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Speed:</span>
              <div class="flex">
                <Zap
                  v-for="i in 3"
                  :key="i"
                  :class="[
                    'h-3 w-3',
                    i <= getSpeedLevel(preset.id) ? 'text-green-400 fill-current' : 'text-gray-300'
                  ]"
                />
              </div>
            </div>
          </div>

          <!-- Recommended Badge -->
          <div v-if="preset.id === 'balanced'" class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Badge class="bg-blue-600 text-white px-2 py-1 text-xs">
              Recommended
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Model Preview -->
    <div v-if="selectedPreset && recommendedModel" class="p-4 bg-muted/50 rounded-lg">
      <div class="flex items-start justify-between">
        <div class="space-y-2">
          <h4 class="font-medium text-sm">Selected Model</h4>
          <div class="space-y-1">
            <p class="font-medium">{{ recommendedModel.name || recommendedModel.id }}</p>
            <p class="text-sm text-muted-foreground">{{ recommendedModel.description || 'AI model for text generation' }}</p>
          </div>
        </div>
        <div class="text-right space-y-1">
          <Badge :variant="getSizeBadgeVariant(getModelCategory(recommendedModel.downloadSize))">
            {{ recommendedModel.downloadSize }}
          </Badge>
          <div class="text-xs text-muted-foreground">
            Download size
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex justify-between items-center pt-4">
      <Button
        variant="outline"
        @click="$emit('skip')"
        :disabled="isSettingUp"
      >
        Skip Setup
      </Button>
      
      <div class="flex gap-2">
        <Button
          v-if="selectedPreset"
          variant="outline"
          @click="previewModel"
          :disabled="isSettingUp || !recommendedModel"
        >
          <Eye class="h-4 w-4 mr-2" />
          Preview Model
        </Button>
        
        <Button
          @click="setupWithSelected"
          :disabled="!selectedPreset || isSettingUp"
        >
          <template v-if="!isSettingUp">
            <Download class="h-4 w-4 mr-2" />
            Set Up {{ selectedPreset?.name }}
          </template>
          <template v-else>
            <Loader2 class="h-4 w-4 mr-2 animate-spin" />
            Setting Up...
          </template>
        </Button>
      </div>
    </div>

    <!-- Setup Progress -->
    <div v-if="isSettingUp" class="space-y-3">
      <div class="flex items-center justify-between text-sm">
        <span class="font-medium">Setup Progress</span>
        <span>{{ setupProgress }}%</span>
      </div>
      <div class="w-full bg-muted rounded-full h-2">
        <div 
          class="bg-primary h-2 rounded-full transition-all duration-300" 
          :style="{ width: `${setupProgress}%` }"
        ></div>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ setupStatusText }}
      </p>
    </div>

    <!-- Setup Error -->
    <Alert v-if="setupError" variant="destructive">
      <AlertTriangle class="h-4 w-4" />
      <AlertDescription>
        {{ setupError }}
      </AlertDescription>
    </Alert>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Alert, AlertDescription } from '@/ui/alert'
import { 
  Zap, 
  Scale, 
  Crown, 
  Check, 
  Star, 
  Eye, 
  Download, 
  Loader2, 
  AlertTriangle 
} from 'lucide-vue-next'
import { webLLMDefaultModelService } from '@/features/ai/services/webLLMDefaultModelService'
import type { QuickSetupPreset } from '@/features/ai/services/webLLMDefaultModelService'
import type { WebLLMModelInfo } from '@/features/ai/services/types'
import { toast } from '@/ui/toast'
import { logger } from '@/services/logger'

interface Props {
  availableModels: WebLLMModelInfo[]
  isLoading?: boolean
}

interface Emits {
  'setup-complete': [modelId: string, preset: QuickSetupPreset]
  'skip': []
  'preview-model': [model: WebLLMModelInfo]
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false
})

const emit = defineEmits<Emits>()

// State
const selectedPreset = ref<QuickSetupPreset | null>(null)
const isSettingUp = ref(false)
const setupProgress = ref(0)
const setupStatusText = ref('')
const setupError = ref('')

// Computed
const presets = computed(() => webLLMDefaultModelService.getQuickSetupPresets())

const recommendedModel = computed(() => {
  if (!selectedPreset.value || props.availableModels.length === 0) return null
  
  return webLLMDefaultModelService.selectBestDefaultModel(
    props.availableModels, 
    selectedPreset.value.criteria
  )
})

// Methods
const getIconComponent = (iconName: string) => {
  const icons = { Zap, Scale, Crown }
  return icons[iconName as keyof typeof icons] || Zap
}

const getSizeBadgeVariant = (size: string) => {
  switch (size) {
    case 'small': return 'default'
    case 'medium': return 'secondary'
    case 'large': return 'outline'
    default: return 'outline'
  }
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

const getQualityStars = (presetId: string): number => {
  switch (presetId) {
    case 'fastest': return 1
    case 'balanced': return 2
    case 'quality': return 3
    default: return 1
  }
}

const getSpeedLevel = (presetId: string): number => {
  switch (presetId) {
    case 'fastest': return 3
    case 'balanced': return 2
    case 'quality': return 1
    default: return 2
  }
}

const previewModel = () => {
  if (recommendedModel.value) {
    emit('preview-model', recommendedModel.value)
  }
}

const setupWithSelected = async () => {
  if (!selectedPreset.value || !recommendedModel.value) return
  
  isSettingUp.value = true
  setupProgress.value = 0
  setupError.value = ''
  setupStatusText.value = 'Initializing setup...'
  
  try {
    // Simulate setup progress
    const progressSteps = [
      { progress: 20, text: 'Validating model selection...' },
      { progress: 40, text: 'Configuring default settings...' },
      { progress: 60, text: 'Preparing model configuration...' },
      { progress: 80, text: 'Saving preferences...' },
      { progress: 100, text: 'Setup complete!' }
    ]
    
    for (const step of progressSteps) {
      setupProgress.value = step.progress
      setupStatusText.value = step.text
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Perform actual setup
    const result = await webLLMDefaultModelService.setupWithPreset(
      selectedPreset.value,
      props.availableModels
    )
    
    if (result.success && result.modelId) {
      logger.info(`Quick setup completed with model: ${result.modelId}`)
      
      toast({
        title: 'Setup Complete!',
        description: `${selectedPreset.value.name} configuration saved. ${recommendedModel.value.name || result.modelId} will auto-load when needed.`,
        variant: 'default'
      })
      
      emit('setup-complete', result.modelId, selectedPreset.value)
    } else {
      throw new Error(result.error || 'Setup failed')
    }
    
  } catch (error) {
    logger.error('Quick setup failed:', error)
    setupError.value = error instanceof Error ? error.message : 'Setup failed. Please try again.'
  } finally {
    isSettingUp.value = false
  }
}

// Auto-select balanced preset by default
onMounted(() => {
  const balancedPreset = presets.value.find(p => p.id === 'balanced')
  if (balancedPreset) {
    selectedPreset.value = balancedPreset
  }
})

// Watch for preset changes to update status
watch(selectedPreset, (newPreset) => {
  setupError.value = ''
  if (newPreset) {
    logger.info(`Selected preset: ${newPreset.name}`)
  }
})
</script> 