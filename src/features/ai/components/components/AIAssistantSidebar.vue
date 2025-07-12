<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, toRef } from 'vue'
import { Textarea } from '@/ui/textarea'
import { Button } from '@/ui/button'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import { logger } from '@/services/logger'
import { toast } from '@/ui/toast'

// Import composables
import { useConversation } from '@/features/ai/components/composables/useConversation'
import type { ChatHistoryItem } from '@/features/ai/components/composables/useConversation'
import { useAIGeneration } from '@/features/ai/components/composables/useAIGeneration'
import { useMentions } from '@/features/ai/components/composables/useMentions'
import { useAIProviders } from '@/features/ai/components/composables/useAIProviders'
import { useStreamingMode } from '@/features/ai/components/composables/useStreamingMode'

// Import components
import { ScrollArea } from '@/ui/scroll-area'
import ConversationHistory from './ConversationHistory.vue'
import ConversationInput from './ConversationInput.vue'
import ActionBar from './ActionBar.vue'
import EmptyState from './EmptyState.vue'
import ChatList from './ChatList.vue'
import MentionSearch from './MentionSearch.vue'

// Import the icons
import { List as ListIcon, ArrowLeft as ArrowLeftIcon, Cpu as CpuIcon, Zap as ZapIcon } from 'lucide-vue-next'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor | null
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
  initialize: initializeProviders,
  selectProvider,
  availableProviders,
  checkAllProviders
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
} = useAIGeneration(toRef(props, 'editor'), props.notaId)

// Format progress percentage
const formattedProgress = computed(() => {
  return `${Math.round(webLLMProgress.value * 100)}%`
})

// Reference to the textarea for mention search
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const conversationInputRef = ref<any | null>(null)

// Helper function to get the current textarea from ConversationInput
const getTextareaRef = () => {
  if (conversationInputRef.value) {
    return conversationInputRef.value.getTextareaRef?.() || null
  }
  return null
}

// Create a WebLLM state update interval
const webLLMStateInterval = ref<number | null>(null)

// Computed properties
const hasResult = computed(() => {
  return activeAIBlock.value?.node.attrs.result
})

const error = computed(() => {
  return activeAIBlock.value?.node.attrs.error || ''
})

// Add a debug function to log all received events
const debugEvent = (event: string, payload: any) => {
  console.log(`[AIAssistantSidebar] Debug: Received event: ${event}`, payload)
}

// Handle model change
const handleModelChange = async (modelId: string) => {
  console.log('[AIAssistantSidebar] handleModelChange called with:', modelId)
  
  try {
    // Log the current provider before change
    console.log('[AIAssistantSidebar] Current provider before change:', aiSettings.settings.preferredProviderId)
    
    // Update the preferred provider in the AI settings store
    aiSettings.setPreferredProvider(modelId)
    
    // Directly select the provider using the provider API and await the result
    console.log('[AIAssistantSidebar] Directly selecting provider using useAIProviders.selectProvider()...')
    const success = await selectProvider(modelId)
    console.log(`[AIAssistantSidebar] Direct provider selection ${success ? 'succeeded' : 'failed'}`)
    
    // Log the provider after change
    console.log('[AIAssistantSidebar] Provider after change:', aiSettings.settings.preferredProviderId)
    
    // Show toast notification
    const provider = aiSettings.providers.find(p => p.id === modelId)
    toast({
      title: "AI Model Changed",
      description: `Now using ${provider?.name || 'new model'}`,
      variant: "default"
    })
  } catch (error) {
    console.error('[AIAssistantSidebar] Error changing AI model:', error)
    logger.error('Error changing AI model:', error)
    toast({
      title: "Error",
      description: "Failed to change AI model",
      variant: "destructive" 
    })
  }
}

// Expose functions for template access
defineExpose({
  handleModelChange
})


// Generate text with mentions
const generateText = async () => {
  if (!activeAIBlock.value || !promptInput.value.trim()) return
  
  try {
    // Ensure we're not already in a loading state
    if (isLoading.value) return
    
    // Set loading state
    isLoading.value = true
    
    // Ensure provider is correctly selected before generating text
    const preferredProviderId = aiSettings.settings.preferredProviderId
    await selectProvider(preferredProviderId)
    console.log('[AIAssistantSidebar] generateText - Using provider:', preferredProviderId)
    
    // Check if there are any mentioned notas
    if (promptInput.value.includes('#[')) {
      // Process with mentions
      const enhancedPrompt = await loadMentionedNotaContents(promptInput.value)
      
      // Generate with enhanced prompt
      console.log('[AIAssistantSidebar] Calling generateTextAction with enhanced prompt')
      const newHistory = await generateTextAction(
        activeAIBlock.value, 
        enhancedPrompt, 
        conversationHistory.value,
        formatTimestamp,
        preferredProviderId // Pass the preferred provider explicitly
      )
      if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    } else {
      // Generate normally
      console.log('[AIAssistantSidebar] Calling generateTextAction with normal prompt')
      const newHistory = await generateTextAction(
        activeAIBlock.value, 
        promptInput.value, 
        conversationHistory.value,
        formatTimestamp,
        preferredProviderId // Pass the preferred provider explicitly
      )
      if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    }
    
    // Log the provider after generation
    console.log('[AIAssistantSidebar] generateText - Current provider after generation:', aiSettings.settings.preferredProviderId)
    
    // Clear mentions after generation
    clearMentions()
  } catch (error) {
    console.error('[AIAssistantSidebar] Error in generateText:', error)
    logger.error('Error in generateText:', error)
    toast({
      title: 'Error',
      description: 'Failed to generate text',
      variant: 'destructive'
    })
  } finally {
    // Always reset loading state regardless of success/failure
    isLoading.value = false
  }
}

