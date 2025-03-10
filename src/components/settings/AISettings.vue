<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SparklesIcon, KeyIcon, Save, Trash2Icon, CpuIcon } from 'lucide-vue-next'
import WebLLMSettings from '@/components/settings/WebLLMSettings.vue'

const aiSettings = useAISettingsStore()
const apiKeys = ref<Record<string, string>>({...aiSettings.settings.apiKeys})
const customPrompt = ref(aiSettings.settings.customPrompt)
const maxTokens = ref([aiSettings.settings.maxTokens])
const temperature = ref([aiSettings.settings.temperature])
const preferredProviderId = ref(aiSettings.settings.preferredProviderId)
const activeTab = ref('api-keys')

const saveSettings = () => {
  // Update API keys
  Object.entries(apiKeys.value).forEach(([providerId, key]) => {
    if (key) {
      aiSettings.setApiKey(providerId, key)
    }
  })

  // Update other settings
  aiSettings.updateSettings({
    preferredProviderId: preferredProviderId.value,
    customPrompt: customPrompt.value,
    maxTokens: maxTokens.value[0],
    temperature: temperature.value[0]
  })

  toast({
    title: 'Settings Saved',
    description: 'Your AI generation settings have been updated.',
  })
}

const clearApiKey = (providerId: string) => {
  apiKeys.value[providerId] = ''
  aiSettings.setApiKey(providerId, '')
  
  toast({
    title: 'API Key Removed',
    description: `API key for provider has been removed.`,
  })
}

// Format temperature label
const formatTemperature = (temp: number) => {
  if (temp < 0.3) return 'More precise'
  if (temp > 0.7) return 'More creative'
  return 'Balanced'
}

// Add helper method for getting API key instructions
const getApiKeyInstructions = (providerId: string) => {
  switch(providerId) {
    case 'openai':
      return 'Available from OpenAI dashboard at https://platform.openai.com/api-keys'
    case 'anthropic':
      return 'Available from Anthropic console at https://console.anthropic.com/settings/keys'
    case 'gemini':
      return 'Available from Google AI Studio at https://makersuite.google.com/app/apikey'
    case 'ollama':
      return 'Not required for local Ollama installation'
    default:
      return 'API key required for this provider'
  }
}

onMounted(() => {
  // Initialize API keys from store
  aiSettings.providers.forEach(provider => {
    if (provider.requiresApiKey) {
      const key = aiSettings.getApiKey(provider.id)
      if (key) {
        apiKeys.value[provider.id] = key
      }
    }
  })
})

// Handle API key change
const handleApiKeyChange = (providerId: string, newKey: string) => {
  // Get the old key for comparison
  const oldKey = aiSettings.getApiKey(providerId) || ''
  
  // Only proceed if the key has actually changed
  if (newKey !== oldKey) {
    // Save the key
    aiSettings.setApiKey(providerId, newKey)
    
    // Show appropriate notification
    if (newKey) {
      toast({
        title: 'API Key Saved',
        description: `API key for ${providerId} has been saved.`,
      })
    } else {
      toast({
        title: 'API Key Removed',
        description: `API key for ${providerId} has been removed.`,
      })
    }
  }
}

// Handle paste event properly 
const handlePaste = (providerId: string, event: ClipboardEvent) => {
  // Access the clipboard data directly instead of relying on the input value
  const clipboardText = event.clipboardData?.getData('text') || ''
  
  if (clipboardText.trim()) {
    // Update the reactive reference
    apiKeys.value[providerId] = clipboardText.trim()
    // Call API key change handler directly with the clipboard text
    handleApiKeyChange(providerId, clipboardText.trim())
  }
}
</script>

