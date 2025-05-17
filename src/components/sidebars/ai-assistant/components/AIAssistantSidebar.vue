<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { logger } from '@/services/logger'
import { toast } from '@/components/ui/toast'

// Import composables
import { useConversation } from '../../ai-assistant/composables/useConversation'
import { useAIGeneration } from '../../ai-assistant/composables/useAIGeneration'
import { useMentions } from '../../ai-assistant/composables/useMentions'
import { useAIProviders } from '../composables/useAIProviders'
import { useStreamingMode } from '../composables/useStreamingMode'

// Import components
import { ScrollArea } from '@/components/ui/scroll-area'
import ConversationHistory from './ConversationHistory.vue'
import ConversationInput from './ConversationInput.vue'
import ActionBar from './ActionBar.vue'
import EmptyState from './EmptyState.vue'
import ChatList from './ChatList.vue'
import ProviderSelector from './ProviderSelector.vue'

// Import the icons
import { List as ListIcon, ArrowLeft as ArrowLeftIcon, Cpu as CpuIcon, Zap as ZapIcon } from 'lucide-vue-next'

const props = defineProps<{
  editor: any
  notaId: string
  hideHeader?: boolean
}>()

const emit = defineEmits(['close', 'keepOpen'])

// AI Settings store
const aiSettings = useAISettingsStore()
const selectedProvider = computed(() => {
  return aiSettings.providers.find(p => p.id === aiSettings.settings.preferredProviderId)
})

// Initialize AI providers
const { 
  updateWebLLMState, 
  webLLMProgress, 
  currentWebLLMModel, 
  isLoadingWebLLMModels,
  initialize: initializeProviders
} = useAIProviders()

// Initialize streaming mode
const { 
  isStreamingEnabled, 
  shouldUseStreaming, 
  currentStreamingText, 
  isStreaming, 
  streamingProvider, 
  toggleStreamingMode 
} = useStreamingMode()

// Initialize conversation state
const { 
  activeAIBlock, 
  promptInput, 
  followUpPrompt,
  isContinuing, 
  isEditing, 
  resultInput,
  selectedText,
  copied,
  conversationHistory,
  promptTokenCount,
  isPromptEmpty,
  isLoading,
  tokenWarning,
  maxInputChars,
  formatTimestamp,
  loadConversationFromBlock,
  clearActiveBlock,
  createNewSession,
  toggleContinuing,
  toggleEditing,
  saveEditedText
} = useConversation(props.editor, props.notaId)

// Initialize mentions
const {
  showMentionSearch,
  mentionSearchResults,
  mentionsInPrompt,
  checkForMentions,
  selectNotaFromSearch,
  loadMentionedNotaContents,
  handleOutsideClick,
  clearMentions,
  updateMentionQuery,
  closeMentionSearch
} = useMentions()

// Initialize AI generation
const {
  generateText: generateTextAction,
  continueConversation: continueAction,
  regenerateText: regenerateAction,
  removeBlock: removeBlockAction,
  currentStreamingText: streamingText
} = useAIGeneration(props.editor)

// Format progress percentage
const formattedProgress = computed(() => {
  return `${Math.round(webLLMProgress.value * 100)}%`
})

// Reference to the textarea for mention search
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Create a WebLLM state update interval
const webLLMStateInterval = ref<number | null>(null)

// Computed properties
const hasResult = computed(() => {
  return activeAIBlock.value?.node.attrs.result
})

const error = computed(() => {
  return activeAIBlock.value?.node.attrs.error || ''
})

// Generate text with mentions
const generateText = async () => {
  if (!activeAIBlock.value || !promptInput.value.trim()) return
  
  try {
    // Check if there are any mentioned notas
    if (promptInput.value.includes('#[')) {
      // Process with mentions
      const enhancedPrompt = await loadMentionedNotaContents(promptInput.value)
      
      // Generate with enhanced prompt
      const newHistory = await generateTextAction(
        activeAIBlock.value, 
        enhancedPrompt, 
        conversationHistory.value,
        formatTimestamp
      )
      if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    } else {
      // Generate normally
      const newHistory = await generateTextAction(
        activeAIBlock.value, 
        promptInput.value, 
        conversationHistory.value,
        formatTimestamp
      )
      if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    }
    
    // Clear mentions after generation
    clearMentions()
  } catch (error) {
    logger.error('Error in generateText:', error)
    toast({
      title: 'Error',
      description: 'Failed to generate text',
      variant: 'destructive'
    })
  }
}

