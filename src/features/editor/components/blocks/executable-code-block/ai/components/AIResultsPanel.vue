<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { ScrollArea } from '@/ui/scroll-area'
import { Separator } from '@/ui/separator'
import { Textarea } from '@/ui/textarea'
import { 
  FileText, 
  Copy, 
  Check, 
  Play,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Code2,
  ExternalLink
} from 'lucide-vue-next'
import { useAIActions } from '../composables/useAIActions'
import { useAIChat } from '../composables/useAIChat'

interface Props {
  aiActions: ReturnType<typeof useAIActions>
  aiChat: ReturnType<typeof useAIChat>
  embedded?: boolean
}

interface Emits {
  'code-updated': [code: string]
}

const props = withDefaults(defineProps<Props>(), {
  embedded: false
})

const emit = defineEmits<Emits>()

// State
const copiedStates = ref<Record<string, boolean>>({})
const expandedResults = ref<Record<string, boolean>>({})
const chatInputs = ref<Record<string, string>>({})

// Computed
const resultsByCategory = computed(() => {
  const results = Array.from(props.aiActions.actionResults.value.entries())
  return {
    analysis: results.filter(([id]) => ['explain-code', 'code-review', 'security-review'].includes(id)),
    improvement: results.filter(([id]) => ['optimize-performance', 'refactor-code', 'add-comments'].includes(id)),
    generation: results.filter(([id]) => ['generate-tests', 'add-documentation'].includes(id)),
    other: results.filter(([id]) => !['explain-code', 'code-review', 'security-review', 'optimize-performance', 'refactor-code', 'add-comments', 'generate-tests', 'add-documentation'].includes(id))
  }
})

// Helper functions for chat integration
const getThreadByActionId = (actionId: string) => {
  return props.aiChat.getThreadsByAction(actionId)[0] || null
}

const getChatInput = (actionId: string) => {
  return chatInputs.value[actionId] || ''
}

const setChatInput = (actionId: string, value: string) => {
  chatInputs.value[actionId] = value
}

const isThreadLoading = (actionId: string) => {
  const thread = getThreadByActionId(actionId)
  return thread ? props.aiChat.isThreadLoading(thread.id) : false
}

const sendChatMessage = async (actionId: string) => {
  const input = getChatInput(actionId)
  if (!input.trim()) return
  
  let thread = getThreadByActionId(actionId)
  if (!thread) {
    const threadId = props.aiChat.createChatThread(actionId, actionId)
    const newThread = props.aiChat.chatThreads.value.get(threadId)
    if (!newThread) return
    thread = newThread
  }
  
  setChatInput(actionId, '')
  await props.aiChat.sendMessage(thread.id, input, {
    code: '', // You might want to pass the actual code context here
    language: ''
  })
}

// Methods
const copyToClipboard = async (text: string, key: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedStates.value[key] = true
    setTimeout(() => {
      copiedStates.value[key] = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
  }
}

const toggleResultExpansion = (actionId: string) => {
  expandedResults.value[actionId] = !expandedResults.value[actionId]
}

const applyCodeFromResult = (resultContent: string) => {
  // Extract code from markdown code blocks
  const codeBlockRegex = /```(?:(\w+)\n)?([\s\S]*?)```/g
  let match
  let extractedCode = ''
  
  while ((match = codeBlockRegex.exec(resultContent)) !== null) {
    const [, language, code] = match
    if (!language || language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript' || language.toLowerCase() === 'python') {
      extractedCode += code.trim() + '\n'
    }
  }
  
  if (extractedCode.trim()) {
    emit('code-updated', extractedCode.trim())
  }
}

const formatResult = (result: string) => {
  // Split by code blocks and text
  const parts = result.split(/(```[\w]*\n[\s\S]*?\n```)/g)
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const match = part.match(/```([\w]*)\n([\s\S]*?)\n```/)
      const language = match?.[1] || ''
      const codeContent = match?.[2] || part
      return { type: 'code' as const, content: codeContent.trim(), language }
    } else if (part.trim()) {
      return { type: 'text' as const, content: part.trim() }
    }
    return null
  }).filter((part): part is NonNullable<typeof part> => part !== null)
}

const getCategoryLabel = (category: string) => {
  const labels = {
    analysis: 'Code Analysis',
    improvement: 'Code Improvements',
    generation: 'Code Generation',
    other: 'Other Results'
  }
  return labels[category as keyof typeof labels] || category
}

const getCategoryIcon = (category: string) => {
  const icons = {
    analysis: FileText,
    improvement: Code2,
    generation: Play,
    other: FileText
  }
  return icons[category as keyof typeof icons] || FileText
}
</script>