// Continue conversation with mentions
const continueConversation = async () => {
  if (!activeAIBlock.value || !followUpPrompt.value.trim() || isLoading.value) return
  
  try {
    // Set loading state
    isLoading.value = true
    
    // Ensure provider is correctly selected before continuing
    const preferredProviderId = aiSettings.settings.preferredProviderId
    await selectProvider(preferredProviderId)
    console.log('[AIAssistantSidebar] continueConversation - Using provider:', preferredProviderId)
    
    // Check if there are any mentioned notas
    if (followUpPrompt.value.includes('#[')) {
      const enhancedPrompt = await loadMentionedNotaContents(followUpPrompt.value)
      
      // Continue with enhanced prompt
      console.log('[AIAssistantSidebar] Calling continueAction with enhanced prompt')
      const newHistory = await continueAction(
        activeAIBlock.value, 
        enhancedPrompt, 
        conversationHistory.value,
        formatTimestamp,
        preferredProviderId // Pass the preferred provider explicitly
      )
      if (newHistory) conversationHistory.value = newHistory as typeof conversationHistory.value
    } else {
      // Continue normally
      console.log('[AIAssistantSidebar] Calling continueAction with normal prompt')
      const newHistory = await continueAction(
        activeAIBlock.value, 
        followUpPrompt.value, 
        conversationHistory.value,
        formatTimestamp,
        preferredProviderId // Pass the preferred provider explicitly
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
  } finally {
    // Always reset loading state regardless of success/failure
    isLoading.value = false
  }
}

// Regenerate text
const regenerateText = async () => {
  if (!activeAIBlock.value || isLoading.value) return
  
  try {
    // Ensure provider is correctly selected before regenerating
    const preferredProviderId = aiSettings.settings.preferredProviderId
    await selectProvider(preferredProviderId)
    console.log('[AIAssistantSidebar] regenerateText - Using provider:', preferredProviderId)
    
    console.log('[AIAssistantSidebar] Calling regenerateAction')
    const newHistory = await regenerateAction(
      activeAIBlock.value, 
      conversationHistory.value,
      preferredProviderId // Pass the preferred provider explicitly
    )
    if (newHistory) conversationHistory.value = newHistory
  } catch (error) {
    console.error('[AIAssistantSidebar] Error in regenerateText:', error)
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
  if (!activeAIBlock.value || !activeAIBlock.value.node.attrs.result || !props.editor) return
  
  try {
    const text = activeAIBlock.value.node.attrs.result
    const { state } = props.editor
    const { selection } = state
    const isInListItem = selection.$anchor.parent.type.name === 'listItem'
    
    if (isInListItem) {
      props.editor.chain().focus().insertContent({
        type: 'paragraph',
        content: [{ type: 'text', text }]
      }).run()
    } else {
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
  if (!selectedText.value || !props.editor) return
  
  try {
    const { state } = props.editor
    const { selection } = state
    const isInListItem = selection.$anchor.parent.type.name === 'listItem'
    
    if (isInListItem) {
      props.editor.chain().focus().insertContent({
        type: 'paragraph',
        content: [{ type: 'text', text: selectedText.value }]
      }).run()
    } else {
      props.editor.chain().focus().insertContent(selectedText.value).run()
    }
    
    toast({
      title: 'Inserted',
      description: 'Selection inserted into document',
      variant: 'default'
    })
    
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
  if (!props.editor) return

  try {
    const { state } = props.editor
    const { selection } = state
    const isInListItem = selection.$anchor.parent.type.name === 'listItem'
    
    if (isInListItem) {
      props.editor.chain().focus().insertContent({
        type: 'paragraph',
        content: [{ type: 'text', text }]
      }).run()
    } else {
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

// Remove the AI block from the editor
const removeBlock = () => {
  if (activeAIBlock.value) {
    removeBlockAction(activeAIBlock.value)
    clearActiveBlock()
    
    toast({
      title: 'Removed',
      description: 'AI response block has been removed',
      variant: 'default'
    })
  }
}

// Handle mentions selection
const handleMentionSelection = (nota: any) => {
  // Use the textarea ref from ConversationInput when possible
  const currentTextareaRef = getTextareaRef() || textareaRef
  selectNotaFromSearch(nota, currentTextareaRef, isContinuing.value, promptInput, followUpPrompt)
}

// Update mention search query
const handleUpdateMentionQuery = (query: string) => {
  updateMentionQuery(query)
}

// Close mention search popup
const handleCloseMentionSearch = () => {
  closeMentionSearch()
}

// Add function to log provider availability
const logProviderAvailability = () => {
  console.log('[AIAssistantSidebar] Current provider:', aiSettings.settings.preferredProviderId)
  console.log('[AIAssistantSidebar] Available providers:', availableProviders.value.join(', '))
  console.log('[AIAssistantSidebar] WebLLM model:', currentWebLLMModel.value || 'none')
}

// Explicitly initialize the providers on component mount
onMounted(async () => {
  try {
    await initializeProviders(false) // Force checking all providers, not just the current one
    logger.info('AI providers initialized')
    
    // Log provider availability after initialization
    logProviderAvailability()
    
    // Set up periodic check of provider availability
    const providerCheckInterval = window.setInterval(() => {
      console.log('[AIAssistantSidebar] Periodic provider check...')
      updateWebLLMState()
      
      // Only check the current provider to avoid unnecessary network requests
      checkAllProviders(true)
      
      logProviderAvailability()
    }, 30000) // Check every 30 seconds instead of 5 seconds
    
    // Clean up interval on unmount
    onBeforeUnmount(() => {
      clearInterval(providerCheckInterval)
    })
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
const handleSelectChat = (chatItem: ChatHistoryItem) => {
  // Create a virtual block object compatible with loadConversationFromBlock
  const virtualBlock = {
    node: {
      attrs: {
        blockId: chatItem.blockId,
        prompt: chatItem.title,
        result: chatItem.preview,
        loading: false,
        error: '',
        lastUpdated: chatItem.updatedAt?.toISOString?.() || new Date().toISOString()
      }
    },
    type: 'aiGeneration'
  }
  
  loadConversationFromBlock(virtualBlock)
  showChatList.value = false
}

// Get ID for the active block for highlighting in the list
const activeBlockId = computed(() => {
  if (!activeAIBlock.value) return undefined
  // Use the blockId if available, otherwise fall back to a generated ID
  return activeAIBlock.value.node.attrs.blockId || `ai-${activeAIBlock.value.node.attrs.lastUpdated || Date.now()}`
})

// Toggle between chat list and current conversation
const toggleChatList = () => {
  showChatList.value = !showChatList.value
}

// Handle deleting a chat from the chat list
const handleDeleteChat = (chatItem: ChatHistoryItem) => {
  // If we're deleting the currently active chat, clear the active block
  if (activeAIBlock.value?.node.attrs.blockId === chatItem.blockId) {
    clearActiveBlock()
  }
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
          @create-session="() => createNewSession()"
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
              @create-new="() => createNewSession()"
              @delete-chat="handleDeleteChat"
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
              <div class="flex flex-col">
                <!-- Mention Search Component -->
                <div v-if="showMentionSearch" class="mb-2">
                  <MentionSearch
                    :is-visible="showMentionSearch"
                    :query="mentionSearchResults.length > 0 ? mentionSearchResults[0]?.searchQuery || '' : ''"
                    :search-results="mentionSearchResults"
                    :position="null"
                    @select="handleMentionSelection"
                    @close="handleCloseMentionSearch"
                    @update-query="handleUpdateMentionQuery"
                  />
                </div>
                
                <!-- WebLLM Streaming toggle only -->
                <div class="flex items-center justify-end" v-if="aiSettings.settings.preferredProviderId === 'webllm'">
                  <Button 
                    variant="outline" 
                    size="sm"
                    class="text-xs h-8 px-2 py-1 flex items-center gap-1"
                    :class="{'bg-primary/10': isStreamingEnabled}"
                    @click="toggleStreamingMode"
                    title="Toggle live streaming mode for WebLLM"
                  >
                    <ZapIcon class="h-3.5 w-3.5" :class="{'text-primary': isStreamingEnabled}" />
                    <span>Live Mode</span>
                  </Button>
                </div>
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
                  @check-mentions="checkForMentions($event, null)"
                  @select-mention="handleMentionSelection"
                  @update-mention-search="handleUpdateMentionQuery"
                  @close-mention-search="handleCloseMentionSearch"
                  ref="conversationInputRef"
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

/* Animation for mention search appearance */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mb-2 {
  animation: slideInUp 0.2s ease-out;
}
</style>