// Continue conversation with mentions
const continueConversation = async () => {
  if (!activeAIBlock.value || !followUpPrompt.value.trim() || isLoading.value) return
  
  try {
    // Check if there are any mentioned notas
    if (followUpPrompt.value.includes('#[')) {
      const enhancedPrompt = await loadMentionedNotaContents(followUpPrompt.value)
      
      // Continue with enhanced prompt
      const newHistory = await continueAction(
        activeAIBlock.value, 
        enhancedPrompt, 
        conversationHistory.value,
        formatTimestamp
      )
      if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    } else {
      // Continue normally
        const newHistory = await continueAction(
          activeAIBlock.value, 
          followUpPrompt.value, 
          conversationHistory.value,
          formatTimestamp
        )
        if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    }
    
    // Clear the prompt and exit continue mode
    followUpPrompt.value = ''
    isContinuing.value = false
    
    // Clear mentions after generation
    clearMentions()
  } catch (error) {
    logger.error('Error in continueConversation:', error)
    toast({
      title: 'Error',
      description: 'Failed to continue conversation',
      variant: 'destructive'
    })
  }
}

// Regenerate text
const regenerateText = async () => {
  if (!activeAIBlock.value || isLoading.value) return
  
  try {
    const newHistory = await regenerateAction(activeAIBlock.value, conversationHistory.value)
    if (newHistory) conversationHistory.value = newHistory
  } catch (error) {
    logger.error('Error in regenerateText:', error)
    toast({
      title: 'Error',
      description: 'Failed to regenerate text',
      variant: 'destructive'
    })
  }
}

// Handle text selection in AI response
const handleTextSelection = (content: string) => {
  const selection = window.getSelection()
  if (selection && selection.toString().trim()) {
    selectedText.value = selection.toString()
  }
}

// Copy text to clipboard
const copyToClipboard = () => {
  if (!activeAIBlock.value || !activeAIBlock.value.node.attrs.result) return
  
  navigator.clipboard.writeText(activeAIBlock.value.node.attrs.result)
    .then(() => {
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
      
      toast({
        title: 'Copied',
        description: 'Text copied to clipboard',
        variant: 'default'
      })
    })
    .catch(error => {
      logger.error('Failed to copy text:', error)
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy text to clipboard',
        variant: 'destructive'
      })
    })
}

// Copy specific message to clipboard
const copyMessageToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      toast({
        title: 'Copied',
        description: 'Text copied to clipboard',
        variant: 'default'
      })
    })
    .catch(error => {
      logger.error('Failed to copy text:', error)
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy text to clipboard',
        variant: 'destructive'
      })
    })
}

// Insert AI response to document
const insertToDocument = () => {
  if (!activeAIBlock.value || !activeAIBlock.value.node.attrs.result) return
  
  try {
    // Get the result text
    const text = activeAIBlock.value.node.attrs.result
    
    // Get the current editor state
    const { state } = props.editor
    const { selection } = state
    
    // Check if we're in a list item
    const isInListItem = selection.$anchor.parent.type.name === 'listItem'
    
    if (isInListItem) {
      // When in a list item, insert as paragraphs inside the list item
      props.editor.chain().focus().insertContent({
        type: 'paragraph',
        content: [{ type: 'text', text }]
      }).run()
    } else {
      // Normal insertion for other contexts
      props.editor.chain().focus().insertContent(text).run()
    }
    
    toast({
      title: 'Inserted',
      description: 'Text inserted into document',
      variant: 'default'
    })
  } catch (error) {
    logger.error('Failed to insert text:', error)
    toast({
      title: 'Insert Failed',
      description: 'Failed to insert text into document',
      variant: 'destructive'
    })
  }
}

// Insert selected text to document
const insertSelectionToDocument = () => {
  if (!selectedText.value) return
  
  try {
    // Get the current editor state
    const { state } = props.editor
    const { selection } = state
    
    // Check if we're in a list item
    const isInListItem = selection.$anchor.parent.type.name === 'listItem'
    
    if (isInListItem) {
      // When in a list item, insert as paragraphs inside the list item
      props.editor.chain().focus().insertContent({
        type: 'paragraph',
        content: [{ type: 'text', text: selectedText.value }]
      }).run()
    } else {
      // Normal insertion for other contexts
      props.editor.chain().focus().insertContent(selectedText.value).run()
    }
    
    toast({
      title: 'Inserted',
      description: 'Selection inserted into document',
      variant: 'default'
    })
    
    // Clear the selection
    selectedText.value = ''
  } catch (error) {
    logger.error('Failed to insert selection:', error)
    toast({
      title: 'Insert Failed',
      description: 'Failed to insert selection into document',
      variant: 'destructive'
    })
  }
}

