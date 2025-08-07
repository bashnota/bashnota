<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Cpu, Settings, Sparkles, Download, CheckCircle2 } from 'lucide-vue-next'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import ModelSelectionDialog from './ModelSelectionDialog.vue'
import { toast } from 'vue-sonner'

interface Props {
  providerId: string
  providerName: string
}

const props = defineProps<Props>()

const { 
  fetchGeminiModels,
  fetchWebLLMModels,
  currentWebLLMModel
} = useAIProviders()

const aiSettings = useAISettingsStore()

// Local state
const showModelDialog = ref(false)
const selectedModel = ref('')

// Computed
const isGemini = computed(() => props.providerId === 'gemini')
const isWebLLM = computed(() => props.providerId === 'webllm')
const isOllama = computed(() => props.providerId === 'ollama')

const currentModelId = computed(() => {
  if (isGemini.value) return aiSettings.settings.geminiModel
  if (isWebLLM.value) return aiSettings.settings.webllmModel
  if (isOllama.value) return aiSettings.settings.ollamaModel
  return ''
})

const currentModelName = computed(() => {
  const modelId = currentModelId.value
  if (!modelId) return 'No model selected'
  
  // For display purposes, format the model ID nicely
  if (isGemini.value) {
    return modelId.replace('gemini-', 'Gemini ').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  if (isWebLLM.value) {
    return modelId.replace(/-/g, ' ').replace(/q\d+f\d+_\d+/, '').replace(/MLC$/, '').trim()
  }
  return modelId
})

const modelStatus = computed(() => {
  if (!currentModelId.value) return { text: 'Not selected', variant: 'outline' as const }
  
  if (isWebLLM.value) {
    if (currentModelId.value === currentWebLLMModel.value) {
      return { text: 'Loaded & Ready', variant: 'default' as const }
    }
    return { text: 'Selected', variant: 'secondary' as const }
  }
  
  return { text: 'Selected', variant: 'default' as const }
})

// Methods
const openModelDialog = () => {
  showModelDialog.value = true
}

const handleModelSelected = (modelId: string) => {
  selectedModel.value = modelId
  toast.success(`Model changed to ${modelId}`)
}

// Initialize
onMounted(() => {
  // Set initial selected model from settings
  if (isGemini.value) {
    selectedModel.value = aiSettings.settings.geminiModel || 'gemini-1.5-pro'
  } else if (isWebLLM.value) {
    selectedModel.value = aiSettings.settings.webllmModel || ''
  } else if (isOllama.value) {
    selectedModel.value = aiSettings.settings.ollamaModel || 'llama2'
  }
})

// Watch for provider changes
watch(() => props.providerId, () => {
  if (isGemini.value) {
    selectedModel.value = aiSettings.settings.geminiModel || 'gemini-1.5-pro'
  } else if (isWebLLM.value) {
    selectedModel.value = aiSettings.settings.webllmModel || ''
  } else if (isOllama.value) {
    selectedModel.value = aiSettings.settings.ollamaModel || 'llama2'
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <component :is="isGemini ? Sparkles : isWebLLM ? Download : Cpu" class="h-5 w-5" />
        {{ providerName }} Model
      </CardTitle>
      <CardDescription>
        Configure the AI model for {{ providerName }}
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Current Model Display -->
      <div class="space-y-3">
        <Label>Current Model</Label>
        <div class="p-4 rounded-lg border bg-muted/50">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-background">
                <component :is="isGemini ? Sparkles : isWebLLM ? Download : Cpu" class="h-4 w-4" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ currentModelName }}</span>
                  <Badge :variant="modelStatus.variant" class="text-xs">
                    {{ modelStatus.text }}
                  </Badge>
                </div>
                <div class="text-sm text-muted-foreground">
                  {{ currentModelId || 'No model selected' }}
                </div>
              </div>
            </div>
            
            <Button @click="openModelDialog" variant="outline" size="sm">
              <Settings class="w-4 h-4 mr-1" />
              {{ currentModelId ? 'Change Model' : 'Select Model' }}
            </Button>
          </div>
        </div>
      </div>

      <!-- WebLLM Status -->
      <div v-if="isWebLLM && currentWebLLMModel" class="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
        <div class="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 class="h-4 w-4" />
          <span><strong>{{ currentWebLLMModel }}</strong> is loaded and ready to use</span>
        </div>
      </div>

      <!-- Ollama Custom Model Input -->
      <div v-if="isOllama" class="space-y-3">
        <Label>Custom Model Name</Label>
        <div class="space-y-2">
          <input
            :value="currentModelId"
            @input="(e: any) => aiSettings.updateSettings({ ollamaModel: e.target.value })"
            placeholder="e.g., llama2, codellama, mistral"
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p class="text-xs text-muted-foreground">
            Enter the name of a model installed on your Ollama server
          </p>
        </div>
      </div>
    </CardContent>

    <!-- Model Selection Dialog -->
    <ModelSelectionDialog
      v-model:open="showModelDialog"
      :provider-id="providerId"
      :provider-name="providerName"
      @model-selected="handleModelSelected"
    />
  </Card>
</template>