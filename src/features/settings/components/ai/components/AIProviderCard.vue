<script setup lang="ts">
import { ref, computed } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'vue-sonner'
import { 
  Eye, 
  EyeOff, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  Key,
  Settings,
  Loader2
} from 'lucide-vue-next'

interface ProviderConfig {
  id: string
  name: string
  icon: any
  description: string
  requiresApiKey: boolean
  setupUrl: string
  features: string[]
  modelCount: number
}

interface Props {
  provider: ProviderConfig
  isSelected: boolean
  apiKey: string
}

interface Emits {
  (e: 'select', providerId: string): void
  (e: 'update-api-key', providerId: string, apiKey: string): void
  (e: 'open-webllm-settings'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const showApiKey = ref(false)
const localApiKey = ref(props.apiKey)
const isTestingConnection = ref(false)
const connectionStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle')

// Computed
const isConfigured = computed(() => {
  if (props.provider.requiresApiKey) {
    return !!props.apiKey
  }
  return true
})

const statusColor = computed(() => {
  switch (connectionStatus.value) {
    case 'success': return 'text-green-600'
    case 'error': return 'text-red-600'
    case 'testing': return 'text-blue-600'
    default: return 'text-gray-600'
  }
})

const statusIcon = computed(() => {
  switch (connectionStatus.value) {
    case 'success': return CheckCircle
    case 'error': return AlertTriangle
    case 'testing': return Loader2
    default: return CheckCircle
  }
})

// Methods
const handleSelect = () => {
  if (isConfigured.value) {
    emit('select', props.provider.id)
  } else {
    toast.error(`Please configure ${props.provider.name} first`)
  }
}

const handleApiKeyUpdate = () => {
  emit('update-api-key', props.provider.id, localApiKey.value)
  
  if (localApiKey.value) {
    toast.success(`API key saved for ${props.provider.name}`)
    testConnection()
  } else {
    toast.success(`API key removed for ${props.provider.name}`)
    connectionStatus.value = 'idle'
  }
}

const clearApiKey = () => {
  localApiKey.value = ''
  handleApiKeyUpdate()
}

const testConnection = async () => {
  if (!props.provider.requiresApiKey || !localApiKey.value) return
  
  isTestingConnection.value = true
  connectionStatus.value = 'testing'
  
  try {
    // Simulate connection test - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    connectionStatus.value = 'success'
    toast.success(`Connected to ${props.provider.name}`)
  } catch (error) {
    connectionStatus.value = 'error'
    toast.error(`Failed to connect to ${props.provider.name}`)
  } finally {
    isTestingConnection.value = false
  }
}

const openWebLLMSettings = () => {
  emit('open-webllm-settings')
}

const openSetupUrl = () => {
  window.open(props.provider.setupUrl, '_blank')
}
</script>

<template>
  <Card :class="[
    'relative transition-all duration-200 cursor-pointer',
    isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50',
    !isConfigured ? 'opacity-75' : ''
  ]">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <component :is="provider.icon" class="h-6 w-6 text-primary" />
          <div>
            <CardTitle class="text-lg">{{ provider.name }}</CardTitle>
            <CardDescription class="text-sm">{{ provider.description }}</CardDescription>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- Configuration Status -->
          <component 
            :is="statusIcon" 
            :class="[
              'h-4 w-4',
              statusColor,
              connectionStatus === 'testing' ? 'animate-spin' : ''
            ]" 
          />
          
          <!-- Selected Badge -->
          <Badge v-if="isSelected" variant="default" class="text-xs">
            Selected
          </Badge>
          
          <!-- Configuration Badge -->
          <Badge 
            v-if="isConfigured" 
            variant="secondary" 
            class="text-xs"
          >
            Configured
          </Badge>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Features -->
      <div>
        <div class="flex flex-wrap gap-1">
          <Badge 
            v-for="feature in provider.features" 
            :key="feature" 
            variant="outline" 
            class="text-xs"
          >
            {{ feature }}
          </Badge>
        </div>
      </div>

      <!-- API Key Configuration (if required) -->
      <div v-if="provider.requiresApiKey" class="space-y-3">
        <Label class="text-sm font-medium">API Key</Label>
        
        <div class="flex space-x-2">
          <div class="relative flex-1">
            <Input
              v-model="localApiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="Enter your API key"
              class="pr-10"
              @blur="handleApiKeyUpdate"
              @keydown.enter="handleApiKeyUpdate"
            />
            <Button
              variant="ghost"
              size="sm"
              class="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              @click="showApiKey = !showApiKey"
            >
              <component :is="showApiKey ? EyeOff : Eye" class="h-3 w-3" />
            </Button>
          </div>
          
          <Button
            v-if="localApiKey"
            variant="outline"
            size="sm"
            @click="clearApiKey"
          >
            <Key class="h-3 w-3" />
          </Button>
        </div>

        <!-- Setup Link -->
        <Button
          variant="link"
          size="sm"
          class="p-0 h-auto text-xs"
          @click="openSetupUrl"
        >
          <ExternalLink class="mr-1 h-3 w-3" />
          Get API Key
        </Button>
      </div>

      <!-- Special WebLLM Settings -->
      <div v-if="provider.id === 'webllm'" class="space-y-2">
        <Button
          variant="outline"
          size="sm"
          class="w-full"
          @click="openWebLLMSettings"
        >
          <Settings class="mr-2 h-3 w-3" />
          Configure WebLLM Models
        </Button>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-2">
        <Button
          v-if="!isSelected"
          class="flex-1"
          :disabled="!isConfigured"
          @click="handleSelect"
        >
          Select Provider
        </Button>
        
        <Button
          v-if="isSelected"
          variant="secondary"
          class="flex-1"
          disabled
        >
          <CheckCircle class="mr-2 h-3 w-3" />
          Active
        </Button>

        <Button
          v-if="provider.requiresApiKey && localApiKey"
          variant="outline"
          size="sm"
          :disabled="isTestingConnection"
          @click="testConnection"
        >
          <component 
            :is="isTestingConnection ? Loader2 : CheckCircle" 
            :class="[
              'h-3 w-3',
              isTestingConnection ? 'animate-spin' : ''
            ]" 
          />
        </Button>
      </div>

      <!-- Model Count Info -->
      <div class="text-xs text-muted-foreground text-center">
        {{ provider.modelCount }} models available
      </div>
    </CardContent>
  </Card>
</template>