// Insert specific message to document
const insertMessageToDocument = (text: string) => {
  try {
    // Get the current editor state
    const { state } = props.editor
    const { selection } = state
    
    // Check if we're in a list item
    const isInListItem = selection.$anchor.parent.type.name === 'listItem'
    
    if (isInListItem) {
      // When in a list item, insert as paragraphs inside the list item
      props.editor.chain().focus().insertContent({
        type: 'paragraph',
        content: [{ type: 'text', text }]
      }).run()
    } else {
      // Normal insertion for other contexts
      props.editor.chain().focus().insertContent(text).run()
    }
    
    toast({
      title: 'Inserted',
      description: 'Text inserted into document',
      variant: 'default'
    })
  } catch (error) {
    logger.error('Failed to insert text:', error)
    toast({
      title: 'Insert Failed',
      description: 'Failed to insert text into document',
      variant: 'destructive'
    })
  }
}

// Remove the block from the document
const removeBlock = () => {
  if (!activeAIBlock.value) return
  
  if (removeBlockAction(activeAIBlock.value)) {
    clearActiveBlock()
  }
}

// Handle mentions selection
const handleMentionSelection = (nota: any) => {
  selectNotaFromSearch(nota, textareaRef, isContinuing.value, promptInput, followUpPrompt)
}

// Update mention search query
const handleUpdateMentionQuery = (query: string) => {
  updateMentionQuery(query)
}

// Close mention search popup
const handleCloseMentionSearch = () => {
  closeMentionSearch()
}

// Handle model change
const handleModelChange = (modelId: string) => {
  try {
    // Update the preferred provider in the AI settings store
    aiSettings.setPreferredProvider(modelId)
    
    // Show toast notification
    const provider = aiSettings.providers.find(p => p.id === modelId)
    toast({
      title: "AI Model Changed",
      description: `Now using ${provider?.name || 'new model'}`,
      variant: "default"
    })
  } catch (error) {
    logger.error('Error changing AI model:', error)
    toast({
      title: "Error",
      description: "Failed to change AI model",
      variant: "destructive" 
    })
  }
}

// Explicitly initialize the providers on component mount
onMounted(async () => {
  try {
    await initializeProviders()
    logger.info('AI providers initialized')
  } catch (error) {
    logger.error('Error initializing AI providers:', error)
  }
  
  // Listen for "activate-ai-assistant" event from InlineAIGeneration components
  // Create a prefixed logger for easier debugging
  const sidebarLogger = logger.createPrefixedLogger('AIAssistantSidebar');
  
  window.addEventListener('activate-ai-assistant', ((event: CustomEvent) => {
    sidebarLogger.debug('Received activate-ai-assistant event:', event.detail);
    
    if (event.detail && event.detail.block) {
      // Track if we're loading a new conversation or the same one
      const isNewConversation = !activeAIBlock.value || 
                              activeAIBlock.value.node !== event.detail.block.node;
      
      sidebarLogger.debug('Is new conversation:', isNewConversation, 
                     'Current block:', activeAIBlock.value ? activeAIBlock.value.node.attrs : 'none',
                     'New block:', event.detail.block.node.attrs);
      
      if (isNewConversation) {
        // If this is a new conversation, load the history
        if (event.detail.conversationHistory && event.detail.conversationHistory.length > 0) {
          sidebarLogger.debug('Conversation history provided in event, length:', 
                         event.detail.conversationHistory.length,
                         'Content:', event.detail.conversationHistory);
          
          // Set the active block
          activeAIBlock.value = event.detail.block;
          // Set the conversation history from the event
          conversationHistory.value = event.detail.conversationHistory;
          
          // Log that we've loaded the conversation history
          logger.info('Loaded conversation history from AI block', {
            messageCount: event.detail.conversationHistory.length
          });
          
          // Ensure proper UI state based on the loaded conversation
          if (isContinuing.value) {
            // Reset continuing state if it was active
            isContinuing.value = false;
          }
          
          // Clear the prompt input to prepare for new input
          promptInput.value = '';
          
          // Scroll to the bottom of the conversation after a short delay
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        } else {
          // Fall back to loading from block if no history provided
          sidebarLogger.debug('No conversation history in event, falling back to loadConversationFromBlock');
          loadConversationFromBlock(event.detail.block);
          sidebarLogger.debug('After loadConversationFromBlock, history length:', 
                         conversationHistory.value.length,
                         'Content:', conversationHistory.value);
        }
        
        // Emit event to indicate sidebar should stay open
        emit('keepOpen', true);
      } else {
        sidebarLogger.debug('Same conversation, not reloading history. Current history length:', 
                       conversationHistory.value.length);
      }
      // We don't do anything if it's the same conversation, this allows the normal sidebar toggle to work
    } else {
      sidebarLogger.warn('Received activate-ai-assistant event without valid detail or block');
    }
  }) as EventListener);
  
  document.addEventListener('mousedown', handleOutsideClick);
  
  // Scroll to bottom of conversation
  scrollToBottom()
  
  // Start the WebLLM state update interval
  webLLMStateInterval.value = window.setInterval(() => {
    updateWebLLMState()
  }, 1000)
})

