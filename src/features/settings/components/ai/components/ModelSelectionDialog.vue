<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Zap, 
  Download, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  Eye,
  Filter
} from 'lucide-vue-next'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import type { GeminiModelInfo, WebLLMModelInfo } from '@/features/ai/services'
import { toast } from 'vue-sonner'

interface Props {
  providerId: string
  providerName: string
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'model-selected': [modelId: string]
}>()

const { 
  geminiModels, 
  webLLMModels, 
  isLoadingGeminiModels, 
  isLoadingWebLLMModels,
  fetchGeminiModels,
  fetchWebLLMModels,
  loadWebLLMModel,
  currentWebLLMModel
} = useAIProviders()

const aiSettings = useAISettingsStore()

// Local state
const searchQuery = ref('')
const selectedModel = ref('')
const isLoadingModel = ref(false)
const activeCategory = ref('all')

// Computed
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const isGemini = computed(() => props.providerId === 'gemini')
const isWebLLM = computed(() => props.providerId === 'webllm')

const allModels = computed(() => {
  if (isGemini.value) return geminiModels.value
  if (isWebLLM.value) return webLLMModels.value
  return []
})

const isLoading = computed(() => {
  if (isGemini.value) return isLoadingGeminiModels.value
  if (isWebLLM.value) return isLoadingWebLLMModels.value
  return false
})

const filteredModels = computed(() => {
  let models: (GeminiModelInfo | WebLLMModelInfo)[] = allModels.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    models = models.filter(model => 
      model.name.toLowerCase().includes(query) ||
      model.description.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query)
    ) as (GeminiModelInfo | WebLLMModelInfo)[]
  }

  // Filter by category for WebLLM
  if (isWebLLM.value && activeCategory.value !== 'all') {
    models = models.filter(model => {
      const webModel = model as WebLLMModelInfo
      if (activeCategory.value === 'small') return webModel.size && (webModel.size.includes('1B') || webModel.size.includes('3B'))
      if (activeCategory.value === 'medium') return webModel.size && (webModel.size.includes('7B') || webModel.size.includes('8B'))
      if (activeCategory.value === 'large') return webModel.size && (webModel.size.includes('13B') || webModel.size.includes('70B'))
      if (activeCategory.value === 'instruct') return model.id.includes('Instruct')
      return true
    }) as (GeminiModelInfo | WebLLMModelInfo)[]
  }

  return models
})

const currentModelInfo = computed(() => {
  if (!selectedModel.value) return null
  return allModels.value.find(model => model.id === selectedModel.value)
})

// Methods
const selectModel = async () => {
  if (!selectedModel.value) return

  try {
    // Update settings based on provider
    if (isGemini.value) {
      aiSettings.updateSettings({ geminiModel: selectedModel.value })
    } else if (isWebLLM.value) {
      aiSettings.updateSettings({ webllmModel: selectedModel.value })
      
      // Load WebLLM model if it's not already loaded
      if (selectedModel.value !== currentWebLLMModel.value) {
        await loadModel(selectedModel.value)
      }
    }

    emit('model-selected', selectedModel.value)
    emit('update:open', false)
    
    const modelName = allModels.value.find(m => m.id === selectedModel.value)?.name
    toast.success(`Selected ${modelName}`)
  } catch (error) {
    console.error('Error selecting model:', error)
    toast.error('Failed to select model')
  }
}

const loadModel = async (modelId: string) => {
  if (!isWebLLM.value) return
  
  isLoadingModel.value = true
  try {
    await loadWebLLMModel(modelId)
    toast.success(`${modelId} loaded successfully`)
  } catch (error) {
    console.error('Error loading WebLLM model:', error)
    toast.error(`Failed to load ${modelId}`)
  } finally {
    isLoadingModel.value = false
  }
}

const refreshModels = async () => {
  try {
    if (isGemini.value) {
      await fetchGeminiModels()
    } else if (isWebLLM.value) {
      await fetchWebLLMModels()
    }
    toast.success('Models refreshed')
  } catch (error) {
    console.error('Error refreshing models:', error)
    toast.error('Failed to refresh models')
  }
}

const selectModelFromTable = (modelId: string) => {
  selectedModel.value = modelId
  selectModel()
}

// Initialize
onMounted(() => {
  // Set initial selected model from settings
  if (isGemini.value) {
    selectedModel.value = aiSettings.settings.geminiModel || 'gemini-1.5-pro'
  } else if (isWebLLM.value) {
    selectedModel.value = aiSettings.settings.webllmModel || ''
  }
})

