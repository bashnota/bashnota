<template>
  <Dialog :open="isOpen" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-7xl max-h-[90vh] w-[98vw] p-0 overflow-hidden rounded-lg border-0 flex flex-col">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 flex-shrink-0">
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Globe class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <DialogTitle class="text-xl font-semibold text-blue-900 dark:text-blue-100">
              WebLLM Settings
            </DialogTitle>
            <DialogDescription class="text-blue-700 dark:text-blue-300">
              Configure your local AI models and browser settings
            </DialogDescription>
          </div>
        </div>
        
        <!-- Quick Status Badges -->
        <div class="flex items-center space-x-2">
          <Badge v-if="isCompatible" variant="default" class="bg-green-100 text-green-800 border-green-300">
            <CheckCircle class="h-3 w-3 mr-1" />
            Compatible
          </Badge>
          <Badge v-else variant="destructive">
            <AlertTriangle class="h-3 w-3 mr-1" />
            Incompatible
          </Badge>
          
          <DialogClose as-child>
            <Button variant="ghost" size="sm" class="text-blue-600 hover:text-blue-700">
              <X class="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>
      </div>

      <!-- Modal Content -->
      <div class="flex-1 overflow-y-auto min-h-0">
        <div class="p-6">
          <!-- Embedded WebLLM Settings Content Only -->
          <WebLLMProviderSettingsContent 
            @model-loaded="handleModelLoaded"
            @settings-saved="handleSettingsSaved"
          />
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-between p-4 border-t bg-muted/30 flex-shrink-0">
        <div class="text-sm text-muted-foreground">
          Changes are saved automatically
        </div>
        <div class="flex items-center space-x-3">
          <Button 
            variant="outline" 
            @click="$emit('update:open', false)"
          >
            Close
          </Button>
          <Button 
            @click="handleDone"
            class="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CheckCircle class="h-4 w-4 mr-2" />
            Done
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/ui/dialog'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { toast } from '@/ui/toast'
import { 
  Globe, 
  CheckCircle, 
  AlertTriangle,
  X
} from 'lucide-vue-next'
import WebLLMProviderSettingsContent from './WebLLMProviderSettingsContent.vue'

// Props
interface Props {
  open: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean]
  'model-loaded': [modelId: string]
  'settings-saved': []
}>()

// Local state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

// Browser compatibility check
const isCompatible = ref(true)

const checkCompatibility = async () => {
  try {
    // Basic WebGL check
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    const webGLSupported = !!gl
    
    // WebAssembly check
    const wasmSupported = typeof WebAssembly === 'object'
    
    // WebGPU check (if available)
    const webGPUSupported = 'gpu' in navigator
    
    isCompatible.value = webGLSupported && wasmSupported
  } catch (error) {
    isCompatible.value = false
  }
}

// Event handlers
const handleModelLoaded = (modelId: string) => {
  emit('model-loaded', modelId)
  toast({
    title: 'Model Loaded',
    description: `${modelId} is now ready for use`,
    variant: 'default'
  })
}

const handleSettingsSaved = () => {
  emit('settings-saved')
  toast({
    title: 'Settings Saved',
    description: 'WebLLM configuration has been updated',
    variant: 'default'
  })
}

const handleDone = () => {
  emit('update:open', false)
  toast({
    title: 'WebLLM Configured',
    description: 'Your AI models are ready to use',
    variant: 'default'
  })
}

// Initialize
onMounted(() => {
  checkCompatibility()
})
</script> 