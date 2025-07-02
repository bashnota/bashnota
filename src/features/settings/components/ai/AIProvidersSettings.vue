<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Switch } from '@/ui/switch'
import { Label } from '@/ui/label'
import { CheckCircle, SparklesIcon, Settings, RotateCw } from 'lucide-vue-next'
import { toast } from '@/ui/toast'

// Import AI provider components
import GeminiProviderSettings from './providers/GeminiProviderSettings.vue'
import OllamaProviderSettings from './providers/OllamaProviderSettings.vue'
import WebLLMProviderSettings from './providers/WebLLMProviderSettings.vue'

// Settings state
const activeProviderId = ref('gemini')
const autoSelectProvider = ref(false)
const showProviderConfig = ref(false)

// Provider configurations
const providerConfigs = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Advanced AI model from Google with multimodal capabilities',
    icon: SparklesIcon,
    status: 'available'
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run large language models locally on your machine',
    icon: Settings,
    status: 'available'
  },
  {
    id: 'webllm',
    name: 'WebLLM',
    description: 'Run AI models directly in your browser',
    icon: CheckCircle,
    status: 'experimental'
  }
]

// Provider status tracking
const providerStatus = ref(providerConfigs.map(config => ({
  ...config,
  statusText: 'Not configured',
  modelCount: 0
})))

// Computed properties
const activeProvider = computed(() => {
  return providerConfigs.find(p => p.id === activeProviderId.value)
})

const hasConfiguredProvider = computed(() => {
  return providerStatus.value.some(p => p.statusText === 'Connected')
})

const configuredProvidersCount = computed(() => {
  return providerStatus.value.filter(p => p.statusText === 'Connected').length
})

// Load settings from localStorage
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('ai-providers-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      activeProviderId.value = settings.activeProviderId || 'gemini'
      autoSelectProvider.value = settings.autoSelectProvider ?? false
      showProviderConfig.value = settings.showProviderConfig ?? false
    }
  } catch (error) {
    console.error('Failed to load AI providers settings:', error)
  }
}

// Save settings to localStorage
const saveSettings = () => {
  const settings = {
    activeProviderId: activeProviderId.value,
    autoSelectProvider: autoSelectProvider.value,
    showProviderConfig: showProviderConfig.value
  }
  
  localStorage.setItem('ai-providers-settings', JSON.stringify(settings))
  
  // Dispatch event to notify other parts of the app
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('ai-providers-settings-changed', { detail: settings }))
  }
}

// Select a provider
const selectProvider = (providerId: string) => {
  activeProviderId.value = providerId
  saveSettings()
}

// Get provider status
const getProviderStatus = (providerId: string) => {
  const provider = providerStatus.value.find(p => p.id === providerId)
  return provider?.statusText === 'Connected' ? 'connected' : 'disconnected'
}

// Get provider status text
const getProviderStatusText = (providerId: string) => {
  const provider = providerStatus.value.find(p => p.id === providerId)
  return provider?.statusText || 'Not configured'
}

// Reset to defaults
const resetToDefaults = () => {
  activeProviderId.value = 'gemini'
  autoSelectProvider.value = false
  showProviderConfig.value = false
  
  saveSettings()
  
  toast({
    title: 'Settings Reset',
    description: 'AI provider settings have been reset to defaults',
    variant: 'default'
  })
}

// Handle setting changes
const handleSettingChange = () => {
  saveSettings()
}

onMounted(() => {
  loadSettings()
})

