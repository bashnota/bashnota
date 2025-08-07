<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { RotateCw, Sparkles, Zap, Globe, Server, Settings2, Brain, MessageSquare, TrendingUp } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Use actual AI stores and composables
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'

// Base components
import SettingSection from '@/features/settings/components/base/SettingSection.vue'
import SettingGroup from '@/features/settings/components/base/SettingGroup.vue'
import SettingSwitch from '@/features/settings/components/base/SettingSwitch.vue'

// AI-specific modular components
import ProviderSettings from './components/ProviderSettings.vue'
import ModelSelector from './components/ModelSelector.vue'
import GenerationSettings from './components/GenerationSettings.vue'

// Store and composable setup
const aiSettings = useAISettingsStore()
const { 
  providers, 
  initialize, 
  availableProviders, 
  selectProvider,
  currentProviderId 
} = useAIProviders()

// Local state
const activeTab = ref('providers')
const isInitialized = ref(false)

// Enhanced provider configurations with icons
const providerConfigs = computed(() => [
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: Sparkles,
    description: 'Google\'s most capable AI model with excellent reasoning capabilities',
    requiresApiKey: true,
    setupUrl: 'https://aistudio.google.com/app/apikey',
    features: ['Multimodal', 'Long Context', 'Function Calling', 'Fast Response']
  },
  {
    id: 'webllm',
    name: 'WebLLM',
    icon: Globe,
    description: 'Privacy-focused AI that runs entirely in your browser',
    requiresApiKey: false,
    setupUrl: 'https://webllm.mlc.ai/',
    features: ['Local Processing', 'Complete Privacy', 'No API Costs', 'Offline Usage']
  },
  {
    id: 'ollama',
    name: 'Ollama',
    icon: Server,
    description: 'Run large language models locally on your machine',
    requiresApiKey: false,
    setupUrl: 'https://ollama.ai/',
    features: ['Local Hosting', 'Custom Models', 'Privacy', 'High Performance']
  }
])

// Computed properties
const selectedProvider = computed(() => 
  providerConfigs.value.find(p => p.id === aiSettings.settings.preferredProviderId)
)

const configuredProvidersCount = computed(() => {
  return providerConfigs.value.filter(provider => {
    if (provider.requiresApiKey) {
      return !!aiSettings.getApiKey(provider.id)
    }
    return true
  }).length
})

const hasConfiguredProvider = computed(() => configuredProvidersCount.value > 0)

const statsData = computed(() => ({
  totalProviders: providerConfigs.value.length,
  configuredProviders: configuredProvidersCount.value,
  availableProviders: availableProviders.value.length,
  selectedProvider: selectedProvider.value?.name || 'None'
}))

// Methods
const handleProviderSelection = async (providerId: string) => {
  try {
    aiSettings.setPreferredProvider(providerId)
    await selectProvider(providerId)
    toast.success(`Switched to ${providerConfigs.value.find(p => p.id === providerId)?.name}`)
  } catch (error) {
    toast.error('Failed to switch provider')
    console.error('Provider selection error:', error)
  }
}

const handleApiKeyUpdate = (providerId: string, apiKey: string) => {
  aiSettings.setApiKey(providerId, apiKey)
  toast.success('API key updated')
}

const handleResetToDefaults = () => {
  // Reset AI settings to defaults
  aiSettings.updateSettings({
    preferredProviderId: 'gemini',
    apiKeys: {},
    autoSelectProvider: true,
    requestTimeout: 30,
    maxTokens: 2048,
    temperature: 0.7,
    customPrompt: '',
    geminiModel: 'gemini-1.5-pro',
    geminiSafetyThreshold: 'BLOCK_MEDIUM_AND_ABOVE',
    ollamaServerUrl: 'http://localhost:11434',
    ollamaModel: 'llama2',
    webllmModel: '',
    webllmDefaultModel: '',
    webllmAutoLoad: true,
    webllmAutoLoadStrategy: 'smallest',
    sidebarWidth: 350
  })
  toast.success('AI settings reset to defaults')
}

