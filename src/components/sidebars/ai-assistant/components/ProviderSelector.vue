<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  SparklesIcon, 
  CpuIcon, 
  ServerIcon,
  LoaderIcon
} from 'lucide-vue-next'
import { useAIProviders } from '../composables/useAIProviders'

// Get the AI providers and settings
const aiSettings = useAISettingsStore()
const { 
  providers, 
  availableProviders, 
  currentWebLLMModel,
  isLoadingWebLLMModels,
  checkAllProviders, 
  selectProvider 
} = useAIProviders()

// Track the current provider ID
const currentProviderId = ref(aiSettings.settings.preferredProviderId)
const isChangingProvider = ref(false)

// Track provider availability
const providerStatus = ref<Record<string, boolean>>({})

// Get the provider icon component
const getProviderIcon = (providerId: string) => {
  switch(providerId) {
    case 'webllm':
      return CpuIcon
    case 'ollama':
      return ServerIcon
    default:
      return SparklesIcon
  }
}

// Display label for provider
const getProviderLabel = (provider: any) => {
  // If it's WebLLM and loading
  if (provider.id === 'webllm' && isLoadingWebLLMModels.value) {
    return `${provider.name} (Loading...)`
  }
  
  // If provider is not available
  if (!availableProviders.value.includes(provider.id)) {
    if (provider.id === 'webllm') {
      return `${provider.name} (No model loaded)`
    }
    
    if (provider.id === 'gemini' && !aiSettings.getApiKey('gemini')) {
      return `${provider.name} (API key required)`
    }
    
    return `${provider.name} (Not available)`
  }
  
  // If it's WebLLM and a model is loaded
  if (provider.id === 'webllm' && currentWebLLMModel.value) {
    return `${provider.name} (${currentWebLLMModel.value})`
  }
  
  return provider.name
}

// Update the provider when changed
const updateProvider = async (providerId: string) => {
  if (providerId !== currentProviderId.value) {
    try {
      isChangingProvider.value = true
      
      // Use our new selectProvider function that handles auto-loading
      const success = await selectProvider(providerId)
      
      if (success) {
        // Update local state
        currentProviderId.value = providerId
      } else {
        // If provider selection failed, revert to the previous selection
        currentProviderId.value = aiSettings.settings.preferredProviderId
      }
    } finally {
      isChangingProvider.value = false
    }
  }
}

// Watch for external changes to the preferred provider setting
watch(() => aiSettings.settings.preferredProviderId, (newProviderId) => {
  currentProviderId.value = newProviderId
})

// Initialize
onMounted(async () => {
  // This will refresh our provider status
  await checkAllProviders()
})
</script>

<template>
  <div class="provider-selector">
    <div class="mb-1 text-xs font-medium text-muted-foreground">
      Select AI Provider
    </div>
    
    <Select 
      v-model="currentProviderId" 
      @update:modelValue="updateProvider"
      :disabled="isChangingProvider"
    >
      <SelectTrigger class="w-full">
        <div class="flex items-center gap-2">
          <LoaderIcon v-if="isChangingProvider" class="h-4 w-4 animate-spin" />
          <SelectValue placeholder="Select AI provider" />
        </div>
      </SelectTrigger>
      
      <SelectContent>
        <SelectItem 
          v-for="provider in providers" 
          :key="provider.id" 
          :value="provider.id"
          :disabled="!availableProviders.includes(provider.id) && provider.id !== 'webllm'"
        >
          <div class="flex items-center gap-2">
            <component :is="getProviderIcon(provider.id)" class="h-4 w-4" />
            <span>{{ getProviderLabel(provider) }}</span>
            <Badge v-if="provider.requiresApiKey && !aiSettings.getApiKey(provider.id)" 
              variant="outline" class="ml-auto text-xs">
              Needs API key
            </Badge>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template> 