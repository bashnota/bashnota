<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar } from '@/components/ui/avatar'
import { XIcon, RefreshCwIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import MessageItem from './MessageItem.vue'
import { type ConversationMessage } from '../composables/useConversation'
import { ref, onUpdated, nextTick } from 'vue'

const props = defineProps<{
  conversationHistory: ConversationMessage[]
  isLoading: boolean
  error: string
  providerName: string
  formatTimestamp: (date?: Date) => string
}>()

const emit = defineEmits([
  'copy-message',
  'insert-message',
  'select-text',
  'retry'
])

// Reference to scroll area
const scrollAreaRef = ref<HTMLElement | null>(null)

// Handle copy message
const handleCopyMessage = (content: string) => {
  emit('copy-message', content)
}

// Handle insert message
const handleInsertMessage = (content: string) => {
  emit('insert-message', content)
}

// Handle text selection
const handleSelectText = (text: string) => {
  emit('select-text', text)
}

// Retry after error
const retryGeneration = () => {
  emit('retry')
}

// Auto-scroll to bottom when new messages arrive
onUpdated(() => {
  nextTick(() => {
    if (scrollAreaRef.value) {
      const scrollContainer = scrollAreaRef.value.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  })
})
</script>

<template>
  <ScrollArea ref="scrollAreaRef" class="flex-1 p-4 space-y-4">
    <!-- Conversation Messages -->
    <MessageItem
      v-for="(message, index) in conversationHistory"
      :key="message.id || index"
      :message="message"
      :provider-name="providerName"
      :timestamp="formatTimestamp(message.timestamp)"
      @copy="handleCopyMessage"
      @insert="handleInsertMessage"
      @select="handleSelectText"
    />
    
    <!-- Enhanced Loading Indicator -->
    <div v-if="isLoading" class="loading-indicator mb-3">
      <div class="text-sm text-muted-foreground p-2.5 bg-muted/20 rounded-lg max-w-[80%] ml-auto">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="sr-only">AI is generating a response...</span>
      </div>
    </div>
    
    <!-- Error Message -->
    <div v-if="error" class="error-message mb-3">
      <div class="space-y-1.5 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-destructive">Error</span>
        </div>
        <div class="text-sm font-medium text-destructive mt-1">{{ error }}</div>
        <p class="text-xs text-muted-foreground mt-1">The AI encountered a problem while generating a response.</p>
        <Button 
          variant="secondary" 
          size="sm"
          class="h-7 text-xs mt-2 bg-background/80"
          @click="retryGeneration"
        >
          <RefreshCwIcon class="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    </div>
  </ScrollArea>
</template>

<style scoped>
/* Animation for the typing indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  column-gap: 0.5rem;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  background-color: hsl(var(--primary) / 0.7);
  border-radius: 50%;
  display: block;
  opacity: 0.4;
}

.typing-indicator span:nth-child(1) {
  animation: pulse 1s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation: pulse 1s infinite ease-in-out 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation: pulse 1s infinite ease-in-out 0.4s;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* Fade in animation for the loading indicator */
.loading-indicator {
  animation: fadeIn 0.3s ease-in-out;
}

/* Error message styling */
.error-message {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shake {
  10%, 90% {
    transform: translateX(-1px);
  }
  20%, 80% {
    transform: translateX(2px);
  }
  30%, 50%, 70% {
    transform: translateX(-2px);
  }
  40%, 60% {
    transform: translateX(1px);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>