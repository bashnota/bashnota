<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Settings2, Clock } from 'lucide-vue-next'

// Base components
import SettingSlider from '@/features/settings/components/base/SettingSlider.vue'

interface Props {
  temperature: number
  maxTokens: number
  requestTimeout: number
  customPrompt: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:temperature': [value: number]
  'update:maxTokens': [value: number]
  'update:requestTimeout': [value: number]
  'update:customPrompt': [value: string]
}>()

// Computed for better UX descriptions
const temperatureDescription = computed(() => {
  if (props.temperature <= 0.3) return 'Very focused and deterministic responses'
  if (props.temperature <= 0.7) return 'Balanced creativity and consistency'
  if (props.temperature <= 1.2) return 'Creative and varied responses'
  return 'Highly creative and unpredictable responses'
})

const maxTokensDescription = computed(() => {
  if (props.maxTokens <= 512) return 'Short responses, good for quick answers'
  if (props.maxTokens <= 2048) return 'Medium responses, suitable for most tasks'
  if (props.maxTokens <= 4096) return 'Long responses, good for detailed explanations'
  return 'Very long responses, suitable for complex tasks'
})

const timeoutDescription = computed(() => {
  if (props.requestTimeout <= 15) return 'Quick timeout, may fail on complex requests'
  if (props.requestTimeout <= 30) return 'Standard timeout, good for most requests'
  if (props.requestTimeout <= 60) return 'Extended timeout, good for complex requests'
  return 'Very long timeout, may cause slow user experience'
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <MessageSquare class="h-5 w-5" />
        Generation Settings
      </CardTitle>
      <CardDescription>
        Fine-tune how AI models generate responses
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Temperature -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <Settings2 class="h-4 w-4" />
          <Label>Temperature</Label>
          <span class="text-sm text-muted-foreground">({{ props.temperature }})</span>
        </div>
        
        <SettingSlider
          label="Temperature"
          :model-value="[props.temperature]"
          :min="0"
          :max="2"
          :step="0.1"
          @update:model-value="(value) => emit('update:temperature', value[0])"
        />
        
        <p class="text-sm text-muted-foreground">
          {{ temperatureDescription }}
        </p>
        
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>Focused</span>
          <span>Balanced</span>
          <span>Creative</span>
        </div>
      </div>

      <!-- Max Tokens -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <MessageSquare class="h-4 w-4" />
          <Label>Max Tokens</Label>
          <span class="text-sm text-muted-foreground">({{ props.maxTokens.toLocaleString() }})</span>
        </div>
        
        <SettingSlider
          label="Max Tokens"
          :model-value="[props.maxTokens]"
          :min="256"
          :max="8192"
          :step="256"
          @update:model-value="(value) => emit('update:maxTokens', value[0])"
        />
        
        <p class="text-sm text-muted-foreground">
          {{ maxTokensDescription }}
        </p>
        
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>Short</span>
          <span>Medium</span>
          <span>Long</span>
          <span>Very Long</span>
        </div>
      </div>

      <!-- Request Timeout -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <Clock class="h-4 w-4" />
          <Label>Request Timeout</Label>
          <span class="text-sm text-muted-foreground">({{ props.requestTimeout }}s)</span>
        </div>
        
        <SettingSlider
          label="Request Timeout"
          :model-value="[props.requestTimeout]"
          :min="10"
          :max="120"
          :step="5"
          @update:model-value="(value) => emit('update:requestTimeout', value[0])"
        />
        
        <p class="text-sm text-muted-foreground">
          {{ timeoutDescription }}
        </p>
        
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>Quick</span>
          <span>Standard</span>
          <span>Extended</span>
          <span>Very Long</span>
        </div>
      </div>

      <!-- Custom Prompt -->
      <div class="space-y-3">
        <Label>System Prompt</Label>
        <Textarea
          :value="props.customPrompt"
          placeholder="You are a helpful assistant..."
          class="min-h-[100px] resize-none"
          @input="(e: any) => emit('update:customPrompt', e.target.value)"
        />
        <p class="text-sm text-muted-foreground">
          This prompt will be sent with every request to guide the AI's behavior and personality.
        </p>
      </div>
    </CardContent>
  </Card>
</template>