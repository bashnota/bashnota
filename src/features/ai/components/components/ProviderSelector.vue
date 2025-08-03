<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  SparklesIcon, 
  CpuIcon, 
  ServerIcon,
  LoaderIcon
} from 'lucide-vue-next'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'

// Define emits for provider changes
const emit = defineEmits(['provider-changed'])

// Get the AI providers and settings
const aiSettings = useAISettingsStore()
const { 
  providers, 
  availableProviders, 
  currentWebLLMModel,
  isLoadingWebLLMModels,
  initialize,
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

// Wrapper function to handle Select component's AcceptableValue type
const handleProviderUpdate = async (value: any) => {
  if (value && typeof value === 'string') {
    await updateProvider(value)
  }
}

// Update the provider when changed
const updateProvider = async (providerId: string) => {
  console.log('[ProviderSelector] updateProvider called with:', providerId, 'current:', currentProviderId.value)
  
  if (providerId !== currentProviderId.value) {
    try {
      isChangingProvider.value = true
      
      console.log('[ProviderSelector] Attempting to select provider:', providerId)
      // Use our new selectProvider function that handles auto-loading
      const success = await selectProvider(providerId)
      
      if (success) {
        console.log('[ProviderSelector] Provider selection successful')
        // Update local state
        currentProviderId.value = providerId
        
        // Emit event to notify parent component with a slight delay to ensure it's processed
        console.log('[ProviderSelector] Emitting provider-changed event with:', providerId)
        emit('provider-changed', providerId)
        
        // Also emit after a slight delay to ensure it's captured
        setTimeout(() => {
          console.log('[ProviderSelector] Re-emitting provider-changed event with delay:', providerId)
          emit('provider-changed', providerId)
        }, 100)
      } else {
        console.log('[ProviderSelector] Provider selection failed, reverting to:', aiSettings.settings.preferredProviderId)
        // If provider selection failed, revert to the previous selection
        currentProviderId.value = aiSettings.settings.preferredProviderId
      }
    } finally {
      isChangingProvider.value = false
    }
  } else {
    console.log('[ProviderSelector] Provider unchanged, no action needed')
  }
}

// Watch for external changes to the preferred provider setting
watch(() => aiSettings.settings.preferredProviderId, (newProviderId) => {
  currentProviderId.value = newProviderId
})

// Initialize providers and refresh provider status in onMounted
onMounted(async () => {
  // Use the new initialize function instead of directly calling checkAllProviders
  await initialize()
})
</script>

<template>
  <div>
    <Select 
      v-model="currentProviderId" 
      @update:modelValue="handleProviderUpdate"
    >
      <SelectTrigger
        class="w-full text-sm border-none bg-background shadow-none px-0 h-6 font-normal"
        :disabled="isChangingProvider"
      >
        <span v-if="isChangingProvider" class="flex items-center gap-1.5">
          <LoaderIcon class="h-3.5 w-3.5 animate-spin" />
          <span>Changing provider...</span>
        </span>
        <span v-else class="flex items-center gap-1.5">
          <component :is="getProviderIcon(currentProviderId)" class="h-3.5 w-3.5" />
          <span>{{ 
            providers.find(p => p.id === currentProviderId)?.name || 'Select Provider'
          }}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem 
          v-for="provider in providers" 
          :key="provider.id" 
          :value="provider.id"
          class="flex items-center gap-1"
          @click="() => { console.log('[ProviderSelector] SelectItem clicked:', provider.id) }"
        >
          <div class="flex items-center gap-1.5">
            <component :is="getProviderIcon(provider.id)" class="h-3.5 w-3.5" />
            <span>{{ getProviderLabel(provider) }}</span>
            
            <Badge v-if="availableProviders.includes(provider.id)" variant="outline" class="ml-1 text-xs py-0 h-4 bg-primary/5">
              Available
            </Badge>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template> 







