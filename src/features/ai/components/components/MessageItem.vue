<script setup lang="ts">
import { Avatar } from '@/ui/avatar'
import { Button } from '@/ui/button'
import { Bot, User, CopyIcon, ScissorsIcon, CheckIcon } from 'lucide-vue-next'
import MarkdownRenderer from '@/ui/markdown-renderer/MarkdownRenderer.vue'
import { ref } from 'vue'
import { type ConversationMessage } from '@/features/ai/components/composables/useConversation'
import { toast } from '@/ui/toast'

const props = defineProps<{
  message: ConversationMessage
  providerName?: string
  timestamp: string
}>()

const emit = defineEmits(['copy', 'insert', 'select'])

const selectedText = ref('')
const isCopied = ref(false)
const isHovered = ref(false)

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
      // Show copy success feedback
      isCopied.value = true
      setTimeout(() => {
        isCopied.value = false
      }, 2000)
      
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

// Handle mouse enter
const handleMouseEnter = () => {
  isHovered.value = true
}

// Handle mouse leave
const handleMouseLeave = () => {
  isHovered.value = false
}
</script>

<template>
  <div 
    class="mb-3 relative message-container"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="flex-1 space-y-1 message-content">
      <div class="text-xs text-muted-foreground flex items-center justify-between message-header">
        <span class="font-medium">{{ message.role === 'user' ? 'You' : providerName || 'AI' }}</span>
        <span class="text-xs opacity-60">{{ timestamp }}</span>
      </div>
      
      <div 
        v-if="message.role === 'user'" 
        class="user-message"
        :id="`message-${message.id}`"
        role="article"
        aria-label="Your message"
      >
        {{ message.content }}
      </div>
      <MarkdownRenderer 
        v-else
        :content="message.content"
        class="selectable-text assistant-message"
        :id="`message-${message.id}`"
        role="article"
        aria-label="AI assistant response"
        @mouseup="handleTextSelection(message.content)"
        @mousedown="selectedText = ''"
      />
      
      <!-- Quick action buttons that appear on hover for assistant messages -->
      <div 
        v-if="message.role === 'assistant'" 
        class="quick-actions"
        :class="{ 'active': isHovered }"
      >
        <Button 
          variant="ghost" 
          size="sm"
          class="h-6 px-1.5 text-xs action-button"
          @click="copyMessageToClipboard"
          aria-label="Copy message to clipboard"
        >
          <CheckIcon v-if="isCopied" class="h-3 w-3 mr-1 text-green-500" />
          <CopyIcon v-else class="h-3 w-3 mr-1" />
          {{ isCopied ? 'Copied' : 'Copy' }}
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          class="h-6 px-1.5 text-xs action-button"
          @click="insertMessageToDocument"
          aria-label="Insert message to document"
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

/* More compact message container */
.message-container {
  margin-bottom: 0.75rem;
  padding: 0.25rem 0;
  transition: background-color 0.2s ease;
}

.message-container:hover {
  background-color: hsl(var(--muted) / 0.05);
}

/* Better styling for message content without avatars */
.message-content {
  width: 100%;
}

.message-header {
  margin-bottom: 0.25rem;
  padding: 0 0.25rem;
  display: flex;
  justify-content: space-between;
}

/* Quick action buttons that appear on hover */
.quick-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  opacity: 0;
  transform: translateY(5px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.quick-actions.active {
  opacity: 1;
  transform: translateY(0);
}

/* Add hover effect to action buttons */
.action-button {
  transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Improve styling to better distinguish user/assistant messages without avatars */
:deep(.user-message) {
  background-color: hsl(var(--muted) / 0.3);
  border-radius: 0.75rem;
  padding: 0.75rem;
  border-bottom-left-radius: 0.25rem;
  margin-right: 1.5rem; /* Add more space on the right for user messages */
  margin-left: 0.25rem; /* Add slight indent on the left */
  font-size: 0.925rem;
  position: relative;
}

:deep(.user-message)::before {
  content: '';
  position: absolute;
  top: 0;
  left: -0.25rem;
  height: 100%;
  width: 0.25rem;
  background-color: hsl(var(--muted) / 0.5);
  border-radius: 4px;
}

:deep(.assistant-message) {
  background-color: hsl(var(--primary) / 0.05);
  border-radius: 0.75rem;
  padding: 0.75rem;
  margin-left: 1.5rem; /* Add more space on the left for AI messages */
  margin-right: 0.25rem; /* Add slight indent on the right */
  border-bottom-right-radius: 0.25rem;
  font-size: 0.925rem;
  position: relative;
  border-left: 2px solid hsl(var(--primary) / 0.3);
}

:deep(.assistant-message)::before {
  content: '';
  position: absolute;
  top: 0;
  left: -0.2rem;
  height: 100%;
  width: 0.2rem;
  background-color: hsl(var(--primary) / 0.3);
  border-radius: 4px;
}

/* Enhanced code block styling */
:deep(pre) {
  background-color: hsl(var(--muted) / 0.7);
  border-radius: 0.5rem;
  padding: 1rem !important;
  margin: 0.75rem 0 !important;
  overflow-x: auto;
  border: 1px solid hsl(var(--border));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

:deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 0.9em;
}

:deep(code:not(pre code)) {
  background-color: hsl(var(--muted));
  border-radius: 4px;
  padding: 0.2em 0.4em;
  border-left: 2px solid hsl(var(--primary) / 0.5);
}

/* Improve list styling */
:deep(ul, ol) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

:deep(li) {
  margin-bottom: 0.25rem;
}
</style>








