<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'
import { aiService } from '@/features/ai/services/aiService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'vue-sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { 
  Settings, 
  Key, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Server,
  Globe,
  Zap,
  HardDrive as HardDriveIcon
} from 'lucide-vue-next'

// Import WebLLM Settings Modal
import WebLLMSettingsModal from './components/WebLLMSettingsModal.vue'

const aiActionsStore = useAIActionsStore()

// Local state
const availableProviders = ref<Array<{ value: string; label: string; available: boolean; description?: string }>>([])
const isLoading = ref(false)
const showWebLLMModal = ref(false)
const isTestingConnection = ref<Record<string, boolean>>({})
const connectionStatus = ref<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({})
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const showApiKeys = ref<Record<string, boolean>>({})
const showAdvanced = ref(false)

// Computed
const preferences = computed(() => aiActionsStore.state.providerSettings)

// Provider configurations with enhanced metadata
const providerConfigs = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: Sparkles,
    description: 'Google\'s most capable AI model with excellent reasoning capabilities',
    longDescription: 'Advanced language model from Google with strong reasoning and code generation capabilities. Supports function calling and multimodal inputs.',
    requiresApiKey: true,
    apiKeyLabel: 'Gemini API Key',
    setupUrl: 'https://makersuite.google.com/app/apikey',
    features: ['Function Calling', 'Code Generation', 'Multimodal', 'Fast Response'],
    modelCount: 4
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: Zap,
    description: 'GPT models from OpenAI with industry-leading performance',
    longDescription: 'Industry-leading GPT models from OpenAI. Excellent for conversation, coding, and creative tasks with consistent high-quality outputs.',
    requiresApiKey: true,
    apiKeyLabel: 'OpenAI API Key',
    setupUrl: 'https://platform.openai.com/api-keys',
    features: ['GPT-4', 'Code Interpreter', 'DALL-E Integration', 'Function Calling'],
    modelCount: 6
  },
  {
    id: 'webllm',
    name: 'WebLLM',
    icon: Globe,
    description: 'Privacy-focused AI that runs entirely in your browser',
    longDescription: 'Run powerful language models locally in your browser with complete privacy. No data leaves your device.',
    requiresApiKey: false,
    setupUrl: 'https://webllm.mlc.ai/',
    features: ['Local Processing', 'Complete Privacy', 'No API Costs', 'Offline Usage'],
    modelCount: 8
  }
]

// Computed properties
const configuredProvidersCount = computed(() => {
  return providerConfigs.filter(provider => {
    if (provider.requiresApiKey) {
      return !!(preferences.value.apiKeys?.[provider.id])
    }
    return true
  }).length
})

const hasConfiguredProvider = computed(() => configuredProvidersCount.value > 0)

const providerStatus = computed(() => {
  return providerConfigs.map(provider => ({
    ...provider,
    status: getProviderStatus(provider.id),
    statusText: getProviderStatusText(provider.id),
    isAvailable: availableProviders.value.find(p => p.value === provider.id)?.available || false
  }))
})

// Methods
const getProviderStatus = (providerId: string): 'connected' | 'disconnected' => {
  const provider = providerConfigs.find(p => p.id === providerId)
  if (!provider) return 'disconnected'
  
  if (provider.requiresApiKey) {
    return preferences.value.apiKeys?.[providerId] ? 'connected' : 'disconnected'
  }
  
  // Special handling for WebLLM - check if browser is compatible
  if (providerId === 'webllm') {
    return connectionStatus.value[providerId] === 'success' ? 'connected' : 'disconnected'
  }
  
  return 'connected'
}

const getProviderStatusText = (providerId: string): string => {
  const status = getProviderStatus(providerId)
  return status === 'connected' ? 'Ready' : 'Not Configured'
}

const updateProviderSetting = (key: string, value: any) => {
  aiActionsStore.updateProviderSettings({ [key]: value })
  saveSettings()
}

const updateApiKey = (providerId: string, apiKey: string) => {
  const apiKeys = { ...preferences.value.apiKeys, [providerId]: apiKey }
  aiActionsStore.updateProviderSettings({ apiKeys })
  saveSettings()
}

