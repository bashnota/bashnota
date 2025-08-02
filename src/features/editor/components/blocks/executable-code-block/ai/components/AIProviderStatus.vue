<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { AlertTriangle, Settings, ExternalLink, CheckCircle } from 'lucide-vue-next'

interface Props {
  message?: string
  isConnected?: boolean
  providerName?: string
  modelName?: string
  embedded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  message: 'AI provider not configured',
  isConnected: false,
  providerName: 'OpenAI',
  modelName: 'gpt-4',
  embedded: false
})

interface Emits {
  'open-settings': []
  'test-connection': []
}

const emit = defineEmits<Emits>()

// Computed
const statusVariant = computed(() => {
  return props.isConnected ? 'default' : 'secondary'
})

const statusIcon = computed(() => {
  return props.isConnected ? CheckCircle : AlertTriangle
})

const statusMessage = computed(() => {
  if (props.isConnected) {
    return `Connected to ${props.providerName} (${props.modelName})`
  }
  return props.message
})

// Methods
const openSettings = () => {
  emit('open-settings')
}

const testConnection = () => {
  emit('test-connection')
}

const openDocsLink = () => {
  // Open documentation in new tab
  window.open('https://docs.bashnota.dev/ai-configuration', '_blank')
}
</script>

<template>
  <div 
    class="ai-provider-status"
    :class="{
      'ai-provider-status--embedded': embedded,
      'ai-provider-status--connected': isConnected,
      'ai-provider-status--disconnected': !isConnected
    }"
  >
    <div class="ai-provider-content">
      <!-- Status Icon and Message -->
      <div class="ai-provider-info">
        <div class="ai-provider-icon">
          <component 
            :is="statusIcon" 
            class="w-5 h-5"
            :class="{
              'text-green-500': isConnected,
              'text-yellow-500': !isConnected
            }"
          />
        </div>
        
        <div class="ai-provider-text">
          <div class="ai-provider-message">
            {{ statusMessage }}
          </div>
          
          <div v-if="!isConnected" class="ai-provider-hint">
            Configure your AI provider to enable smart assistance
          </div>
        </div>
        
        <!-- Provider Badge -->
        <Badge 
          v-if="isConnected"
          :variant="statusVariant"
          class="ai-provider-badge"
        >
          {{ providerName }}
        </Badge>
      </div>

      <!-- Actions -->
      <div class="ai-provider-actions">
        <Button
          v-if="isConnected"
          @click="testConnection"
          variant="outline"
          size="sm"
          class="ai-provider-btn"
        >
          Test
        </Button>
        
        <Button
          @click="openSettings"
          variant="outline"
          size="sm"
          class="ai-provider-btn"
        >
          <Settings class="w-4 h-4" />
          Settings
        </Button>
        
        <Button
          v-if="!isConnected"
          @click="openDocsLink"
          variant="ghost"
          size="sm"
          class="ai-provider-btn"
        >
          <ExternalLink class="w-4 h-4" />
          Docs
        </Button>
      </div>
    </div>

    <!-- Quick Setup Hint -->
    <div v-if="!isConnected && !embedded" class="ai-provider-setup">
      <div class="ai-setup-text">
        Quick setup: Add your OpenAI API key in settings to get started
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-provider-status {
  @apply p-4 rounded-xl border transition-all duration-200;
  background: linear-gradient(135deg, hsl(var(--muted) / 0.3), hsl(var(--muted) / 0.1));
}

.ai-provider-status--embedded {
  @apply p-3 rounded-lg;
}

.ai-provider-status--connected {
  @apply border-green-200 bg-green-50/50;
  background: linear-gradient(135deg, hsl(142 76% 36% / 0.1), hsl(142 76% 36% / 0.05));
}

.ai-provider-status--disconnected {
  @apply border-yellow-200 bg-yellow-50/50;
  background: linear-gradient(135deg, hsl(48 96% 53% / 0.1), hsl(48 96% 53% / 0.05));
}

.ai-provider-content {
  @apply flex items-center justify-between gap-4;
}

.ai-provider-info {
  @apply flex items-center gap-3 flex-1;
}

.ai-provider-icon {
  @apply flex items-center justify-center p-2 rounded-lg;
  background: hsl(var(--background) / 0.8);
}

.ai-provider-text {
  @apply flex-1;
}

.ai-provider-message {
  @apply text-sm font-medium;
}

.ai-provider-hint {
  @apply text-xs text-muted-foreground mt-1;
}

.ai-provider-badge {
  @apply text-xs;
}

.ai-provider-actions {
  @apply flex items-center gap-2;
}

.ai-provider-btn {
  @apply gap-2 h-8;
}

.ai-provider-setup {
  @apply mt-3 pt-3 border-t border-dashed;
  border-color: hsl(var(--border) / 0.5);
}

.ai-setup-text {
  @apply text-xs text-muted-foreground text-center;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .ai-provider-status--connected {
    @apply border-green-800 bg-green-950/30;
  }
  
  .ai-provider-status--disconnected {
    @apply border-yellow-800 bg-yellow-950/30;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .ai-provider-content {
    @apply flex-col items-start gap-3;
  }
  
  .ai-provider-info {
    @apply w-full;
  }
  
  .ai-provider-actions {
    @apply w-full justify-end;
  }
}
</style>
