<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { RotateCw, Sparkles, Zap, Globe, Server, Settings2, Brain, Code2, MessageSquare } from 'lucide-vue-next'
import { useSettings } from '@/composables/useSettings'
import { toast } from 'vue-sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

// Base components
import SettingSection from '@/features/settings/components/base/SettingSection.vue'
import SettingGroup from '@/features/settings/components/base/SettingGroup.vue'
import SettingSwitch from '@/features/settings/components/base/SettingSwitch.vue'
import SettingSlider from '@/features/settings/components/base/SettingSlider.vue'
import SettingSelect from '@/features/settings/components/base/SettingSelect.vue'
import SettingInput from '@/features/settings/components/base/SettingInput.vue'

// AI-specific components
import AIProviderCard from './components/AIProviderCard.vue'
import WebLLMSettingsModal from './components/WebLLMSettingsModal.vue'

const { settings, updateSetting, resetToDefaults, hasUnsavedChanges } = useSettings('ai')

// Local state
const showWebLLMModal = ref(false)
const activeTab = ref('providers')

// Provider configurations
const providerConfigs = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: Sparkles,
    description: 'Google\'s most capable AI model with excellent reasoning capabilities',
    requiresApiKey: true,
    setupUrl: 'https://makersuite.google.com/app/apikey',
    features: ['Function Calling', 'Code Generation', 'Multimodal', 'Fast Response'],
    modelCount: 4
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: Zap,
    description: 'GPT models from OpenAI with industry-leading performance',
    requiresApiKey: true,
    setupUrl: 'https://platform.openai.com/api-keys',
    features: ['GPT-4', 'Code Interpreter', 'DALL-E Integration', 'Function Calling'],
    modelCount: 6
  },
  {
    id: 'webllm',
    name: 'WebLLM',
    icon: Globe,
    description: 'Privacy-focused AI that runs entirely in your browser',
    requiresApiKey: false,
    setupUrl: 'https://webllm.mlc.ai/',
    features: ['Local Processing', 'Complete Privacy', 'No API Costs', 'Offline Usage'],
    modelCount: 8
  },
  {
    id: 'ollama',
    name: 'Ollama',
    icon: Server,
    description: 'Run large language models locally on your machine',
    requiresApiKey: false,
    setupUrl: 'https://ollama.ai/',
    features: ['Local Hosting', 'Custom Models', 'Privacy', 'High Performance'],
    modelCount: 12
  }
]

// Model options
const geminiModelOptions = [
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Most capable model with 2M context' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Fast and efficient with 1M context' },
  { value: 'gemini-pro', label: 'Gemini Pro', description: 'Balanced performance and speed' },
  { value: 'gemini-pro-vision', label: 'Gemini Pro Vision', description: 'Multimodal with image understanding' }
]

const safetyThresholdOptions = [
  { value: 'BLOCK_NONE', label: 'No Blocking', description: 'Allow all content' },
  { value: 'BLOCK_ONLY_HIGH', label: 'Block High Risk', description: 'Block only high-risk content' },
  { value: 'BLOCK_MEDIUM_AND_ABOVE', label: 'Block Medium+', description: 'Block medium and high-risk content' },
  { value: 'BLOCK_LOW_AND_ABOVE', label: 'Block Low+', description: 'Block low, medium, and high-risk content' }
]

const autoLoadStrategyOptions = [
  { value: 'smallest', label: 'Smallest Model', description: 'Auto-load the smallest available model' },
  { value: 'fastest', label: 'Fastest Model', description: 'Auto-load the fastest model' },
  { value: 'balanced', label: 'Balanced', description: 'Balance between size and performance' },
  { value: 'default', label: 'Default Model', description: 'Use the configured default model' },
  { value: 'none', label: 'No Auto-load', description: 'Never auto-load models' }
]

// Computed
const configuredProvidersCount = computed(() => {
  return providerConfigs.filter(provider => {
    if (provider.requiresApiKey) {
      return !!(settings.value.apiKeys?.[provider.id])
    }
    return true
  }).length
})

const hasConfiguredProvider = computed(() => configuredProvidersCount.value > 0)

// Methods
const handleResetToDefaults = () => {
  resetToDefaults()
  toast.success('AI settings reset to defaults')
}