// Initialize providers
onMounted(async () => {
  try {
    await initialize()
    isInitialized.value = true
  } catch (error) {
    console.error('Failed to initialize AI providers:', error)
    toast.error('Failed to initialize AI providers')
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Overview Section -->
    <SettingSection
      title="AI Assistant Overview"
      description="Current AI configuration and quick stats"
      :icon="TrendingUp"
    >
      <SettingGroup title="Configuration Status" description="Overview of your AI setup">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ statsData.totalProviders }}</div>
            <div class="text-sm text-muted-foreground">Total Providers</div>
          </div>
          <div class="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ statsData.configuredProviders }}</div>
            <div class="text-sm text-muted-foreground">Configured</div>
          </div>
          <div class="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">{{ statsData.availableProviders }}</div>
            <div class="text-sm text-muted-foreground">Available</div>
          </div>
          <div class="text-center p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <div class="text-2xl font-bold text-amber-600 truncate">{{ statsData.selectedProvider }}</div>
            <div class="text-sm text-muted-foreground">Active Provider</div>
          </div>
        </div>
      </SettingGroup>
    </SettingSection>

    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-3">
        <TabsTrigger value="providers">
          <Settings2 class="mr-2 h-4 w-4" />
          Providers
        </TabsTrigger>
        <TabsTrigger value="models">
          <Brain class="mr-2 h-4 w-4" />
          Models
        </TabsTrigger>
        <TabsTrigger value="generation">
          <MessageSquare class="mr-2 h-4 w-4" />
          Generation
        </TabsTrigger>
      </TabsList>

      <!-- Providers Tab -->
      <TabsContent value="providers">
        <SettingSection
          title="AI Providers"
          description="Configure and manage your AI service providers"
          :icon="Settings2"
        >
          <SettingGroup 
            title="Auto-Selection" 
            description="Provider fallback and automatic selection"
          >
            <SettingSwitch
              label="Auto-Select Best Provider"
              description="Automatically choose the best available provider"
              help="Falls back to configured providers based on availability"
              :model-value="aiSettings.settings.autoSelectProvider ?? true"
              @update:model-value="(value) => aiSettings.updateSettings({ autoSelectProvider: value })"
            />
          </SettingGroup>

          <SettingGroup 
            title="Available Providers" 
            description="Set up and configure AI service providers"
          >
            <div class="grid gap-6">
              <ProviderSettings
                v-for="provider in providerConfigs"
                :key="provider.id"
                :provider-id="provider.id"
                :provider-name="provider.name"
                :icon="provider.icon"
                :description="provider.description"
                :requires-api-key="provider.requiresApiKey"
                :setup-url="provider.setupUrl"
                :features="provider.features"
                @select="handleProviderSelection"
                @update-api-key="handleApiKeyUpdate"
              />
            </div>
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Models Tab -->
      <TabsContent value="models">
        <SettingSection
          title="Model Configuration"
          description="Configure models for your selected provider"
          :icon="Brain"
        >
          <!-- Only show models for the selected provider -->
          <div v-if="selectedProvider" class="space-y-6">
            <ModelSelector
              :provider-id="selectedProvider.id"
              :provider-name="selectedProvider.name"
            />
          </div>
          
          <div v-else class="text-center py-8 text-muted-foreground">
            <Brain class="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p class="text-lg font-medium">No Provider Selected</p>
            <p class="text-sm">Please select a provider in the Providers tab to configure models.</p>
          </div>
        </SettingSection>
      </TabsContent>

      <!-- Generation Tab -->
      <TabsContent value="generation">
        <div class="space-y-6">
          <GenerationSettings
            :temperature="aiSettings.settings.temperature"
            :max-tokens="aiSettings.settings.maxTokens"
            :request-timeout="aiSettings.settings.requestTimeout || 30"
            :custom-prompt="aiSettings.settings.customPrompt"
            @update:temperature="(value) => aiSettings.updateSettings({ temperature: value })"
            @update:max-tokens="(value) => aiSettings.updateSettings({ maxTokens: value })"
            @update:request-timeout="(value) => aiSettings.updateSettings({ requestTimeout: value })"
            @update:custom-prompt="(value) => aiSettings.updateSettings({ customPrompt: value })"
          />
          
          <!-- Reset Section -->
          <SettingSection
            title="Reset Settings"
            description="Restore AI settings to their default values"
            :icon="RotateCw"
          >
            <SettingGroup title="Reset to Defaults" description="This will restore all AI settings to their original values">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium">Reset All AI Settings</div>
                  <div class="text-sm text-muted-foreground">This will reset providers, models, generation settings, and API keys</div>
                </div>
                <Button 
                  @click="handleResetToDefaults" 
                  variant="outline" 
                  class="gap-2"
                >
                  <RotateCw class="h-4 w-4" />
                  Reset to Defaults
                </Button>
              </div>
            </SettingGroup>
          </SettingSection>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>