// Watch for dialog opening to fetch models
watch(() => props.open, async (newValue) => {
  if (newValue) {
    console.log(`[ModelSelectionDialog] Opening dialog for ${props.providerId}`)
    await refreshModels()
    
    // Debug: Log model counts
    if (isGemini.value) {
      console.log(`[ModelSelectionDialog] Gemini models loaded: ${geminiModels.value.length}`)
    } else if (isWebLLM.value) {
      console.log(`[ModelSelectionDialog] WebLLM models loaded: ${webLLMModels.value.length}`)
    }
  }
})
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <component :is="isGemini ? Sparkles : isWebLLM ? Download : Filter" class="h-5 w-5" />
          Select {{ providerName }} Model
        </DialogTitle>
        <DialogDescription>
          Choose the AI model that best fits your needs
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 flex flex-col space-y-4 overflow-hidden">
        <!-- Search and Controls -->
        <div class="flex items-center gap-4">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search models by name, size, or type..."
              class="pl-10"
            />
          </div>

          <!-- WebLLM Size Filter -->
          <div v-if="isWebLLM" class="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              :class="{ 'bg-primary text-primary-foreground': activeCategory === 'all' }"
              @click="activeCategory = 'all'"
            >
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="{ 'bg-primary text-primary-foreground': activeCategory === 'small' }"
              @click="activeCategory = 'small'"
            >
              Small
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="{ 'bg-primary text-primary-foreground': activeCategory === 'medium' }"
              @click="activeCategory = 'medium'"
            >
              Medium
            </Button>
            <Button
              variant="outline"
              size="sm"
              :class="{ 'bg-primary text-primary-foreground': activeCategory === 'large' }"
              @click="activeCategory = 'large'"
            >
              Large
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            @click="refreshModels"
            :disabled="isLoading"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 mr-1 animate-spin" />
            Refresh
          </Button>
        </div>

        <!-- Models Table -->
        <div class="flex-1 border rounded-lg overflow-hidden flex flex-col">
          <!-- Table Header (Fixed) -->
          <div class="border-b bg-muted/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-12 h-10"></TableHead>
                  <TableHead class="h-10">Model Name</TableHead>
                  <TableHead v-if="isGemini" class="h-10">Context Length</TableHead>
                  <TableHead v-if="isGemini" class="h-10">Features</TableHead>
                  <TableHead v-if="isWebLLM" class="h-10">Size</TableHead>
                  <TableHead v-if="isWebLLM" class="h-10">Download</TableHead>
                  <TableHead v-if="isWebLLM" class="h-10">Type</TableHead>
                  <TableHead v-if="isWebLLM" class="h-10">Status</TableHead>
                  <TableHead class="w-24 h-10">Action</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>

          <!-- Scrollable Table Body -->
          <ScrollArea class="flex-1">
            <Table>
              <TableBody>
                <!-- Loading State -->
                <TableRow v-if="isLoading">
                  <TableCell :colspan="isGemini ? 5 : 8" class="text-center py-12">
                    <div class="flex items-center justify-center gap-2">
                      <Loader2 class="w-6 h-6 animate-spin" />
                      <span>Loading {{ providerName }} models...</span>
                    </div>
                  </TableCell>
                </TableRow>

                <!-- No Models State -->
                <TableRow v-else-if="filteredModels.length === 0">
                  <TableCell :colspan="isGemini ? 5 : 8" class="text-center py-12 text-muted-foreground">
                    <div>
                      <p class="font-medium">No models found</p>
                      <p class="text-sm">Try adjusting your search or refresh the list</p>
                    </div>
                  </TableCell>
                </TableRow>

                <!-- Models Rows -->
                <TableRow 
                  v-else
                  v-for="model in filteredModels" 
                  :key="model.id"
                  class="cursor-pointer hover:bg-muted/50 transition-colors"
                  @click="selectModelFromTable(model.id)"
                >
                  <!-- Selection Indicator -->
                  <TableCell class="text-center w-12">
                    <CheckCircle2 
                      v-if="model.id === (isGemini ? aiSettings.settings.geminiModel : aiSettings.settings.webllmModel)" 
                      class="h-4 w-4 text-primary mx-auto" 
                    />
                  </TableCell>

                  <!-- Model Name -->
                  <TableCell>
                    <div class="space-y-1">
                      <div class="font-medium">{{ model.name }}</div>
                      <div class="text-xs text-muted-foreground">{{ model.id }}</div>
                    </div>
                  </TableCell>

                  <!-- Gemini-specific columns -->
                  <template v-if="isGemini">
                    <!-- Context Length -->
                    <TableCell>
                      <div class="flex items-center gap-1">
                        <Zap class="h-3 w-3" />
                        <span class="text-sm">{{ (model as GeminiModelInfo).maxTokens?.toLocaleString() ?? 'N/A' }}</span>
                      </div>
                    </TableCell>
                    
                    <!-- Features -->
                    <TableCell>
                      <div class="flex gap-1">
                        <Badge v-if="(model as GeminiModelInfo).supportsImages" variant="secondary" class="text-xs">
                          <Eye class="w-3 h-3 mr-1" />
                          Multimodal
                        </Badge>
                      </div>
                    </TableCell>
                  </template>

                  <!-- WebLLM-specific columns -->
                  <template v-if="isWebLLM">
                    <!-- Size -->
                    <TableCell>
                      <Badge variant="outline" class="text-xs">
                        {{ (model as WebLLMModelInfo).size ?? 'Unknown' }}
                      </Badge>
                    </TableCell>
                    
                    <!-- Download Size -->
                    <TableCell>
                      <span class="text-sm text-muted-foreground">
                        {{ (model as WebLLMModelInfo).downloadSize ?? 'Unknown' }}
                      </span>
                    </TableCell>
                    
                    <!-- Type -->
                    <TableCell>
                      <Badge v-if="model.id.includes('Instruct')" variant="secondary" class="text-xs">
                        <Sparkles class="w-3 h-3 mr-1" />
                        Instruct
                      </Badge>
                      <span v-else class="text-sm text-muted-foreground">Base</span>
                    </TableCell>
                    
                    <!-- Status -->
                    <TableCell>
                      <div v-if="model.id === currentWebLLMModel" class="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span class="text-xs">Loaded</span>
                      </div>
                      <span v-else class="text-xs text-muted-foreground">Ready</span>
                    </TableCell>
                  </template>

                  <!-- Action -->
                  <TableCell class="w-24">
                    <Button 
                      size="sm" 
                      variant="outline"
                      class="text-xs h-7"
                      @click.stop="selectModelFromTable(model.id)"
                    >
                      Select
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <!-- Action Bar -->
        <div class="flex items-center justify-between pt-4 border-t">
          <div class="text-sm text-muted-foreground">
            {{ filteredModels.length }} model{{ filteredModels.length !== 1 ? 's' : '' }} available
          </div>
          <div class="flex gap-2">
            <Button variant="outline" @click="isOpen = false">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>