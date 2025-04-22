<script setup lang="ts">
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Bot, User, CopyIcon, ScissorsIcon } from 'lucide-vue-next'
import MarkdownRenderer from '@/components/ui/markdown-renderer/MarkdownRenderer.vue'
import { ref } from 'vue'
import { type ConversationMessage } from '../composables/useConversation'
import { toast } from '@/components/ui/toast'

const props = defineProps<{
  message: ConversationMessage
  providerName?: string
  timestamp: string
}>()

const emit = defineEmits(['copy', 'insert', 'select'])

const selectedText = ref('')

// Handle text selection in AI response
const handleTextSelection = (content: string) => {
  const selection = window.getSelection()
  if (selection && selection.toString().trim()) {
    selectedText.value = selection.toString()
    emit('select', selection.toString())
  }
}

// Copy message to clipboard
const copyMessageToClipboard = () => {
  emit('copy', props.message.content)
  navigator.clipboard.writeText(props.message.content)
    .then(() => {
      toast({
        title: 'Copied',
        description: 'Text copied to clipboard',
        variant: 'default'
      })
    })
    .catch(error => {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy text to clipboard',
        variant: 'destructive'
      })
    })
}

// Insert message to document
const insertMessageToDocument = () => {
  emit('insert', props.message.content)
}
</script>

<template>
  <div class="flex gap-3 mb-4">
    <Avatar :class="message.role === 'user' ? 'bg-muted' : 'bg-primary/10'">
      <User v-if="message.role === 'user'" class="h-4 w-4" />
      <Bot v-else class="h-4 w-4 text-primary" />
    </Avatar>
    
    <div class="flex-1 space-y-1.5">
      <div class="text-xs text-muted-foreground flex items-center justify-between">
        <span>{{ message.role === 'user' ? 'You' : providerName || 'AI' }}</span>
        <span>{{ timestamp }}</span>
      </div>
      
      <div v-if="message.role === 'user'">
        {{ message.content }}
      </div>
      <MarkdownRenderer 
        v-else
        :content="message.content"
        class="selectable-text"
        @mouseup="handleTextSelection(message.content)"
        @mousedown="selectedText = ''"
      />
      
      <div v-if="message.role === 'assistant'" class="flex items-center gap-2 mt-1.5">
        <Button 
          variant="ghost" 
          size="sm"
          class="h-6 px-1.5 text-xs"
          @click="copyMessageToClipboard"
        >
          <CopyIcon class="h-3 w-3 mr-1" />
          Copy
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          class="h-6 px-1.5 text-xs"
          @click="insertMessageToDocument"
        >
          <ScissorsIcon class="h-3 w-3 mr-1" />
          Insert
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selectable-text {
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.selectable-text::selection {
  background: rgba(var(--primary), 0.2);
}
</style>