<template>
  <div class="ai-results-panel" :class="{ 'ai-results-panel--embedded': embedded }">
    <ScrollArea class="h-full">
      <div class="ai-results-content">
        <!-- Results by Category -->
        <div v-for="(categoryResults, category) in resultsByCategory" :key="category">
          <div v-if="categoryResults.length > 0" class="ai-results-category">
            <div class="ai-category-header">
              <component :is="getCategoryIcon(category)" class="w-4 h-4" />
              <h3 class="ai-category-title">{{ getCategoryLabel(category) }}</h3>
              <Badge variant="secondary" class="ml-auto text-xs">
                {{ categoryResults.length }}
              </Badge>
            </div>

            <div class="ai-results-list">
              <div
                v-for="([actionId, result]) in categoryResults"
                :key="actionId"
                class="ai-result-item"
              >
                <div class="ai-result-header">
                  <div class="ai-result-meta">
                    <Badge variant="outline" class="text-xs">{{ actionId }}</Badge>
                    <span class="ai-result-timestamp">
                      {{ new Date(result.timestamp).toLocaleTimeString() }}
                    </span>
                  </div>
                  <div class="ai-result-actions">
                    <Button
                      @click="copyToClipboard(result.content, actionId)"
                      variant="ghost"
                      size="sm"
                      class="ai-result-action"
                    >
                      <Check v-if="copiedStates[actionId]" class="w-4 h-4 text-green-500" />
                      <Copy v-else class="w-4 h-4" />
                    </Button>
                    <Button
                      @click="toggleResultExpansion(actionId)"
                      variant="ghost"
                      size="sm"
                      class="ai-result-action"
                    >
                      <ChevronDown v-if="expandedResults[actionId]" class="w-4 h-4" />
                      <ChevronRight v-else class="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div v-if="expandedResults[actionId] !== false" class="ai-result-content">
                  <div
                    v-for="(part, index) in formatResult(result.content)"
                    :key="index"
                    class="ai-result-part"
                  >
                    <div v-if="part.type === 'text'" class="ai-result-text">
                      {{ part.content }}
                    </div>
                    <div v-else-if="part.type === 'code'" class="ai-result-code">
                      <div class="ai-code-header">
                        <Badge variant="secondary" class="text-xs">
                          {{ part.language || 'code' }}
                        </Badge>
                        <div class="ai-code-actions">
                          <Button
                            @click="copyToClipboard(part.content, `${actionId}-code-${index}`)"
                            variant="ghost"
                            size="sm"
                            class="ai-code-action"
                          >
                            <Check v-if="copiedStates[`${actionId}-code-${index}`]" class="w-3 h-3 text-green-500" />
                            <Copy v-else class="w-3 h-3" />
                          </Button>
                          <Button
                            @click="applyCodeFromResult(part.content)"
                            variant="ghost"
                            size="sm"
                            class="ai-code-action"
                            title="Apply this code"
                          >
                            <Play class="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <pre class="ai-code-content">{{ part.content }}</pre>
                    </div>
                  </div>

                  <!-- Chat Interface for this result -->
                  <div v-if="props.aiChat" class="ai-result-chat">
                    <Separator class="my-3" />
                    <div class="ai-chat-section">
                      <div class="ai-chat-header">
                        <MessageSquare class="w-4 h-4" />
                        <span class="text-sm font-medium">Ask follow-up questions</span>
                      </div>
                      
                      <!-- Chat Messages -->
                      <div v-if="getThreadByActionId(actionId)?.messages.length > 0" class="ai-chat-messages">
                        <div
                          v-for="message in getThreadByActionId(actionId)?.messages"
                          :key="message.id"
                          class="ai-chat-message"
                          :class="`ai-chat-message--${message.type}`"
                        >
                          <div class="ai-message-content">{{ message.content }}</div>
                          <div class="ai-message-timestamp">
                            {{ new Date(message.timestamp).toLocaleTimeString() }}
                          </div>
                        </div>
                      </div>

                      <!-- Chat Input -->
                      <div class="ai-chat-input">
                        <Textarea
                          :value="getChatInput(actionId)"
                          @input="(e: Event) => setChatInput(actionId, (e.target as HTMLTextAreaElement).value)"
                          placeholder="Ask a follow-up question..."
                          class="text-sm min-h-[80px]"
                          @keydown.ctrl.enter="sendChatMessage(actionId)"
                        />
                        <Button
                          @click="sendChatMessage(actionId)"
                          :disabled="!getChatInput(actionId).trim() || isThreadLoading(actionId)"
                          size="sm"
                          class="mt-2"
                        >
                          <MessageSquare class="w-4 h-4 mr-2" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="props.aiActions.actionResults.value.size === 0" class="ai-empty-state">
          <FileText class="w-12 h-12 text-muted-foreground mb-3" />
          <div class="ai-empty-title">No Results Yet</div>
          <div class="ai-empty-description">
            Execute AI actions to see results and insights about your code.
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>

<style scoped>
.ai-results-panel {
  height: 100%;
  min-height: 200px;
}

.ai-results-panel--embedded {
  padding: 1rem;
}

.ai-results-content {
  padding: 1rem;
}

.ai-results-category {
  margin-bottom: 2rem;
}

.ai-category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

.ai-category-title {
  font-size: 0.875rem;
  font-weight: 600;
}

.ai-results-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ai-result-item {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  background: hsl(var(--background));
  overflow: hidden;
}

.ai-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem;
  background: hsl(var(--muted) / 0.3);
  border-bottom: 1px solid hsl(var(--border));
}

.ai-result-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ai-result-timestamp {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.ai-result-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ai-result-action {
  padding: 0.25rem;
  height: auto;
}

.ai-result-content {
  padding: 1rem;
}

.ai-result-part {
  margin-bottom: 1rem;
}

.ai-result-text {
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.ai-result-code {
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  overflow: hidden;
}

.ai-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: hsl(var(--muted) / 0.5);
  border-bottom: 1px solid hsl(var(--border));
}

.ai-code-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.ai-code-action {
  padding: 0.25rem;
  height: auto;
}

.ai-code-content {
  padding: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-x: auto;
  background: hsl(var(--muted) / 0.1);
}

.ai-result-chat {
  margin-top: 1rem;
}

.ai-chat-section {
  margin-top: 0.75rem;
}

.ai-chat-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.ai-chat-messages {
  margin-bottom: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
}

.ai-chat-message {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
}

.ai-chat-message--user {
  background: hsl(var(--primary) / 0.1);
  margin-left: 2rem;
}

.ai-chat-message--assistant {
  background: hsl(var(--muted) / 0.3);
  margin-right: 2rem;
}

.ai-message-content {
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 0.25rem;
}

.ai-message-timestamp {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.ai-chat-input {
  display: flex;
  flex-direction: column;
}

.ai-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.ai-empty-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.ai-empty-description {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
}
</style>
