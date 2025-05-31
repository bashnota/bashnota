<template>
  <BaseProviderSettings
    title="Google Gemini"
    description="Configure Google's Gemini AI models"
    :icon="SparklesIcon"
    provider-id="gemini"
    test-button-text="Test API Key"
    @save="handleSave"
    @test="handleTest"
    @refresh="handleRefresh"
  >
    <template #content="{ props }">
      <div class="space-y-6">
        <!-- API Key Section -->
        <ApiKeySection
          v-model="apiKey"
          provider-id="gemini"
          provider-name="Gemini"
          instructions="Available from Google AI Studio at https://makersuite.google.com/app/apikey"
          :show-status="true"
          :is-valid="isConnected"
          :last-validated="lastValidated || undefined"
          @change="handleApiKeyChange"
          @paste="handleApiKeyPaste"
          @clear="handleApiKeyClear"
        />

        <!-- Connection Status -->
        <ConnectionStatus
          :state="connectionState"
          provider-name="Google Gemini"
          :error="connectionError || undefined"
          :last-tested="lastValidated || undefined"
          @retry="handleTest"
        />

        <!-- Model Selection (disabled if not connected) -->
        <div :class="{ 'opacity-50 pointer-events-none': !isConnected }">
          <ModelSelector
            v-model="selectedModelId"
            :models="models"
            :categorized-models="categorizedModels"
            provider-id="gemini"
            provider-name="Gemini"
            help-text="Select the specific Gemini model to use for AI text generation."
            :show-categories="false"
            :is-loading="isLoading"
            :disabled="!isConnected"
            @change="handleModelChange"
            @refresh="handleRefresh"
          />

          <!-- Model Token Information -->
          <div v-if="selectedModel" class="mt-2 text-xs text-gray-500">
            Token limit: {{ selectedModel.maxTokens?.toLocaleString() || 'Unknown' }} tokens
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
            <!-- Safety Threshold -->
            <div class="space-y-2">
              <Label for="safety-threshold">Safety Threshold</Label>
              <Select v-model="safetyThreshold">
                <SelectTrigger>
                  <SelectValue placeholder="Select safety threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLOCK_NONE">Block None</SelectItem>
                  <SelectItem value="BLOCK_ONLY_HIGH">Block Only High</SelectItem>
                  <SelectItem value="BLOCK_MEDIUM_AND_ABOVE">Block Medium and Above (Recommended)</SelectItem>
                  <SelectItem value="BLOCK_LOW_AND_ABOVE">Block Low and Above</SelectItem>
                </SelectContent>
              </Select>
              <p class="text-xs text-gray-500">
                Configure content filtering for safety. Recommended setting blocks medium and high-risk content.
              </p>
            </div>

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
                <Label class="text-xs">Max Tokens ({{ maxTokens[0] }})</Label>
                <Slider
                  v-model="maxTokens"
                  :min="100"
                  :max="4000"
                  :step="100"
                  class="mt-2"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Maximum response length
                </p>
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
import { SparklesIcon } from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import BaseProviderSettings from '../BaseProviderSettings.vue'
import ApiKeySection from '../components/ApiKeySection.vue'
import ModelSelector from '../components/ModelSelector.vue'
import ConnectionStatus from '../components/ConnectionStatus.vue'
import { useProviderSettings, type ModelInfo } from '../composables/useProviderSettings'
import { useAIProviders } from '@/components/sidebars/ai-assistant/composables/useAIProviders'
import type { ConnectionState } from '../components/ConnectionStatus.vue'

// Use the AI providers composable for API interactions
const aiProviders = useAIProviders()

// Configure the provider settings
const providerSettings = useProviderSettings({
  providerId: 'gemini',
  requiresApiKey: true,
  apiKeyInstructions: 'Available from Google AI Studio at https://makersuite.google.com/app/apikey',
  supportsModelSelection: true,
  connectionTestFn: async (): Promise<boolean> => {
    if (!providerSettings.apiKey.value) return false
    try {
      const models = await aiProviders.fetchGeminiModels()
      return !!(models && models.length > 0)
    } catch {
      return false
    }
  },
  modelsFetchFn: async (): Promise<ModelInfo[]> => {
    const geminiModels = await aiProviders.fetchGeminiModels()
    if (!geminiModels) return []
    
    return geminiModels.map((model): ModelInfo => ({
      id: model.id,
      name: model.name,
      description: model.description,
      maxTokens: model.maxTokens,
      supportsVision: false, // Remove this property if it doesn't exist on GeminiModelInfo
      category: getModelCategory(model.id)
    }))
  }
})

// Destructure what we need from the composable
const {
  apiKey,
  selectedModelId,
  selectedModel,
  models,
  categorizedModels,
  isConnected,
  isLoading,
  connectionError,
  handleApiKeyChange,
  handleApiKeyPaste,
  saveSettings,
  testConnection,
  loadModels
} = providerSettings

// Additional Gemini-specific settings
const showAdvanced = ref(false)
const safetyThreshold = ref('BLOCK_MEDIUM_AND_ABOVE')
const temperature = ref([0.7])
const maxTokens = ref([2048])
const lastValidated = ref<Date | null>(null)

// Computed
const connectionState = computed((): ConnectionState => {
  if (isLoading.value) return 'connecting'
  if (connectionError.value) return 'error'
  if (isConnected.value) return 'connected'
  return 'disconnected'
})

// Methods
const getModelCategory = (modelId: string): 'small' | 'medium' | 'large' | undefined => {
  if (modelId.includes('flash')) return 'small'
  if (modelId.includes('pro')) return 'medium'
  return undefined
}

const handleSave = async () => {
  await saveSettings()
}

const handleTest = async (): Promise<boolean> => {
  const result = await testConnection()
  if (result) {
    lastValidated.value = new Date()
  }
  return result
}

const handleRefresh = async () => {
  await loadModels()
}

const handleApiKeyClear = () => {
  // Clear logic handled by composable
}

const handleModelChange = (model: ModelInfo | null) => {
  // Model change logic handled by composable
}
</script> 