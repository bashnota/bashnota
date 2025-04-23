<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { logger } from '@/services/logger'
import { toast } from '@/components/ui/toast'

// Import composables
import { useConversation } from '../composables/useConversation'
import { useAIGeneration } from '../composables/useAIGeneration'
import { useMentions } from '../composables/useMentions'

// Import components
import SidebarHeader from './SidebarHeader.vue'
import ConversationHistory from './ConversationHistory.vue'
import ConversationInput from './ConversationInput.vue'
import ActionBar from './ActionBar.vue'
import EmptyState from './EmptyState.vue'
import FullscreenWrapper from './FullscreenWrapper.vue'

// Import the fullscreen icons
import { Maximize2, Minimize2 } from 'lucide-vue-next'

const props = defineProps<{
  editor: any
  notaId: string
}>()

const emit = defineEmits(['close'])

// AI Settings store
const aiSettings = useAISettingsStore()
const selectedProvider = computed(() => {
  return aiSettings.providers.find(p => p.id === aiSettings.settings.preferredProviderId)
})

// Initialize composables
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

const {
  generateText: generateTextAction,
  continueConversation: continueAction,
  regenerateText: regenerateAction,
  removeBlock: removeBlockAction
} = useAIGeneration(props.editor)

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



// Reference to the textarea for mention search
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Add fullscreen state
const isFullscreen = ref(false)

// Functions for handling fullscreen
const enterFullscreen = () => {
  isFullscreen.value = true
}

const exitFullscreen = () => {
  isFullscreen.value = false
}

// Toggle fullscreen function
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

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
    
    // Exit fullscreen mode after inserting
    if (isFullscreen.value) {
      isFullscreen.value = false
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
    
    // Exit fullscreen mode after inserting
    if (isFullscreen.value) {
      isFullscreen.value = false
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
    
    // Exit fullscreen mode after inserting
    if (isFullscreen.value) {
      isFullscreen.value = false
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

// Listen for "activate-ai-assistant" event from InlineAIGeneration components
onMounted(() => {
  
  window.addEventListener('activate-ai-assistant', ((event: CustomEvent) => {
    if (event.detail && event.detail.block) {
      loadConversationFromBlock(event.detail.block)
    }
  }) as EventListener)
  
  document.addEventListener('mousedown', handleOutsideClick)
})

// Clean up event listeners
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
})
</script>

<template>
  <FullscreenWrapper 
    :is-fullscreen="isFullscreen"
    @exit-fullscreen="exitFullscreen"
    @enter-fullscreen="enterFullscreen"
  >

    
    <!-- Content container with proper width styling -->
    <div
      class="flex flex-col h-full w-full overflow-hidden"
    >
      <!-- Header -->
      <SidebarHeader 
        :provider-name="selectedProvider?.name || 'AI'" 
        :is-loading="isLoading"
        :is-fullscreen="isFullscreen"
        @close="emit('close')"
        @toggle-fullscreen="toggleFullscreen"
      />
      
      <div class="flex-1 flex flex-col overflow-hidden min-h-0 relative">
        <!-- Empty State when no active conversation -->
        <EmptyState 
          v-if="!activeAIBlock" 
          @create-session="createNewSession"
        />
        
        <!-- Conversation Content when a conversation is active -->
        <template v-else>
          <!-- Conversation History - scrollable area with padding and styling -->
          <div class="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gradient-to-b from-background to-muted/10">
            <ConversationHistory
              :conversation-history="conversationHistory"
              :is-loading="isLoading"
              :error="error"
              :provider-name="selectedProvider?.name || 'AI'"
              :format-timestamp="formatTimestamp"
              @copy-message="copyMessageToClipboard"
              @insert-message="insertMessageToDocument"
              @select-text="handleTextSelection"
              @retry="regenerateText"
            />
          </div>
          
          <!-- Input Area - fixed at bottom with improved styling -->
          <div class="border-t p-3 bg-background flex-shrink-0 shadow-[0_-2px_5px_rgba(0,0,0,0.03)]">
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
        </template>
      </div>
    </div>
  </FullscreenWrapper>
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