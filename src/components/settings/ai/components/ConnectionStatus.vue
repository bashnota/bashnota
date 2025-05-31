<template>
  <Alert :variant="alertVariant" class="mb-6">
    <div class="flex items-start">
      <div class="mr-2 mt-0.5">
        <component :is="statusIcon" :class="iconClass" />
      </div>
      <div class="flex-1">
        <AlertTitle>{{ statusTitle }}</AlertTitle>
        <AlertDescription>
          <p>{{ statusDescription }}</p>
          <div v-if="showDetails && (error || lastTested)" class="mt-2 space-y-1">
            <div v-if="error" class="text-red-600 text-xs">
              Error: {{ error }}
            </div>
            <div v-if="lastTested" class="text-xs text-gray-500">
              Last tested: {{ formatTime(lastTested) }}
            </div>
          </div>
        </AlertDescription>
      </div>
      <div v-if="showActions" class="ml-2">
        <Button 
          variant="outline" 
          size="sm" 
          @click="handleRetry"
          :disabled="isLoading"
        >
          <RefreshCwIcon :class="{'animate-spin': isLoading}" class="mr-2 h-3 w-3" />
          {{ retryButtonText }}
        </Button>
      </div>
    </div>
  </Alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  InfoIcon, 
  RefreshCwIcon,
  AlertTriangleIcon
} from 'lucide-vue-next'

export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error' | 'warning'

export interface ConnectionStatusProps {
  state: ConnectionState
  providerName: string
  customTitle?: string
  customDescription?: string
  error?: string
  lastTested?: Date
  showDetails?: boolean
  showActions?: boolean
  retryButtonText?: string
  isLoading?: boolean
}

export interface ConnectionStatusEmits {
  (e: 'retry'): void
}

const props = withDefaults(defineProps<ConnectionStatusProps>(), {
  showDetails: true,
  showActions: true,
  retryButtonText: 'Retry',
  isLoading: false
})

const emit = defineEmits<ConnectionStatusEmits>()

// Computed properties
const statusConfig = computed(() => {
  switch (props.state) {
    case 'connected':
      return {
        variant: 'default' as const,
        icon: CheckCircleIcon,
        iconClass: 'h-5 w-5 text-green-500',
        title: props.customTitle || `Connected to ${props.providerName}`,
        description: props.customDescription || `Successfully connected to ${props.providerName}. You can now configure model settings.`
      }
    case 'disconnected':
      return {
        variant: 'destructive' as const,
        icon: XCircleIcon,
        iconClass: 'h-5 w-5 text-red-500',
        title: props.customTitle || 'Not Connected',
        description: props.customDescription || `Not connected to ${props.providerName}. Please check your configuration and try again.`
      }
    case 'connecting':
      return {
        variant: 'default' as const,
        icon: RefreshCwIcon,
        iconClass: 'h-5 w-5 text-blue-500 animate-spin',
        title: props.customTitle || 'Connecting...',
        description: props.customDescription || `Connecting to ${props.providerName}...`
      }
    case 'warning':
      return {
        variant: 'destructive' as const,
        icon: AlertTriangleIcon,
        iconClass: 'h-5 w-5 text-yellow-500',
        title: props.customTitle || 'Connection Warning',
        description: props.customDescription || `There may be an issue with your ${props.providerName} connection.`
      }
    case 'error':
    default:
      return {
        variant: 'destructive' as const,
        icon: XCircleIcon,
        iconClass: 'h-5 w-5 text-red-500',
        title: props.customTitle || 'Connection Error',
        description: props.customDescription || `Failed to connect to ${props.providerName}. Please check your settings.`
      }
  }
})

const alertVariant = computed(() => statusConfig.value.variant)
const statusIcon = computed(() => statusConfig.value.icon)
const iconClass = computed(() => statusConfig.value.iconClass)
const statusTitle = computed(() => statusConfig.value.title)
const statusDescription = computed(() => statusConfig.value.description)

// Methods
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const handleRetry = () => {
  emit('retry')
}
</script> 