const saveSettings = async () => {
  saveStatus.value = 'saving'
  try {
    aiActionsStore.saveSettings()
    saveStatus.value = 'saved'
    setTimeout(() => {
      saveStatus.value = 'idle'
    }, 2000)
  } catch (error) {
    console.error('Failed to save AI settings:', error)
    saveStatus.value = 'error'
    setTimeout(() => {
      saveStatus.value = 'idle'
    }, 3000)
  }
}

const loadProviders = async () => {
  isLoading.value = true
  try {
    const providers = aiService.getProviderConfigs()
    
    const providerChecks = await Promise.allSettled(
      providers.map(async (provider) => ({
        value: provider.id,
        label: provider.name,
        available: await aiService.isProviderAvailable(provider.id),
        description: providerConfigs.find(c => c.id === provider.id)?.description
      }))
    )
    
    availableProviders.value = providerChecks
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
  } catch (error) {
    console.error('Failed to load providers:', error)
  } finally {
    isLoading.value = false
  }
}

const testConnection = async (providerId: string) => {
  isTestingConnection.value = { ...isTestingConnection.value, [providerId]: true }
  connectionStatus.value = { ...connectionStatus.value, [providerId]: 'testing' }
  
  try {
    let isAvailable = false
    
    if (providerId === 'webllm') {
      // Special handling for WebLLM
      isAvailable = await aiService.isWebLLMSupported()
    } else {
      isAvailable = await aiService.isProviderAvailable(providerId)
    }
    
    connectionStatus.value = { ...connectionStatus.value, [providerId]: isAvailable ? 'success' : 'error' }
  } catch (error) {
    console.error(`Failed to test ${providerId} connection:`, error)
    connectionStatus.value = { ...connectionStatus.value, [providerId]: 'error' }
  } finally {
    isTestingConnection.value = { ...isTestingConnection.value, [providerId]: false }
    
    setTimeout(() => {
      connectionStatus.value = { ...connectionStatus.value, [providerId]: 'idle' }
    }, 3000)
  }
}

const toggleApiKeyVisibility = (providerId: string) => {
  showApiKeys.value = { ...showApiKeys.value, [providerId]: !showApiKeys.value[providerId] }
}

const refreshProviders = () => {
  loadProviders()
}

const openExternalLink = (url: string) => {
  window.open(url, '_blank')
}

const selectProvider = (providerId: string) => {
  updateProviderSetting('provider', providerId)
}

const openWebLLMSettings = () => {
  showWebLLMModal.value = true
}

const handleWebLLMModelLoaded = (modelId: string) => {
  // Update provider settings when a model is loaded via modal
  selectProvider('webllm')
}

const handleWebLLMSettingsSaved = () => {
  // Refresh provider status when settings are saved
  refreshProviders()
}

