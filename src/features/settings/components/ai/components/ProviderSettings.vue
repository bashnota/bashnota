<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, ExternalLink, Zap } from 'lucide-vue-next'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import { toast } from 'vue-sonner'

interface Props {
  providerId: string
  providerName: string
  icon: any
  description: string
  requiresApiKey: boolean
  setupUrl?: string
  features: string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [providerId: string]
  'update-api-key': [providerId: string, apiKey: string]
}>()

const { checkProviderAvailability, availableProviders } = useAIProviders()
const aiSettings = useAISettingsStore()

// Local state
const apiKey = ref('')
const showApiKey = ref(false)
const isChecking = ref(false)
const isAvailable = ref(false)
const lastChecked = ref<Date | null>(null)

// Computed
const isSelected = computed(() => aiSettings.settings.preferredProviderId === props.providerId)
const hasApiKey = computed(() => !!apiKey.value)
const canCheck = computed(() => !props.requiresApiKey || hasApiKey.value)

// Methods
const handleApiKeyUpdate = (value: string) => {
  apiKey.value = value
  emit('update-api-key', props.providerId, value)
  
  // Auto-check availability when API key is entered
  if (value && props.requiresApiKey) {
    checkAvailability()
  }
}

const checkAvailability = async () => {
  if (!canCheck.value) return
  
  isChecking.value = true
  try {
    isAvailable.value = await checkProviderAvailability(props.providerId)
    lastChecked.value = new Date()
    
    if (isAvailable.value) {
      toast.success(`${props.providerName} is available and ready to use`)
    } else {
      toast.error(`${props.providerName} is not available. Check your configuration.`)
    }
  } catch (error) {
    console.error('Error checking provider availability:', error)
    isAvailable.value = false
    toast.error(`Failed to check ${props.providerName} availability`)
  } finally {
    isChecking.value = false
  }
}

const selectProvider = () => {
  if (props.requiresApiKey && !hasApiKey.value) {
    toast.error('Please enter an API key first')
    return
  }
  
  emit('select', props.providerId)
}

const openSetupUrl = () => {
  if (props.setupUrl) {
    window.open(props.setupUrl, '_blank')
  }
}

// Initialize
onMounted(() => {
  // Load existing API key
  apiKey.value = aiSettings.getApiKey(props.providerId)
  
  // Check if provider is in available list
  isAvailable.value = availableProviders.value.includes(props.providerId)
})
</script>

<template>
  <Card :class="[
    'transition-all duration-200 cursor-pointer border-2',
    isSelected 
      ? 'border-primary bg-primary/5 shadow-md' 
      : 'border-border hover:border-primary/50 hover:shadow-sm'
  ]">
    <CardHeader class="pb-4">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-muted">
            <component :is="icon" class="h-6 w-6" />
          </div>
          <div>
            <CardTitle class="flex items-center gap-2">
              {{ providerName }}
              <Badge v-if="isSelected" variant="default" class="text-xs">
                Selected
              </Badge>
              <Badge 
                v-if="lastChecked" 
                :variant="isAvailable ? 'default' : 'destructive'" 
                class="text-xs"
              >
                <CheckCircle v-if="isAvailable" class="w-3 h-3 mr-1" />
                <XCircle v-else class="w-3 h-3 mr-1" />
                {{ isAvailable ? 'Available' : 'Unavailable' }}
              </Badge>
            </CardTitle>
            <CardDescription>{{ description }}</CardDescription>
          </div>
        </div>
        
        <Button
          v-if="canCheck"
          variant="outline"
          size="sm"
          @click="selectProvider"
          :disabled="!isAvailable && requiresApiKey"
        >
          <Zap class="w-4 h-4 mr-1" />
          {{ isSelected ? 'Selected' : 'Select' }}
        </Button>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- API Key Input (if required) -->
      <div v-if="requiresApiKey" class="space-y-3">
        <div class="flex items-center justify-between">
          <Label>API Key</Label>
          <Button
            v-if="setupUrl"
            variant="ghost"
            size="sm"
            @click="openSetupUrl"
            class="text-xs"
          >
            <ExternalLink class="w-3 h-3 mr-1" />
            Get API Key
          </Button>
        </div>
        
        <div class="relative">
          <Input
            v-model="apiKey"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="Enter your API key"
            class="pr-20"
            @update:model-value="handleApiKeyUpdate"
          />
          <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              @click="showApiKey = !showApiKey"
              class="h-6 w-6 p-0"
            >
              <Eye v-if="!showApiKey" class="h-3 w-3" />
              <EyeOff v-else class="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <Alert v-if="requiresApiKey && !hasApiKey" class="border-amber-200 bg-amber-50 dark:bg-amber-950">
          <AlertDescription class="text-sm">
            An API key is required to use {{ providerName }}. 
            <Button
              v-if="setupUrl"
              variant="link"
              size="sm"
              @click="openSetupUrl"
              class="p-0 h-auto text-sm underline"
            >
              Get one here
            </Button>
          </AlertDescription>
        </Alert>
      </div>

      <!-- Features -->
      <div class="space-y-2">
        <Label class="text-sm font-medium">Features</Label>
        <div class="flex flex-wrap gap-1">
          <Badge
            v-for="feature in features"
            :key="feature"
            variant="secondary"
            class="text-xs"
          >
            {{ feature }}
          </Badge>
        </div>
      </div>

      <!-- Status Check -->
      <div class="flex items-center justify-between pt-2 border-t">
        <div class="text-sm text-muted-foreground">
          <span v-if="lastChecked">
            Last checked: {{ lastChecked.toLocaleTimeString() }}
          </span>
          <span v-else>Not checked yet</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          @click="checkAvailability"
          :disabled="!canCheck || isChecking"
        >
          <Loader2 v-if="isChecking" class="w-3 h-3 mr-1 animate-spin" />
          {{ isChecking ? 'Checking...' : 'Check Status' }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>