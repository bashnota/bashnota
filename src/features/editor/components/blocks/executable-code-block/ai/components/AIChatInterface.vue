<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { 
  MessageSquare, 
  Send, 
  User,
  Bot,
  Loader2,
  Plus,
  Trash2
} from 'lucide-vue-next'
import { useAIChat, type ChatThread } from '../composables/useAIChat'
import type { ActionExecutionContext } from '../composables/useAIActions'

interface Props {
  aiChat: ReturnType<typeof useAIChat>
  context: ActionExecutionContext
  embedded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  embedded: false
})

// State
const selectedThread = ref<string | null>(null)
const currentInput = ref<string>('')

// Computed
const threads = computed(() => {
  return props.aiChat.getActiveThreads().map(thread => ({
    ...thread,
    lastMessage: thread.messages[thread.messages.length - 1]
  }))
})

const currentThread = computed(() => {
  if (!selectedThread.value) return null
  return props.aiChat.chatThreads.value.get(selectedThread.value)
})

const isLoading = computed(() => {
  if (!selectedThread.value) return false
  return props.aiChat.isThreadLoading(selectedThread.value)
})

// Methods
const startNewThread = () => {
  const threadId = props.aiChat.createChatThread(
    `chat-${Date.now()}`, 
    props.context.blockId
  )
  selectedThread.value = threadId
}

const selectThread = (id: string) => {
  selectedThread.value = id
  currentInput.value = props.aiChat.getChatInput(id)
}

const deleteThread = (id: string) => {
  props.aiChat.clearThread(id)
  if (selectedThread.value === id) {
    selectedThread.value = null
  }
}

const sendMessage = async () => {
  if (!selectedThread.value || !currentInput.value.trim()) return
  
  const message = currentInput.value.trim()
  currentInput.value = ''
  
  await props.aiChat.sendMessage(selectedThread.value, message, {
    code: props.context.code,
    language: props.context.language
  })
}

const updateInput = (value: string) => {
  currentInput.value = value
  if (selectedThread.value) {
    props.aiChat.setChatInput(selectedThread.value, value)
  }
}

const formatTimestamp = (timestamp: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(timestamp)
}

const getMessageIcon = (type: 'user' | 'assistant' | 'system') => {
  if (type === 'user') return User
  if (type === 'system') return Bot
  return Bot
}

// Auto-select first thread if available
if (threads.value.length > 0 && !selectedThread.value) {
  selectedThread.value = threads.value[0].id
}
</script>

<template>
  <div class="ai-chat-interface" :class="{ 'ai-chat-interface--embedded': embedded }">
    <div class="ai-chat-layout">
      <!-- Conversation List -->
      <div class="ai-chat-sidebar">
        <div class="ai-sidebar-header">
          <h3 class="ai-sidebar-title">Conversations</h3>
          <Button
            @click="startNewThread"
            variant="outline"
            size="sm"
            class="ai-new-chat-btn"
          >
            <Plus class="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea class="ai-conversation-list">
          <div class="ai-conversations">
            <button
              v-for="thread in threads"
              :key="thread.id"
              @click="selectThread(thread.id)"
              class="ai-conversation-item"
              :class="{ 'ai-conversation-item--active': selectedThread === thread.id }"
            >
              <div class="ai-conversation-content">
                <div class="ai-conversation-title">{{ thread.actionId }}</div>
                <div v-if="thread.lastMessage" class="ai-conversation-preview">
                  {{ thread.lastMessage.content.slice(0, 50) }}...
                </div>
                <div class="ai-conversation-time">
                  {{ formatTimestamp(thread.lastActivity) }}
                </div>
              </div>
              <Button
                @click.stop="deleteThread(thread.id)"
                variant="ghost"
                size="sm"
                class="ai-delete-btn"
              >
                <Trash2 class="w-3 h-3" />
              </Button>
            </button>

            <!-- Empty State -->
            <div v-if="threads.length === 0" class="ai-empty-conversations">
              <MessageSquare class="w-8 h-8 text-muted-foreground mb-2" />
              <div class="ai-empty-title">No conversations yet</div>
              <div class="ai-empty-description">
                Start a new conversation to chat with AI about your code
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <!-- Chat Area -->
      <div class="ai-chat-main">
        <div v-if="currentThread" class="ai-chat-container">
          <!-- Chat Header -->
          <div class="ai-chat-header">
            <div class="ai-chat-title">
              <MessageSquare class="w-4 h-4" />
              {{ currentThread.actionId }}
            </div>
            <Badge variant="secondary" class="text-xs">
              {{ currentThread.messages.length }} messages
            </Badge>
          </div>

          <!-- Messages -->
          <ScrollArea class="ai-chat-messages">
            <div class="ai-messages-container">
              <div
                v-for="message in currentThread.messages"
                :key="message.id"
                class="ai-message"
                :class="`ai-message--${message.type}`"
              >
                <div class="ai-message-avatar">
                  <component :is="getMessageIcon(message.type)" class="w-4 h-4" />
                </div>
                <div class="ai-message-content">
                  <div class="ai-message-text">{{ message.content }}</div>
                  <div class="ai-message-meta">
                    {{ formatTimestamp(message.timestamp) }}
                  </div>
                </div>
              </div>

              <!-- Loading Message -->
              <div v-if="isLoading" class="ai-message ai-message--assistant">
                <div class="ai-message-avatar">
                  <Loader2 class="w-4 h-4 animate-spin" />
                </div>
                <div class="ai-message-content">
                  <div class="ai-message-text ai-message-loading">
                    AI is thinking...
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <!-- Chat Input -->
          <div class="ai-chat-input">
            <div class="ai-input-container">
              <Textarea
                :value="currentInput"
                @input="(e: Event) => updateInput((e.target as HTMLTextAreaElement).value)"
                placeholder="Ask about your code, request improvements, or get explanations..."
                class="ai-chat-textarea"
                @keydown.ctrl.enter="sendMessage"
                :disabled="isLoading"
              />
              <Button
                @click="sendMessage"
                :disabled="!currentInput.trim() || isLoading"
                class="ai-send-btn"
              >
                <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
                <Send v-else class="w-4 h-4" />
              </Button>
            </div>
            <div class="ai-input-hint">
              Press Ctrl+Enter to send
            </div>
          </div>
        </div>

        <!-- No Conversation Selected -->
        <div v-else class="ai-no-conversation">
          <MessageSquare class="w-12 h-12 text-muted-foreground mb-4" />
          <div class="ai-no-conversation-title">Start a conversation</div>
          <div class="ai-no-conversation-description">
            Select an existing conversation or start a new one to chat with AI about your {{ context.language }} code.
          </div>
          <Button @click="startNewThread" class="mt-4">
            <Plus class="w-4 h-4 mr-2" />
            New Conversation
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-interface {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ai-chat-interface--embedded {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  overflow: hidden;
}

.ai-chat-layout {
  display: flex;
  height: 100%;
  min-height: 400px;
}

.ai-chat-sidebar {
  width: 250px;
  border-right: 1px solid hsl(var(--border));
  background: hsl(var(--muted) / 0.3);
  display: flex;
  flex-direction: column;
}

.ai-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid hsl(var(--border));
}