// Clean up event listeners and intervals
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
  
  // Clear the WebLLM state update interval
  if (webLLMStateInterval.value) {
    clearInterval(webLLMStateInterval.value)
    webLLMStateInterval.value = null
  }
})

// Add state for sidebar view mode
const showChatList = ref(false)

// Function to handle loading a specific chat from the chat list
const handleSelectChat = (block: any) => {
  loadConversationFromBlock(block)
  showChatList.value = false
}

// Get ID for the active block for highlighting in the list
const activeBlockId = computed(() => {
  if (!activeAIBlock.value) return undefined
  // Use a property that exists on the activeAIBlock object
  return `ai-${activeAIBlock.value.node.attrs.lastUpdated || Date.now()}`
})

// Toggle between chat list and current conversation
const toggleChatList = () => {
  showChatList.value = !showChatList.value
}

// Auto-scroll to bottom when new messages arrive
const scrollAreaViewportRef = ref<HTMLElement | null>(null)

// Function to scroll to bottom of conversation
const scrollToBottom = () => {
  nextTick(() => {
    if (scrollAreaViewportRef.value) {
      scrollAreaViewportRef.value.scrollTop = scrollAreaViewportRef.value.scrollHeight
    }
  })
}

// Watch conversation history changes to auto-scroll
watch(() => conversationHistory.value.length, () => {
  scrollToBottom()
})

// Watch loading state to scroll to bottom when it changes
watch(() => isLoading.value, () => {
  scrollToBottom()
})