// Expose methods for parent components
defineExpose({
  loadSettings,
  resetToDefaults
})
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <!-- Overview -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="flex items-center gap-2">
              <SparklesIcon class="h-5 w-5" />
              AI Providers Overview
            </CardTitle>
            <CardDescription>
              Configure AI providers and select your preferred service
            </CardDescription>
          </div>
          <Badge :variant="hasConfiguredProvider ? 'default' : 'secondary'">
            {{ configuredProvidersCount }} provider{{ configuredProvidersCount !== 1 ? 's' : '' }} configured
          </Badge>
        </div>
      </CardHeader>
    </Card>

    <!-- Provider Selection -->
    <Card>
      <CardHeader>
        <CardTitle>Select Active Provider</CardTitle>
        <CardDescription>Choose your preferred AI provider for generating content</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- Provider Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            v-for="provider in providerConfigs" 
            :key="provider.id"
            :class="[
              'relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md',
              activeProviderId === provider.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            ]"
            @click="selectProvider(provider.id)"
          >
            <div class="flex items-start space-x-3">
              <component :is="provider.icon" class="h-6 w-6 mt-1" />
              <div class="flex-1 min-w-0">
                <h3 class="font-medium">{{ provider.name }}</h3>
                <p class="text-sm text-muted-foreground mt-1">{{ provider.description }}</p>
                
                <div class="flex items-center justify-between mt-3">
                  <Badge 
                    :variant="getProviderStatus(provider.id) === 'connected' ? 'default' : 'secondary'" 
                    class="text-xs"
                  >
                    {{ getProviderStatusText(provider.id) }}
                  </Badge>
                  <div v-if="activeProviderId === provider.id" class="flex items-center text-primary">
                    <CheckCircle class="h-4 w-4 mr-1" />
                    <span class="text-xs font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Auto-selection Setting -->
        <div class="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div class="space-y-0.5">
            <Label>Automatically Select Best Provider</Label>
            <p class="text-sm text-muted-foreground">
              Let the system choose the best available provider based on context
            </p>
          </div>
          <Switch
            v-model:checked="autoSelectProvider"
            @update:checked="handleSettingChange"
          />
        </div>
      </CardContent>
    </Card>

    <!-- Provider Configuration -->
    <Card v-if="activeProvider">
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle>{{ activeProvider.name }} Configuration</CardTitle>
            <CardDescription>Configure settings for {{ activeProvider.name }}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            @click="showProviderConfig = !showProviderConfig; handleSettingChange()"
          >
            {{ showProviderConfig ? 'Hide' : 'Show' }} Configuration
          </Button>
        </div>
      </CardHeader>
      
      <CardContent v-if="showProviderConfig" class="border-t">
        <div class="pt-6">
          <!-- Gemini Configuration -->
          <GeminiProviderSettings v-if="activeProviderId === 'gemini'" />
          
          <!-- Ollama Configuration -->
          <OllamaProviderSettings v-if="activeProviderId === 'ollama'" />
          
          <!-- WebLLM Configuration -->
          <WebLLMProviderSettings v-if="activeProviderId === 'webllm'" />
        </div>
      </CardContent>
    </Card>

    <!-- All Providers Status -->
    <Card>
      <CardHeader>
        <CardTitle>All Providers Status</CardTitle>
        <CardDescription>Quick overview of all configured providers</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div 
            v-for="provider in providerStatus" 
            :key="provider.id"
            class="flex items-center justify-between p-3 bg-muted/30 rounded border"
          >
            <div class="flex items-center space-x-2">
              <component :is="provider.icon" class="h-4 w-4" />
              <span class="text-sm font-medium">{{ provider.name }}</span>
            </div>
            <div class="flex items-center space-x-2">
              <Badge 
                :variant="provider.statusText === 'Connected' ? 'default' : 'secondary'" 
                class="text-xs"
              >
                {{ provider.statusText }}
              </Badge>
              <span v-if="provider.modelCount > 0" class="text-xs text-muted-foreground">
                {{ provider.modelCount }} models
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Reset Section -->
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>Restore AI provider settings to their default values</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" @click="resetToDefaults" class="flex items-center gap-2">
          <RotateCw class="h-4 w-4" />
          Reset to Defaults
        </Button>
      </CardContent>
    </Card>
  </div>
</template> 