const handleProviderSelection = (providerId: string) => {
  updateSetting('preferredProviderId', providerId)
  toast.success(`Switched to ${providerConfigs.find(p => p.id === providerId)?.name}`)
}

const handleApiKeyUpdate = (providerId: string, apiKey: string) => {
  const currentApiKeys = { ...(settings.value.apiKeys || {}) }
  if (apiKey) {
    currentApiKeys[providerId] = apiKey
  } else {
    delete currentApiKeys[providerId]
  }
  updateSetting('apiKeys', currentApiKeys)
}

const openWebLLMSettings = () => {
  showWebLLMModal.value = true
}
</script>

<template>
  <div class="space-y-6">
    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-4">
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
        <TabsTrigger value="advanced">
          <Code2 class="mr-2 h-4 w-4" />
          Advanced
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
            title="Provider Selection" 
            description="Choose your preferred AI provider for tasks"
          >
            <SettingSelect
              label="Preferred Provider"
              description="Default AI provider for new conversations"
              help="This provider will be used unless manually changed"
              :model-value="settings.preferredProviderId"
              :options="providerConfigs.map(p => ({ 
                value: p.id, 
                label: p.name, 
                description: p.description 
              }))"
              @update:model-value="(value) => updateSetting('preferredProviderId', value)"
            />

            <SettingSwitch
              label="Auto-Select Best Provider"
              description="Automatically choose the best available provider"
              help="Falls back to configured providers based on availability"
              :model-value="settings.autoSelectProvider"
              @update:model-value="(value) => updateSetting('autoSelectProvider', value)"
            />
          </SettingGroup>

          <SettingGroup 
            title="Provider Configuration" 
            description="Set up API keys and provider-specific settings"
          >
            <div class="grid gap-4">
              <AIProviderCard
                v-for="provider in providerConfigs"
                :key="provider.id"
                :provider="provider"
                :is-selected="settings.preferredProviderId === provider.id"
                :api-key="settings.apiKeys?.[provider.id] || ''"
                @select="handleProviderSelection"
                @update-api-key="handleApiKeyUpdate"
                @open-webllm-settings="openWebLLMSettings"
              />
            </div>
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Models Tab -->
      <TabsContent value="models">
        <SettingSection
          title="Model Configuration"
          description="Configure specific models for each provider"
          :icon="Brain"
        >
                      <div class="space-y-4">
              <!-- Gemini Models -->
              <SettingGroup title="Google Gemini Models">
                <SettingSelect
                  label="Default Model"
                  description="Choose the Gemini model to use"
                  help="Different models have varying capabilities and context limits"
                  :model-value="settings.geminiModel"
                  :options="geminiModelOptions"
                  @update:model-value="(value) => updateSetting('geminiModel', value)"
                />

                <SettingSelect
                  label="Safety Threshold"
                  description="Content filtering level for responses"
                  help="Higher settings block more potentially harmful content"
                  :model-value="settings.geminiSafetyThreshold"
                  :options="safetyThresholdOptions"
                  @update:model-value="(value) => updateSetting('geminiSafetyThreshold', value)"
                />
              </SettingGroup>

              <!-- WebLLM Models -->
              <SettingGroup title="WebLLM Models">
                <SettingInput
                  label="Default Model"
                  description="The WebLLM model to auto-load"
                  help="Leave empty to use the auto-load strategy"
                  :model-value="settings.webllmDefaultModel || ''"
                  placeholder="e.g., Llama-3.2-3B-Instruct-q4f32_1-MLC"
                  @update:model-value="(value) => updateSetting('webllmDefaultModel', value)"
                />

                <SettingSwitch
                  label="Auto-load Model"
                  description="Automatically load a model when needed"
                  help="Reduces wait time for first requests"
                  :model-value="settings.webllmAutoLoad"
                  @update:model-value="(value) => updateSetting('webllmAutoLoad', value)"
                />

                <SettingSelect
                  label="Auto-load Strategy"
                  description="How to choose which model to auto-load"
                  help="Strategy used when no default model is specified"
                  :model-value="settings.webllmAutoLoadStrategy"
                  :options="autoLoadStrategyOptions"
                  @update:model-value="(value) => updateSetting('webllmAutoLoadStrategy', value)"
                />
              </SettingGroup>

              <!-- Ollama Models -->
              <SettingGroup title="Ollama Models">
                <SettingInput
                  label="Server URL"
                  description="Ollama server endpoint"
                  help="URL where your Ollama instance is running"
                  :model-value="settings.ollamaServerUrl"
                  placeholder="http://localhost:11434"
                  @update:model-value="(value) => updateSetting('ollamaServerUrl', value)"
                />

                <SettingInput
                  label="Default Model"
                  description="Default Ollama model to use"
                  help="Must be installed on your Ollama server"
                  :model-value="settings.ollamaModel"
                  placeholder="llama2"
                  @update:model-value="(value) => updateSetting('ollamaModel', value)"
                />
              </SettingGroup>
            </div>
        </SettingSection>
      </TabsContent>

      <!-- Generation Tab -->
      <TabsContent value="generation">
        <SettingSection
          title="Generation Settings"
          description="Control how AI models generate responses"
          :icon="MessageSquare"
        >
          <SettingGroup title="Response Parameters" description="Fine-tune AI response generation">
            <SettingSlider
              label="Temperature"
              description="Controls randomness in responses"
              help="Lower values = more focused, higher values = more creative"
              :model-value="[settings.temperature]"
              :min="0"
              :max="2"
              :step="0.1"
              @update:model-value="(value) => updateSetting('temperature', value[0])"
            />

            <SettingSlider
              label="Max Tokens"
              description="Maximum length of generated responses"
              help="Higher values allow longer responses but may be slower"
              :model-value="[settings.maxTokens]"
              :min="256"
              :max="8192"
              :step="256"
              @update:model-value="(value) => updateSetting('maxTokens', value[0])"
            />

            <SettingSlider
              label="Request Timeout"
              description="Maximum time to wait for responses"
              help="Time in seconds before canceling a request"
              :model-value="[settings.requestTimeout || 30]"
              :min="10"
              :max="120"
              unit="s"
              @update:model-value="(value) => updateSetting('requestTimeout', value[0])"
            />
          </SettingGroup>

          <SettingGroup title="Custom Prompt" description="Default system prompt for AI interactions">
            <SettingInput
              label="System Prompt"
              description="Default instructions for AI responses"
              help="This prompt is sent with every request to guide AI behavior"
              :model-value="settings.customPrompt"
              placeholder="You are a helpful assistant..."
              @update:model-value="(value) => updateSetting('customPrompt', value)"
            />
          </SettingGroup>
        </SettingSection>
      </TabsContent>

      <!-- Advanced Tab -->
      <TabsContent value="advanced">
        <SettingSection
          title="Advanced Settings"
          description="Advanced configuration and performance options"
          :icon="Code2"
        >
          <SettingGroup title="Interface" description="AI assistant interface settings">
            <SettingSlider
              label="Sidebar Width"
              description="Width of the AI assistant sidebar"
              help="Adjust to fit your workflow preferences"
              :model-value="[settings.sidebarWidth || 350]"
              :min="250"
              :max="600"
              unit="px"
              @update:model-value="(value) => updateSetting('sidebarWidth', value[0])"
            />
          </SettingGroup>

          <SettingGroup title="Performance" description="Performance and reliability settings">
            <SettingSlider
              label="Connection Timeout"
              description="Time to wait for provider connections"
              help="Longer timeouts may help with slow connections"
              :model-value="[settings.requestTimeout || 30]"
              :min="5"
              :max="60"
              unit="s"
              @update:model-value="(value) => updateSetting('requestTimeout', value[0])"
            />
          </SettingGroup>

          <!-- Reset Section -->
          <div class="pt-6 border-t">
            <Button 
              @click="handleResetToDefaults" 
              variant="outline" 
              class="w-full"
            >
              <RotateCw class="mr-2 h-4 w-4" />
              Reset AI Settings to Defaults
            </Button>
          </div>
        </SettingSection>
      </TabsContent>
    </Tabs>

    <!-- WebLLM Settings Modal -->
    <WebLLMSettingsModal
      v-model:open="showWebLLMModal"
    />
  </div>
</template>