// Scroll to bottom when component is mounted
onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- WebLLM Loading Overlay -->
    <div v-if="isLoadingWebLLMModels" class="fixed inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div class="w-64 bg-card border rounded-lg shadow-lg overflow-hidden">
        <div class="p-4 flex flex-col items-center space-y-3">
          <CpuIcon class="h-10 w-10 text-primary animate-pulse" />
          <h3 class="text-lg font-semibold">Loading WebLLM Model</h3>
          <p class="text-sm text-muted-foreground text-center">
            {{ currentWebLLMModel || 'AI model' }} is being downloaded and prepared. This may take a few minutes.
          </p>
          
          <!-- Progress bar -->
          <div class="w-full bg-muted rounded-full h-2.5 mt-2">
            <div class="bg-primary h-2.5 rounded-full transition-all duration-300" 
                 :style="{ width: formattedProgress }"></div>
          </div>
          <div class="text-xs text-muted-foreground">{{ formattedProgress }}</div>
        </div>
      </div>
    </div>
    
    <!-- Content container with proper width styling -->
    <div class="h-full w-full flex flex-col">
      <!-- Header actions for chat list toggle -->
      <div v-if="!hideHeader" class="px-4 py-2 flex items-center justify-between border-b">
        <Button 
          variant="ghost" 
          size="icon"
          class="h-8 w-8"
          :title="showChatList ? 'Back to conversation' : 'Show all conversations'"
          @click="toggleChatList"
        >
          <ListIcon v-if="!showChatList" class="h-4 w-4" />
          <ArrowLeftIcon v-else class="h-4 w-4" />
        </Button>
      </div>
      
      <div class="flex-1 flex flex-col h-full min-h-0 relative overflow-hidden">
        <!-- Empty State when no active conversation -->
        <EmptyState 
          v-if="!activeAIBlock" 
          @create-session="createNewSession"
          class="h-full overflow-y-auto"
        />
        
        <!-- Conversation Content when a conversation is active -->
        <template v-else>
          <!-- Chat List -->
          <ScrollArea 
            v-if="showChatList"
            class="flex-1 h-full"
          >
            <ChatList
              :editor="props.editor"
              :notaId="props.notaId"
              :active-block-id="activeBlockId"
              @select-chat="handleSelectChat"
              @create-new="createNewSession"
            />
          </ScrollArea>
          
          <!-- Conversation Container - With Fixed Message Input -->
          <div v-else class="h-full flex flex-col">
            <!-- Scrollable conversation history area -->
            <div 
              class="flex-1 overflow-y-auto min-h-0"
              ref="scrollAreaViewportRef"
            >
              <div class="p-4 space-y-4 bg-gradient-to-b from-background to-muted/10">
                <ConversationHistory
                  :conversation-history="conversationHistory"
                  :is-loading="isLoading"
                  :error="error"
                  :streaming-text="streamingText"
                  :is-streaming="isStreaming"
                  :provider-name="isStreaming ? streamingProvider : selectedProvider?.name || 'AI'"
                  :format-timestamp="formatTimestamp"
                  @copy-message="copyMessageToClipboard"
                  @insert-message="insertMessageToDocument"
                  @select-text="handleTextSelection"
                  @retry="regenerateText"
                />
              </div>
            </div>
  
            <!-- AI Provider Selector with WebLLM streaming toggle -->
            <div class="px-3 py-1 border-t">
              <div class="flex items-center justify-between">
                <ProviderSelector />
                
                <!-- WebLLM Streaming toggle -->
                <Button 
                  v-if="aiSettings.settings.preferredProviderId === 'webllm'"
                  variant="outline" 
                  size="sm"
                  class="ml-2 text-xs h-8 px-2 py-1 flex items-center gap-1"
                  :class="{'bg-primary/10': isStreamingEnabled}"
                  @click="toggleStreamingMode"
                  title="Toggle live streaming mode for WebLLM"
                >
                  <ZapIcon class="h-3.5 w-3.5" :class="{'text-primary': isStreamingEnabled}" />
                  <span>Live Mode</span>
                </Button>
              </div>
            </div>
  
            <!-- Fixed Message Input Area -->
            <div class="border-t p-3 bg-background flex-shrink-0 z-10 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
              <!-- Editing Response -->
              <div v-if="isEditing">
                <Textarea
                  v-model="resultInput"
                  class="min-h-[80px] resize-none w-full focus:shadow-sm transition-shadow rounded-md"
                  @keydown.ctrl.enter.prevent="saveEditedText"
                />
                <div class="flex justify-end gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    @click="toggleEditing"
                    class="h-8"
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    variant="default"
                    @click="saveEditedText"
                    class="h-8 shadow-sm"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
              
              <!-- Normal Input (prompt or follow-up) -->
              <template v-else>
                <ConversationInput
                  v-if="!hasResult || isContinuing"
                  :promptInput="promptInput"
                  :followUpPrompt="followUpPrompt"
                  :is-prompt-empty="isPromptEmpty"
                  :is-loading="isLoading"
                  :prompt-token-count="promptTokenCount"
                  :is-continuing="isContinuing"
                  :has-mentions="mentionsInPrompt.length > 0"
                  :mention-count="mentionsInPrompt.length"
                  :show-mention-search="showMentionSearch"
                  :mention-search-results="mentionSearchResults"
                  :token-warning="tokenWarning"
                  :max-input-chars="maxInputChars"
                  @update:promptInput="promptInput = $event"
                  @update:followUpPrompt="followUpPrompt = $event"
                  @generate="generateText"
                  @continue="continueConversation"
                  @check-mentions="checkForMentions($event, ref(textareaRef))"
                  @select-mention="handleMentionSelection"
                  @update-mention-search="handleUpdateMentionQuery"
                  @close-mention-search="handleCloseMentionSearch"
                  @change-model="handleModelChange"
                  ref="textareaRef"
                />
                
                <!-- Action Bar -->
                <ActionBar
                  v-else
                  :has-result="!!hasResult"
                  :is-loading="isLoading"
                  :is-continuing="isContinuing"
                  :has-selection="!!selectedText"
                  @regenerate="regenerateText"
                  @continue="toggleContinuing"
                  @copy="copyToClipboard"
                  @edit="toggleEditing"
                  @insert="insertToDocument"
                  @insert-selection="insertSelectionToDocument"
                  @remove="removeBlock"
                />
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Code block styling within AI responses */
:deep(pre),
:deep(code) {
  background-color: hsl(var(--muted));
  border-radius: 4px;
  padding: 0.2em 0.4em;
  font-family: 'Courier New', monospace;
  border-left: 2px solid hsl(var(--primary));
}

:deep(pre) {
  padding: 0.5em;
  margin: 0.5em 0;
  overflow-x: auto;
}

/* Mention search styling */
.mention-search {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  background-color: hsl(var(--background));
  max-height: 200px;
  overflow-y: auto;
  width: 250px;
  z-index: 50;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.mention-tag {
  display: inline-flex;
  align-items: center;
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0.125rem;
}
</style>