<template>
  <div class="space-y-6">
    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="api-keys" class="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          <div class="flex items-center justify-center gap-2 p-2">
            <KeyIcon class="w-4 h-4 shrink-0" />
            <span class="text-sm font-medium">API Keys & Settings</span>
          </div>
        </TabsTrigger>
        <TabsTrigger value="webllm" class="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          <div class="flex items-center justify-center gap-2 p-2">
            <CpuIcon class="w-4 h-4 shrink-0" />
            <span class="text-sm font-medium">WebLLM (Local Models)</span>
          </div>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="api-keys">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center text-xl font-semibold">
              <SparklesIcon class="mr-2 h-5 w-5" /> AI Generation Settings
            </CardTitle>
            <CardDescription>
              Configure your AI text generation settings and API keys
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div class="space-y-6">
              <!-- Provider Selection -->
              <div class="space-y-2">
                <Label for="preferred-provider">Preferred AI Provider</Label>
                <Select v-model="preferredProviderId">
                  <SelectTrigger id="preferred-provider">
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem 
                      v-for="provider in aiSettings.providers" 
                      :key="provider.id" 
                      :value="provider.id"
                    >
                      {{ provider.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <!-- API Keys -->
              <div class="space-y-4">
                <h3 class="text-lg font-medium">API Keys</h3>
                
                <div 
                  v-for="provider in aiSettings.providers.filter(p => p.requiresApiKey)" 
                  :key="provider.id"
                  class="space-y-2"
                >
                  <Label :for="`api-key-${provider.id}`">{{ provider.name }} API Key</Label>
                  <div class="flex space-x-2">
                    <Input
                      :id="`api-key-${provider.id}`"
                      v-model="apiKeys[provider.id]"
                      type="password"
                      placeholder="Enter API key"
                      class="flex-1"
                      @blur="handleApiKeyChange(provider.id, apiKeys[provider.id])"
                      @paste="(event: ClipboardEvent) => handlePaste(provider.id, event)"
                    />
                    <Button 
                      variant="destructive" 
                      size="icon"
                      @click="clearApiKey(provider.id)"
                      v-if="apiKeys[provider.id]"
                    >
                      <Trash2Icon class="h-4 w-4" />
                    </Button>
                  </div>
                  <p class="text-xs text-gray-500">
                    {{ getApiKeyInstructions(provider.id) }}
                  </p>
                </div>
              </div>

              <!-- Advanced Settings -->
              <div class="space-y-4">
                <h3 class="text-lg font-medium">Advanced Settings</h3>

                <!-- Custom System Prompt -->
                <div class="space-y-2">
                  <Label for="custom-prompt">Custom System Prompt</Label>
                  <Textarea
                    id="custom-prompt"
                    v-model="customPrompt"
                    placeholder="Optional: Add a custom system prompt that will be used for all generations"
                    rows="3"
                  />
                  <p class="text-xs text-gray-500">
                    A system prompt helps guide the AI's behavior. Leave empty to use default.
                  </p>
                </div>

                <!-- Temperature -->
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <Label for="temperature">Temperature: {{ temperature[0].toFixed(1) }}</Label>
                    <span class="text-xs text-gray-500">{{ formatTemperature(temperature[0]) }}</span>
                  </div>
                  <Slider
                    id="temperature"
                    v-model="temperature"
                    :min="0"
                    :max="1"
                    :step="0.1"
                  />
                  <p class="text-xs text-gray-500">
                    Controls randomness: lower values are more deterministic, higher values are more creative
                  </p>
                </div>

                <!-- Max Tokens -->
                <div class="space-y-2">
                  <Label for="max-tokens">Max Tokens: {{ maxTokens[0] }}</Label>
                  <Slider
                    id="max-tokens"
                    v-model="maxTokens"
                    :min="100"
                    :max="8192"
                    :step="100"
                  />
                  <p class="text-xs text-gray-500">
                    Maximum number of tokens to generate
                  </p>
                </div>
              </div>

              <!-- Save Button -->
              <Button @click="saveSettings" class="w-full">
                <Save class="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="webllm">
        <WebLLMSettings />
      </TabsContent>
    </Tabs>
  </div>
</template> 