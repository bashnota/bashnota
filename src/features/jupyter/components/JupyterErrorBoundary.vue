<template>
  <div v-if="hasError" class="error-boundary p-4 border border-destructive/20 rounded-md bg-destructive/5">
    <div class="flex items-start gap-3">
      <AlertTriangle class="h-5 w-5 text-destructive mt-0.5 shrink-0" />
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-destructive mb-1">
          {{ errorTitle }}
        </h3>
        <p class="text-xs text-muted-foreground mb-3">
          {{ errorMessage }}
        </p>
        
        <!-- Error Details (collapsible) -->
        <details v-if="errorDetails" class="mb-3">
          <summary class="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Show error details
          </summary>
          <pre class="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">{{ errorDetails }}</pre>
        </details>
        
        <!-- Action Buttons -->
        <div class="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            @click="handleRetry"
            :disabled="isRetrying"
          >
            <RotateCw class="h-3 w-3 mr-1" :class="{ 'animate-spin': isRetrying }" />
            Retry
          </Button>
          <Button
            size="sm"
            variant="ghost"
            @click="handleDismiss"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Slot content when no error -->
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/ui/button'
import { AlertTriangle, RotateCw } from 'lucide-vue-next'

interface Props {
  error?: Error | string | null
  title?: string
  retryable?: boolean
}

interface Emits {
  retry: []
  dismiss: []
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  title: 'Something went wrong',
  retryable: true
})

const emit = defineEmits<Emits>()

// Local state
const isRetrying = ref(false)
const isDismissed = ref(false)

// Computed properties
const hasError = computed(() => {
  return !!props.error && !isDismissed.value
})

const errorTitle = computed(() => {
  if (typeof props.error === 'string') {
    return props.title
  }
  return props.error?.name || props.title
})

const errorMessage = computed(() => {
  if (typeof props.error === 'string') {
    return props.error
  }
  return props.error?.message || 'An unexpected error occurred'
})

const errorDetails = computed(() => {
  if (typeof props.error === 'string') {
    return null
  }
  return props.error?.stack || null
})

// Event handlers
const handleRetry = async () => {
  if (!props.retryable) return
  
  isRetrying.value = true
  try {
    emit('retry')
    // Reset dismissed state on retry
    isDismissed.value = false
  } finally {
    // Add a small delay to show the loading state
    setTimeout(() => {
      isRetrying.value = false
    }, 500)
  }
}

const handleDismiss = () => {
  isDismissed.value = true
  emit('dismiss')
}

// Watch for error changes to reset dismissed state
watch(() => props.error, (newError) => {
  if (newError) {
    isDismissed.value = false
  }
})
</script>

<style scoped>
.error-boundary {
  @apply transition-all duration-200;
}

details summary {
  @apply list-none;
}

details summary::-webkit-details-marker {
  display: none;
}

details[open] summary::after {
  content: ' ▼';
}

details:not([open]) summary::after {
  content: ' ▶';
}
</style> 