// Initialize
onMounted(() => {
  loadProviders()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Status -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">AI Providers</h2>
        <p class="text-muted-foreground">
          Configure AI providers and manage connections
        </p>
      </div>
      <div class="flex items-center gap-3">
        <Badge :variant="hasConfiguredProvider ? 'default' : 'secondary'">
          {{ configuredProvidersCount }} provider{{ configuredProvidersCount !== 1 ? 's' : '' }} configured
        </Badge>
        <Button
          @click="refreshProviders"
          :disabled="isLoading"
          variant="outline"
          size="sm"
        >
          <RefreshCw :class="['h-4 w-4 mr-2', isLoading && 'animate-spin']" />
          Refresh
        </Button>
      </div>
    </div>

    <!-- Provider Selection Cards -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Settings class="h-5 w-5" />
          Select Primary Provider
        </CardTitle>
        <CardDescription>
          Choose your main AI provider for analysis and code assistance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            v-for="provider in providerConfigs" 
            :key="provider.id"
            :class="[
              'relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md group',
              preferences.provider === provider.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            ]"
            @click="selectProvider(provider.id)"
          >
            <div class="flex items-start space-x-3">
              <div class="p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors">
                <component :is="provider.icon" class="h-5 w-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-medium">{{ provider.name }}</h3>
                  <div v-if="preferences.provider === provider.id" class="flex items-center text-primary">
                    <CheckCircle class="h-4 w-4" />
                  </div>
                </div>
                <p class="text-sm text-muted-foreground mb-3">{{ provider.description }}</p>
                
                <div class="flex items-center justify-between">
                  <Badge 
                    :variant="getProviderStatus(provider.id) === 'connected' ? 'default' : 'secondary'" 
                    class="text-xs"
                  >
                    {{ getProviderStatusText(provider.id) }}
                  </Badge>
                  <span class="text-xs text-muted-foreground">
                    {{ provider.modelCount }} models
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Quick Status Overview -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Key class="h-5 w-5" />
          Providers Status
        </CardTitle>
        <CardDescription>
          Overview of all provider configurations and connections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div 
            v-for="provider in providerStatus" 
            :key="provider.id"
            class="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
          >
            <div class="flex items-center space-x-3">
              <component :is="provider.icon" class="h-4 w-4" />
              <div>
                <span class="text-sm font-medium">{{ provider.name }}</span>
                <div class="flex items-center gap-2 mt-1">
                  <Badge 
                    :variant="provider.status === 'connected' ? 'default' : 'secondary'" 
                    class="text-xs"
                  >
                    {{ provider.statusText }}
                  </Badge>
                  <span v-if="provider.isAvailable" class="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle class="h-3 w-3" />
                    Available
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Provider Configuration -->
    <Card>
      <CardHeader>
        <CardTitle>Provider Configuration</CardTitle>
        <CardDescription>
          Configure API keys and settings for each provider
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div 
            v-for="config in providerConfigs" 
            :key="config.id"
            class="border rounded-lg p-4 space-y-4"
          >
            <!-- Provider Header -->
            <div class="flex items-start justify-between">
              <div class="flex items-start gap-3">
                <div class="p-2 rounded-lg bg-muted/50">
                  <component :is="config.icon" class="h-5 w-5" />
                </div>
                <div class="space-y-1">
                  <h4 class="font-medium">{{ config.name }}</h4>
                  <p class="text-sm text-muted-foreground">{{ config.longDescription }}</p>
                  
                  <!-- Features -->
                  <div class="flex flex-wrap gap-1 mt-2">
                    <Badge v-for="feature in config.features" :key="feature" variant="outline" class="text-xs">
                      {{ feature }}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <Button
                  @click="testConnection(config.id)"
                  :disabled="isTestingConnection[config.id]"
                  variant="outline"
                  size="sm"
                >
                  <Loader2 
                    v-if="isTestingConnection[config.id]" 
                    class="h-4 w-4 mr-2 animate-spin" 
                  />
                  <CheckCircle 
                    v-else-if="connectionStatus[config.id] === 'success'" 
                    class="h-4 w-4 mr-2 text-green-500" 
                  />
                  <AlertTriangle 
                    v-else-if="connectionStatus[config.id] === 'error'" 
                    class="h-4 w-4 mr-2 text-red-500" 
                  />
                  Test
                </Button>
                <Button
                  @click="() => openExternalLink(config.setupUrl)"
                  variant="ghost"
                  size="sm"
                >
                  <ExternalLink class="h-4 w-4" />
                </Button>
              </div>
            </div>

            <!-- API Key Input (if required) -->
            <div v-if="config.requiresApiKey" class="space-y-2">
              <Label>{{ config.apiKeyLabel }}</Label>
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <Input
                    :type="showApiKeys[config.id] ? 'text' : 'password'"
                    :value="preferences.apiKeys?.[config.id] || ''"
                    @input="(e: Event) => updateApiKey(config.id, (e.target as HTMLInputElement).value)"
                    :placeholder="`Enter ${config.apiKeyLabel?.toLowerCase() || 'API key'}...`"
                    class="pr-10"
                  />
                  <Button
                    @click="toggleApiKeyVisibility(config.id)"
                    variant="ghost"
                    size="sm"
                    class="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <Eye v-if="showApiKeys[config.id]" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p class="text-xs text-muted-foreground">
                Your API key is stored locally and encrypted
              </p>
            </div>

            <!-- Connection Status -->
            <div v-if="connectionStatus[config.id] === 'success'" class="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded">
              <CheckCircle class="h-4 w-4" />
              <span class="text-sm">Connection successful - Provider ready to use</span>
            </div>
            <div v-else-if="connectionStatus[config.id] === 'error'" class="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded">
              <AlertTriangle class="h-4 w-4" />
              <span class="text-sm">Connection failed - Check your configuration</span>
            </div>

            <!-- WebLLM Configuration Hub -->
            <div v-if="config.id === 'webllm'" class="mt-4 pt-4 border-t">
              <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border">
                <div class="flex items-center justify-between">
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <Globe class="h-5 w-5 text-blue-600" />
                      <h4 class="font-medium text-blue-900 dark:text-blue-100">WebLLM Settings</h4>
                    </div>
                    <p class="text-sm text-blue-700 dark:text-blue-300">
                      Complete model management, quick setup wizard, and browser optimization
                    </p>
                    <div class="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" class="text-xs border-blue-300 text-blue-700">
                        <Zap class="h-3 w-3 mr-1" />
                        Quick Setup
                      </Badge>
                      <Badge variant="outline" class="text-xs border-blue-300 text-blue-700">
                        <HardDriveIcon class="h-3 w-3 mr-1" />
                        Model Manager
                      </Badge>
                      <Badge variant="outline" class="text-xs border-blue-300 text-blue-700">
                        <Settings class="h-3 w-3 mr-1" />
                        Auto-Load
                      </Badge>
                    </div>
                  </div>
                  <Button
                    @click="openWebLLMSettings"
                    class="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                    size="default"
                  >
                    <Settings class="h-4 w-4 mr-2" />
                    Configure Models
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    

    <!-- Fallback Configuration -->
    <Card>
      <CardHeader>
        <CardTitle>Fallback & Advanced Settings</CardTitle>
        <CardDescription>
          Configure fallback behavior and advanced options
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Fallback Provider -->
        <div class="space-y-2">
          <Label>Fallback Provider</Label>
          <CustomSelect
            :value="preferences.fallbackProvider"
            @update:value="(value: string) => updateProviderSetting('fallbackProvider', value)"
            :options="availableProviders.filter(p => p.value !== preferences.provider)"
            placeholder="Select fallback provider..."
            :disabled="isLoading"
          />
          <p class="text-xs text-muted-foreground">
            Used when the primary provider is unavailable or encounters errors
          </p>
        </div>

        <Separator />

        <!-- Advanced Toggle -->
        <div class="flex items-center justify-between">
          <Label>Show Advanced Settings</Label>
          <Switch
            :checked="showAdvanced"
            @update:checked="(value: boolean) => showAdvanced = value"
          />
        </div>

        <!-- Advanced Settings -->
        <div v-if="showAdvanced" class="space-y-4 pt-4 border-t">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Auto-retry Failed Requests</Label>
              <p class="text-sm text-muted-foreground">
                Automatically retry failed requests using fallback provider
              </p>
            </div>
            <Switch
              :checked="preferences.retryFailedRequests"
              @update:checked="(value: boolean) => updateProviderSetting('retryFailedRequests', value)"
            />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Cache Provider Responses</Label>
              <p class="text-sm text-muted-foreground">
                Cache responses to reduce API calls and improve performance
              </p>
            </div>
            <Switch
              :checked="preferences.cacheResponses"
              @update:checked="(value: boolean) => updateProviderSetting('cacheResponses', value)"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Save Status -->
    <Alert v-if="saveStatus === 'saved'" class="border-green-200 bg-green-50">
      <CheckCircle class="h-4 w-4 text-green-600" />
      <AlertDescription class="text-green-700">
        Settings saved successfully
      </AlertDescription>
    </Alert>
    
    <Alert v-else-if="saveStatus === 'error'" variant="destructive">
      <AlertTriangle class="h-4 w-4" />
      <AlertDescription>
        Failed to save settings. Please try again.
      </AlertDescription>
    </Alert>

    <!-- WebLLM Settings Modal -->
    <WebLLMSettingsModal
      v-model:open="showWebLLMModal"
      @model-loaded="handleWebLLMModelLoaded"
      @settings-saved="handleWebLLMSettingsSaved"
    />
  </div>
</template> 