.ai-sidebar-title {
  font-size: 0.875rem;
  font-weight: 600;
}

.ai-new-chat-btn {
  padding: 0.25rem;
  height: auto;
}

.ai-conversation-list {
  flex: 1;
}

.ai-conversations {
  padding: 0.5rem;
}

.ai-conversation-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.375rem;
  text-align: left;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
}

.ai-conversation-item:hover {
  background: hsl(var(--muted) / 0.5);
}

.ai-conversation-item--active {
  background: hsl(var(--primary) / 0.1);
  border: 1px solid hsl(var(--primary) / 0.3);
}

.ai-conversation-content {
  flex: 1;
  min-width: 0;
}

.ai-conversation-title {
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-conversation-preview {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.3;
  margin-bottom: 0.25rem;
}

.ai-conversation-time {
  font-size: 0.7rem;
  color: hsl(var(--muted-foreground));
}

.ai-delete-btn {
  padding: 0.25rem;
  height: auto;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.ai-conversation-item:hover .ai-delete-btn {
  opacity: 1;
}

.ai-empty-conversations {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
}

.ai-empty-title {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.ai-empty-description {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
}

.ai-chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ai-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

.ai-chat-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.ai-chat-messages {
  flex: 1;
  padding: 1rem;
}

.ai-messages-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ai-message {
  display: flex;
  gap: 0.75rem;
  max-width: 85%;
}

.ai-message--user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.ai-message--assistant {
  margin-right: auto;
}

.ai-message-avatar {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: hsl(var(--primary) / 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--primary));
}

.ai-message--user .ai-message-avatar {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.ai-message-content {
  flex: 1;
  min-width: 0;
}

.ai-message-text {
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: hsl(var(--muted) / 0.3);
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.ai-message--user .ai-message-text {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.ai-message-loading {
  color: hsl(var(--muted-foreground));
  font-style: italic;
}

.ai-message-meta {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin-top: 0.25rem;
  text-align: left;
}

.ai-message--user .ai-message-meta {
  text-align: right;
}

.ai-chat-input {
  padding: 1rem;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

.ai-input-container {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.ai-chat-textarea {
  flex: 1;
  min-height: 60px;
  max-height: 120px;
  resize: none;
}

.ai-send-btn {
  padding: 0.5rem;
  height: auto;
  align-self: flex-end;
}

.ai-input-hint {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin-top: 0.5rem;
  text-align: center;
}

.ai-no-conversation {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  height: 100%;
}

.ai-no-conversation-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.ai-no-conversation-description {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
  max-width: 400px;
}

/* Responsive */
@media (max-width: 768px) {
  .ai-chat-sidebar {
    width: 200px;
  }
  
  .ai-message {
    max-width: 95%;
  }
}

@media (max-width: 640px) {
  .ai-chat-layout {
    flex-direction: column;
  }
  
  .ai-chat-sidebar {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .ai-conversation-list {
    height: 150px;
  }
}
</style>
