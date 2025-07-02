<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/card'
import { Label } from '@/ui/label'
import { Slider } from '@/ui/slider'
import { Textarea } from '@/ui/textarea'
import { Switch } from '@/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { Button } from '@/ui/button'
import { toast } from '@/ui/toast'
import { RotateCw, Wand2 } from 'lucide-vue-next'

// Settings state
const temperature = ref([0.7])
const maxTokens = ref([2000])
const topP = ref([0.9])
const frequencyPenalty = ref([0.0])
const presencePenalty = ref([0.0])
const customPrompt = ref('')
const enableStreaming = ref(true)
const retryOnFailure = ref(true)
const maxRetries = ref([3])
const timeoutDuration = ref([30])
const responseFormat = ref('markdown')

// Options
const responseFormatOptions = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'plain', label: 'Plain Text' },
  { value: 'html', label: 'HTML' },
  { value: 'json', label: 'JSON' }
]

// Load settings from localStorage
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('ai-generation-settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      temperature.value = [settings.temperature?.[0] || 0.7]
      maxTokens.value = [settings.maxTokens?.[0] || 2000]
      topP.value = [settings.topP?.[0] || 0.9]
      frequencyPenalty.value = [settings.frequencyPenalty?.[0] || 0.0]
      presencePenalty.value = [settings.presencePenalty?.[0] || 0.0]
      customPrompt.value = settings.customPrompt || ''
      enableStreaming.value = settings.enableStreaming ?? true
      retryOnFailure.value = settings.retryOnFailure ?? true
      maxRetries.value = [settings.maxRetries?.[0] || 3]
      timeoutDuration.value = [settings.timeoutDuration?.[0] || 30]
      responseFormat.value = settings.responseFormat || 'markdown'
    }
  } catch (error) {
    console.error('Failed to load AI generation settings:', error)
  }
}

// Save settings to localStorage
const saveSettings = () => {
  const settings = {
    temperature: temperature.value,
    maxTokens: maxTokens.value,
    topP: topP.value,
    frequencyPenalty: frequencyPenalty.value,
    presencePenalty: presencePenalty.value,
    customPrompt: customPrompt.value,
    enableStreaming: enableStreaming.value,
    retryOnFailure: retryOnFailure.value,
    maxRetries: maxRetries.value,
    timeoutDuration: timeoutDuration.value,
    responseFormat: responseFormat.value
  }
  
  localStorage.setItem('ai-generation-settings', JSON.stringify(settings))
  
  // Dispatch event to notify other parts of the app
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('ai-generation-settings-changed', { detail: settings }))
  }
}

// Reset to defaults
const resetToDefaults = () => {
  temperature.value = [0.7]
  maxTokens.value = [2000]
  topP.value = [0.9]
  frequencyPenalty.value = [0.0]
  presencePenalty.value = [0.0]
  customPrompt.value = ''
  enableStreaming.value = true
  retryOnFailure.value = true
  maxRetries.value = [3]
  timeoutDuration.value = [30]
  responseFormat.value = 'markdown'
  
  saveSettings()
  
  toast({
    title: 'Settings Reset',
    description: 'AI generation settings have been reset to defaults',
    variant: 'default'
  })
}

// Handle setting changes
const handleSettingChange = () => {
  saveSettings()
}

