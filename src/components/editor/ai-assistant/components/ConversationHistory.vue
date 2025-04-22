<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar } from '@/components/ui/avatar'
import { XIcon, LoaderIcon, RefreshCwIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import MessageItem from './MessageItem.vue'
import { type ConversationMessage } from '../composables/useConversation'

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
</script>

<template>
  <ScrollArea class="flex-1 p-4 space-y-4">
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
    
    <!-- Loading Indicator -->
    <div v-if="isLoading" class="flex items-start gap-3">
      <Avatar class="bg-primary/10">
        <div class="h-4 w-4 text-primary" />
      </Avatar>
      <div class="text-sm text-muted-foreground">
        <LoaderIcon class="h-4 w-4 animate-spin inline mr-2" />
        Generating response...
      </div>
    </div>
    
    <!-- Error Message -->
    <div v-if="error" class="flex items-start gap-3 text-destructive">
      <Avatar class="bg-destructive/10">
        <XIcon class="h-4 w-4 text-destructive" />
      </Avatar>
      <div class="space-y-2">
        <div class="text-sm">Error: {{ error }}</div>
        <Button 
          variant="secondary" 
          size="sm"
          class="h-7 text-xs"
          @click="retryGeneration"
        >
          <RefreshCwIcon class="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    </div>
  </ScrollArea>
</template>