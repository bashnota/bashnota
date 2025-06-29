<template>
  <BaseProviderSettings
    title="Ollama"
    description="Configure local AI models using Ollama"
    :icon="ServerIcon"
    provider-id="ollama"
    test-button-text="Test Connection"
    @save="handleSave"
    @test="handleTest"
    @refresh="handleRefresh"
  >
    <template #content>
      <div class="space-y-6">
        <!-- Server URL Configuration -->
        <div class="space-y-2">
          <Label for="ollama-server-url">Ollama Server URL</Label>
          <div class="flex space-x-2">
            <Input
              id="ollama-server-url"
              v-model="customUrl"
              type="text"
              placeholder="http://localhost:11434"
              class="flex-1"
              @blur="handleUrlChange"
            />
            <Button 
              variant="outline" 
              @click="resetToDefault"
              class="whitespace-nowrap"
            >
              Reset
            </Button>
          </div>
          <p class="text-xs text-gray-500">
            Enter the URL of your Ollama server. Default is http://localhost:11434
          </p>
        </div>

        <!-- Connection Status -->
        <ConnectionStatus
          :state="connectionState"
          provider-name="Ollama"
          :error="connectionError || undefined"
          :last-tested="lastTested || undefined"
          @retry="handleTest"
        />

        <!-- Model Selection (disabled if not connected) -->
        <div :class="{ 'opacity-50 pointer-events-none': !isConnected }">
          <ModelSelector
            v-model="selectedModelId"
            :models="models"
            :categorized-models="categorizedModels"
            provider-id="ollama"
            provider-name="Ollama"
            help-text="Select an Ollama model to use for AI text generation. Models are downloaded and run locally."
            :show-categories="true"
            :is-loading="isLoading"
            :disabled="!isConnected"
            @change="handleModelChange"
            @refresh="handleRefresh"
          />

          <!-- Model Information -->
          <div v-if="selectedModel" class="mt-4 p-3 bg-blue-50 rounded-md">
            <div class="flex items-start justify-between">
              <div>
                <h4 class="font-medium text-blue-900">{{ selectedModel.name }}</h4>
                <p v-if="selectedModel.description" class="text-sm text-blue-700 mt-1">
                  {{ selectedModel.description }}
                </p>
              </div>
              <div class="text-right text-xs text-blue-600 space-y-1">
                <div v-if="selectedModel.size">
                  <Badge variant="outline" class="border-blue-300 text-blue-700">{{ selectedModel.size }}</Badge>
                </div>
                <div class="text-xs">Local Model</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Advanced Settings -->
        <div v-if="isConnected" class="space-y-4">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">Advanced Settings</Label>
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
                <Label class="text-xs">Temperature ({{ temperature[0].toFixed(1) }})</Label>
                <Slider
                  v-model="temperature"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  class="mt-2"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Controls randomness in responses
                </p>
              </div>
              <div>
                <Label class="text-xs">Top P ({{ topP[0].toFixed(2) }})</Label>
                <Slider
                  v-model="topP"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  class="mt-2"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Nucleus sampling parameter
                </p>
              </div>
            </div>

            <!-- Additional Options -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <Label class="text-sm">Keep Model in Memory</Label>
                  <p class="text-xs text-gray-500">Keep the model loaded for faster responses</p>
                </div>
                <Switch v-model="keepAlive" />
              </div>
              
              <div class="space-y-2">
                <Label class="text-xs">Context Length ({{ contextLength[0] }})</Label>
                <Slider
                  v-model="contextLength"
                  :min="1024"
                  :max="8192"
                  :step="512"
                  class="mt-2"
                />
                <p class="text-xs text-gray-500">
                  Maximum context window size
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Installation Help -->
        <div v-if="!isConnected" class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div class="flex items-start">
            <InfoIcon class="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 class="text-sm font-medium text-yellow-800">Ollama Not Running</h4>
              <div class="text-sm text-yellow-700 mt-1 space-y-2">
                <p>To use Ollama, you need to install and run it locally:</p>
                <ol class="list-decimal list-inside space-y-1 ml-2">
                  <li>Download Ollama from <a href="https://ollama.ai" target="_blank" class="underline">ollama.ai</a></li>
                  <li>Install and start the Ollama service</li>
                  <li>Pull a model: <code class="bg-yellow-100 px-1 rounded">ollama pull llama2</code></li>
                  <li>Click "Test Connection" above</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseProviderSettings>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ServerIcon, InfoIcon } from 'lucide-vue-next'
import { Label } from '@/ui/label'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Badge } from '@/ui/badge'
import { Slider } from '@/ui/slider'
import { Switch } from '@/ui/switch'
import BaseProviderSettings from '@/features/settings/components/ai/BaseProviderSettings.vue'
import ModelSelector from '@/features/settings/components/ai/components/ModelSelector.vue'
import ConnectionStatus from '@/features/settings/components/ai/components/ConnectionStatus.vue'
import { useProviderSettings, type ModelInfo } from '@/features/settings/components/ai/composables/useProviderSettings'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import type { ConnectionState } from '@/features/settings/components/ai/components/ConnectionStatus.vue'

// Configure the provider settings
const providerSettings = useProviderSettings({
  providerId: 'ollama',
  requiresApiKey: false,
  supportsModelSelection: true,
  supportsCustomUrl: true,
  defaultUrl: 'http://localhost:11434',
  connectionTestFn: async (): Promise<boolean> => {
    try {
      // Test connection to Ollama server
      const response = await fetch(`${providerSettings.customUrl.value}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      return response.ok
    } catch {
      return false
    }
  },
  modelsFetchFn: async (): Promise<ModelInfo[]> => {
    try {
      const response = await fetch(`${providerSettings.customUrl.value}/api/tags`)
      if (!response.ok) return []
      
      const data = await response.json()
      
      return (data.models || []).map((model: any): ModelInfo => ({
        id: model.name,
        name: model.name,
        description: `Size: ${formatBytes(model.size)}`,
        size: formatBytes(model.size),
        category: getModelCategory(model.name)
      }))
    } catch {
      return []
    }
  }
})

// Destructure what we need from the composable
const {
  selectedModelId,
  selectedModel,
  models,
  categorizedModels,
  isConnected,
  isLoading,
  connectionError,
  customUrl,
  saveSettings,
  testConnection,
  loadModels
} = providerSettings

// Ollama-specific settings
const showAdvanced = ref(false)
const temperature = ref([0.7])
const topP = ref([0.9])
const keepAlive = ref(true)
const contextLength = ref([4096])
const lastTested = ref<Date | null>(null)

// Computed
const connectionState = computed((): ConnectionState => {
  if (isLoading.value) return 'connecting'
  if (connectionError.value) return 'error'
  if (isConnected.value) return 'connected'
  return 'disconnected'
})

// Methods
const getModelCategory = (modelId: string): 'small' | 'medium' | 'large' | undefined => {
  const name = modelId.toLowerCase()
  if (name.includes('7b') || name.includes('8b')) return 'medium'
  if (name.includes('13b') || name.includes('30b') || name.includes('70b')) return 'large'
  if (name.includes('3b') || name.includes('1b') || name.includes('0.5b')) return 'small'
  return undefined
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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
}

const handleUrlChange = () => {
  // URL change triggers automatic revalidation through the composable
}

const resetToDefault = () => {
  customUrl.value = 'http://localhost:11434'
}

const handleModelChange = (model: ModelInfo | null) => {
  // Model change logic handled by composable
}
</script> 








