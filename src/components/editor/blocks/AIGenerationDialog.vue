<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { SparklesIcon, LoaderIcon } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  initialPrompt?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'generate': [prompt: string]
}>()

const aiSettings = useAISettingsStore()
const isLoading = ref(false)
const prompt = ref(props.initialPrompt || '')
const showAdvanced = ref(false)
const showAIDialog = ref(false)

const selectedProvider = computed(() => {
  return aiSettings.providers.find(p => p.id === aiSettings.settings.preferredProviderId)
})

const apiKeySet = computed(() => {
  const provider = selectedProvider.value
  if (!provider) return false
  if (!provider.requiresApiKey) return true
  return !!aiSettings.getApiKey(provider.id)
})

const toggleAdvanced = () => {
  showAdvanced.value = !showAdvanced.value
}

const handleGenerate = async () => {
  isLoading.value = true
  try {
    emit('generate', prompt.value)
    emit('update:open', false)
  } finally {
    isLoading.value = false
  }
}

const handleProviderChange = (providerId: string) => {
  aiSettings.setPreferredProvider(providerId)
}

const handleTemperatureChange = (value: number[]) => {
  aiSettings.updateSettings({ temperature: value[0] })
}

const handleMaxTokensChange = (value: number[]) => {
  aiSettings.updateSettings({ maxTokens: value[0] })
}

const formatTemperature = (temp: number) => {
  if (temp < 0.3) return 'More precise'
  if (temp > 0.7) return 'More creative'
  return 'Balanced'
}

const handleAIShortcut = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'g') {
    event.preventDefault()
    showAIDialog.value = true
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleAIShortcut)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleAIShortcut)
})
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="flex items-center">
          <SparklesIcon class="mr-2 h-5 w-5" /> AI Text Generation
        </DialogTitle>
        <DialogDescription>
          Generate text using AI models. Provide a prompt for the AI to follow.
        </DialogDescription>
      </DialogHeader>

      <div class="py-4 space-y-4">
        <div class="space-y-2">
          <Label for="ai-provider">AI Provider</Label>
          <Select :value="aiSettings.settings.preferredProviderId" @update:value="handleProviderChange">
            <SelectTrigger id="ai-provider">
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="provider in aiSettings.providers" :key="provider.id" :value="provider.id">
                {{ provider.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <div v-if="selectedProvider?.requiresApiKey && !apiKeySet" class="text-sm text-red-500">
            API key required. Please set it in AI settings.
          </div>
        </div>

        <div class="space-y-2">
          <Label for="prompt">Prompt</Label>
          <Textarea
            id="prompt"
            v-model="prompt"
            placeholder="Describe what you want the AI to generate..."
            rows="4"
            class="resize-y"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          class="w-full text-xs"
          @click="toggleAdvanced"
        >
          {{ showAdvanced ? 'Hide' : 'Show' }} Advanced Options
        </Button>

        <div v-if="showAdvanced" class="space-y-4">
          <div class="space-y-2">
            <div class="flex justify-between">
              <Label for="temperature">Temperature: {{ aiSettings.settings.temperature.toFixed(1) }}</Label>
              <span class="text-xs text-gray-500">{{ formatTemperature(aiSettings.settings.temperature) }}</span>
            </div>
            <Slider
              id="temperature"
              :value="[aiSettings.settings.temperature]"
              :min="0"
              :max="1"
              :step="0.1"
              @update:value="handleTemperatureChange"
            />
          </div>

          <div class="space-y-2">
            <Label for="max-tokens">Max Tokens: {{ aiSettings.settings.maxTokens }}</Label>
            <Slider
              id="max-tokens"
              :value="[aiSettings.settings.maxTokens]"
              :min="100"
              :max="4000"
              :step="100"
              @update:value="handleMaxTokensChange"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button @click="$emit('update:open', false)" variant="outline">Cancel</Button>
        <Button @click="handleGenerate" :disabled="!apiKeySet || !prompt.trim()">
          <SparklesIcon v-if="!isLoading" class="mr-2 h-4 w-4" />
          <LoaderIcon v-else class="mr-2 h-4 w-4 animate-spin" />
          Generate
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template> 