// Get temperature description
const getTemperatureDescription = (temp: number) => {
  if (temp <= 0.3) return 'Very focused and deterministic'
  if (temp <= 0.5) return 'Focused with some creativity'
  if (temp <= 0.7) return 'Balanced creativity and focus'
  if (temp <= 0.9) return 'Creative with good coherence'
  return 'Very creative and unpredictable'
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
  <div class="space-y-6 max-w-2xl">
    <!-- Core Parameters -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Wand2 class="h-5 w-5" />
          Core Generation Parameters
        </CardTitle>
        <CardDescription>Control the fundamental behavior of AI text generation</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>Temperature ({{ temperature[0].toFixed(2) }})</Label>
            <Slider
              v-model="temperature"
              :min="0"
              :max="2"
              :step="0.05"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              {{ getTemperatureDescription(temperature[0]) }}
            </p>
          </div>
          
          <div class="space-y-2">
            <Label>Max Tokens ({{ maxTokens[0] }})</Label>
            <Slider
              v-model="maxTokens"
              :min="100"
              :max="8000"
              :step="100"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Maximum length for AI responses (higher = longer responses)
            </p>
          </div>
          
          <div class="space-y-2">
            <Label>Top P ({{ topP[0].toFixed(2) }})</Label>
            <Slider
              v-model="topP"
              :min="0.1"
              :max="1.0"
              :step="0.05"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Controls diversity by limiting word choices (lower = more focused)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Advanced Parameters -->
    <Card>
      <CardHeader>
        <CardTitle>Advanced Parameters</CardTitle>
        <CardDescription>Fine-tune AI behavior for specific use cases</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label>Frequency Penalty ({{ frequencyPenalty[0].toFixed(2) }})</Label>
            <Slider
              v-model="frequencyPenalty"
              :min="-2.0"
              :max="2.0"
              :step="0.1"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Reduces repetition of words (positive = less repetition)
            </p>
          </div>
          
          <div class="space-y-2">
            <Label>Presence Penalty ({{ presencePenalty[0].toFixed(2) }})</Label>
            <Slider
              v-model="presencePenalty"
              :min="-2.0"
              :max="2.0"
              :step="0.1"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Encourages new topics (positive = more likely to introduce new topics)
            </p>
          </div>
          
          <div class="space-y-2">
            <Label>Response Format</Label>
            <Select v-model="responseFormat" @update:model-value="handleSettingChange">
              <SelectTrigger>
                <SelectValue placeholder="Select response format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in responseFormatOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Preferred format for AI responses
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- System Prompt -->
    <Card>
      <CardHeader>
        <CardTitle>Custom System Prompt</CardTitle>
        <CardDescription>Set a custom system prompt to influence AI behavior</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="custom-prompt">System Prompt (Optional)</Label>
          <Textarea
            id="custom-prompt"
            v-model="customPrompt"
            @input="handleSettingChange"
            placeholder="Enter a custom system prompt to influence AI behavior across all interactions..."
            rows="4"
          />
          <p class="text-xs text-muted-foreground">
            This prompt will be prepended to all AI conversations to set context and behavior expectations
          </p>
        </div>
      </CardContent>
    </Card>

    <!-- Behavior Settings -->
    <Card>
      <CardHeader>
        <CardTitle>Behavior Settings</CardTitle>
        <CardDescription>Configure how the AI handles requests and errors</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Enable Streaming</Label>
              <p class="text-sm text-muted-foreground">
                Show AI responses as they're being generated
              </p>
            </div>
            <Switch
              v-model:checked="enableStreaming"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Retry on Failure</Label>
              <p class="text-sm text-muted-foreground">
                Automatically retry failed requests
              </p>
            </div>
            <Switch
              v-model:checked="retryOnFailure"
              @update:checked="handleSettingChange"
            />
          </div>
          
          <div v-if="retryOnFailure" class="space-y-2">
            <Label>Max Retries ({{ maxRetries[0] }})</Label>
            <Slider
              v-model="maxRetries"
              :min="1"
              :max="5"
              :step="1"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Maximum number of retry attempts for failed requests
            </p>
          </div>
          
          <div class="space-y-2">
            <Label>Timeout Duration ({{ timeoutDuration[0] }}s)</Label>
            <Slider
              v-model="timeoutDuration"
              :min="10"
              :max="120"
              :step="5"
              @update:model-value="handleSettingChange"
            />
            <p class="text-xs text-muted-foreground">
              Maximum time to wait for AI responses before timing out
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Reset Section -->
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>Restore AI generation settings to their default values</CardDescription>
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