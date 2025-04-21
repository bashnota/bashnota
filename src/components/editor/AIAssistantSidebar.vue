<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  User, 
  XIcon, 
  SendIcon, 
  Sparkles as SparklesIcon, 
  RefreshCwIcon, 
  CopyIcon, 
  EditIcon, 
  LoaderIcon,
  ScissorsIcon,
  MoreHorizontal
} from 'lucide-vue-next'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { toast } from '@/components/ui/toast'
import { logger } from '@/services/logger'

const props = defineProps<{
  editor: any
  notaId: string
}>()

const emit = defineEmits(['close'])

// Sidebar width resizing functionality
const sidebarWidth = ref(350) // Default width
const minWidth = 250 // Minimum sidebar width
const maxWidth = 600 // Maximum sidebar width
const isResizing = ref(false)

// Save sidebar width to localStorage
const saveSidebarWidth = () => {
  localStorage.setItem('ai-sidebar-width', sidebarWidth.value.toString())
}

// Load sidebar width from localStorage
const loadSidebarWidth = () => {
  const savedWidth = localStorage.getItem('ai-sidebar-width')
  if (savedWidth) {
    sidebarWidth.value = parseInt(savedWidth)
  }
}

// Start resizing the sidebar
const startResizing = (event: MouseEvent) => {
  isResizing.value = true
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResizing)
  // Prevent text selection during resize
  document.body.style.userSelect = 'none'
}

// Handle mouse movement during resizing
const handleMouseMove = (event: MouseEvent) => {
  if (!isResizing.value) return
  
  // Calculate new width based on mouse position
  const newWidth = event.clientX
  
  // Apply constraints
  if (newWidth >= minWidth && newWidth <= maxWidth) {
    sidebarWidth.value = newWidth
  }
}

// Stop resizing
const stopResizing = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResizing)
  // Restore normal text selection
  document.body.style.userSelect = ''
  // Save width preference
  saveSidebarWidth()
}

// Store for managing active AI blocks
const activeAIBlock = ref<any>(null)
const activeBlockId = ref<string | null>(null)
const promptInput = ref('')
const followUpPrompt = ref('')
const isContinuing = ref(false)
const isEditing = ref(false)
const resultInput = ref('')
const selectedText = ref('')
const copied = ref(false)

// Conversation history
const conversationHistory = ref<{ role: 'user' | 'assistant', content: string, timestamp?: Date, id?: string }[]>([])

// AI provider information
const aiSettings = useAISettingsStore()
const selectedProvider = computed(() => {
  return aiSettings.providers.find(p => p.id === aiSettings.settings.preferredProviderId)
})

// Prompt token count
const promptTokenCount = computed(() => {
  return Math.round(promptInput.value.length / 4)
})

// Check if prompt is empty
const isPromptEmpty = computed(() => {
  return !promptInput.value || promptInput.value.trim().length === 0
})

// Check if the active block is loading
const isLoading = computed(() => {
  if (!activeAIBlock.value) return false
  return activeAIBlock.value.node.attrs.isLoading
})

// Format timestamp
function formatTimestamp(date?: Date): string {
  if (!date) return '';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = date instanceof Date ? 
    new Date(date.getFullYear(), date.getMonth(), date.getDate()) : 
    new Date();
  
  // Time part
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  // If same day, just show time
  if (messageDate.getTime() === today.getTime()) {
    return timeStr;
  }
  
  // If within the last week, show day name and time
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayDiff = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff < 7) {
    return `${dayNames[date.getDay()]} ${timeStr}`;
  }
  
  // Otherwise show date and time
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day} ${timeStr}`;
}

// Generate a unique ID for each message
function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Load conversation from AI block
function loadConversationFromBlock(block: any) {
  if (!block) {
    promptInput.value = ''
    conversationHistory.value = []
    return
  }
  
  activeAIBlock.value = block
  activeBlockId.value = block.node.attrs.id
  
  // Reset UI states
  isContinuing.value = false
  isEditing.value = false
  
  // Load the prompt
  promptInput.value = block.node.attrs.prompt || ''
  
  // Reset and build the conversation history
  conversationHistory.value = []
  
  if (block.node.attrs.prompt) {
    conversationHistory.value.push({
      role: 'user',
      content: block.node.attrs.prompt,
      timestamp: new Date(),
      id: generateUniqueId()
    })
  }
  
  if (block.node.attrs.result) {
    conversationHistory.value.push({
      role: 'assistant',
      content: block.node.attrs.result,
      timestamp: new Date(),
      id: generateUniqueId()
    })
  }
  
  // If block has its own conversation history, use that instead
  if (block.conversationHistory && Array.isArray(block.conversationHistory)) {
    conversationHistory.value = block.conversationHistory
  }
}

// Listen for "activate-ai-assistant" event from InlineAIGeneration components
onMounted(() => {
  loadSidebarWidth()
  
  window.addEventListener('activate-ai-assistant', ((event: CustomEvent) => {
    if (event.detail && event.detail.block) {
      loadConversationFromBlock(event.detail.block)
    }
  }) as EventListener)
})

// Clean up event listeners
onBeforeUnmount(() => {
  if (isResizing.value) {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
  }
})

// Generate new text
const generateText = () => {
  if (!activeAIBlock.value || !promptInput.value.trim()) return
  
  try {
    // Update the block attributes
    activeAIBlock.value.updateAttributes({
      prompt: promptInput.value,
      isLoading: true,
      error: ''
    })
    
    // Reset conversation history
    conversationHistory.value = [
      { role: 'user', content: promptInput.value, timestamp: new Date(), id: generateUniqueId() }
    ]
    
    // Use the editor's command to generate AI response
    setTimeout(() => {
      try {
        const pos = activeAIBlock.value.getPos()
        props.editor.commands.generateInlineAI(pos, promptInput.value)
      } catch (error) {
        logger.error('Error generating text:', error)
        activeAIBlock.value.updateAttributes({
          isLoading: false,
          error: 'Failed to generate text. Please try again.'
        })
        toast({
          title: 'Generation Failed',
          description: 'An error occurred while generating text.',
          variant: 'destructive'
        })
      }
    }, 0)
  } catch (error) {
    logger.error('Error in generateText:', error)
    toast({
      title: 'Error',
      description: 'Failed to update AI generation settings',
      variant: 'destructive'
    })
  }
}

// Regenerate text
const regenerateText = () => {
  if (!activeAIBlock.value) return
  
  try {
    // Reset conversation to just the initial prompt
    conversationHistory.value = [
      { role: 'user', content: activeAIBlock.value.node.attrs.prompt }
    ]
    
    // Set loading state
    activeAIBlock.value.updateAttributes({
      isLoading: true,
      error: ''
    })
    
    // Use the editor command to regenerate
    setTimeout(() => {
      try {
        const pos = activeAIBlock.value.getPos()
        props.editor.commands.generateInlineAI(pos, activeAIBlock.value.node.attrs.prompt)
      } catch (error) {
        logger.error('Error regenerating text:', error)
        activeAIBlock.value.updateAttributes({
          isLoading: false,
          error: 'Failed to regenerate text. Please try again.'
        })
      }
    }, 0)
  } catch (error) {
    logger.error('Error in regenerateText:', error)
    toast({
      title: 'Error',
      description: 'Failed to regenerate text',
      variant: 'destructive'
    })
  }
}

// Continue conversation
const continueConversation = () => {
  if (!activeAIBlock.value || !followUpPrompt.value.trim() || isLoading.value) return
  
  try {
    // Add the follow-up prompt to conversation history
    conversationHistory.value.push(
      { role: 'user', content: followUpPrompt.value, timestamp: new Date(), id: generateUniqueId() }
    )
    
    // Create a full conversation context for the AI
    const fullPrompt = conversationHistory.value
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n') + '\n\nAssistant:'
    
    // Set loading state
    activeAIBlock.value.updateAttributes({
      isLoading: true,
      error: ''
    })
    
    // Clear the follow-up prompt
    const savedPrompt = followUpPrompt.value
    followUpPrompt.value = ''
    
    // Generate the continuation
    setTimeout(() => {
      try {
        const pos = activeAIBlock.value.getPos()
        props.editor.commands.generateInlineAI(pos, fullPrompt, true)
      } catch (error) {
        logger.error('Error continuing conversation:', error)
        activeAIBlock.value.updateAttributes({
          isLoading: false,
          error: 'Failed to continue conversation. Please try again.'
        })
        // Restore the prompt if there was an error
        followUpPrompt.value = savedPrompt
      }
    }, 0)
    
    // Exit continuing mode
    isContinuing.value = false
  } catch (error) {
    logger.error('Error in continueConversation:', error)
    toast({
      title: 'Error',
      description: 'Failed to continue conversation',
      variant: 'destructive'
    })
  }
}

// Toggle continuing mode
const toggleContinuing = () => {
  isContinuing.value = !isContinuing.value
  if (isContinuing.value) {
    isEditing.value = false
  }
}

// Edit functionality
const toggleEditing = () => {
  if (!activeAIBlock.value) return
  
  if (!isEditing.value) {
    resultInput.value = activeAIBlock.value.node.attrs.result || ''
  }
  
  isEditing.value = !isEditing.value
  if (isEditing.value) {
    isContinuing.value = false
  }
}

// Save edited text
const saveEditedText = () => {
  if (!activeAIBlock.value) return
  
  // Update the result in the node
  activeAIBlock.value.updateAttributes({
    result: resultInput.value
  })
  
  // Update in conversation history
  if (conversationHistory.value.length > 0) {
    const lastIndex = conversationHistory.value.findIndex(msg => msg.role === 'assistant')
    if (lastIndex !== -1) {
      // Preserve the timestamp and ID, just update the content
      conversationHistory.value[lastIndex].content = resultInput.value
    } else {
      // Create a new assistant message with timestamp and ID
      conversationHistory.value.push({ 
        role: 'assistant', 
        content: resultInput.value,
        timestamp: new Date(),
        id: generateUniqueId()
      })
    }
  }
  
  isEditing.value = false
}

// Copy to clipboard
const copyToClipboard = () => {
  if (!activeAIBlock.value || !activeAIBlock.value.node.attrs.result) return
  
  navigator.clipboard.writeText(activeAIBlock.value.node.attrs.result)
    .then(() => {
      copied.value = true
      toast({
        title: 'Copied to clipboard',
        description: 'AI-generated text has been copied to clipboard'
      })
      setTimeout(() => {
        copied.value = false
      }, 2000)
    })
    .catch(err => {
      logger.error('Failed to copy text: ', err)
      toast({
        title: 'Copy failed',
        description: 'Could not copy text to clipboard',
        variant: 'destructive'
      })
    })
}

// Insert to document
const insertToDocument = () => {
  if (!activeAIBlock.value || !activeAIBlock.value.node.attrs.result) return
  
  try {
    // Get the position of the current node
    const pos = activeAIBlock.value.getPos()
    
    // Insert the text at the position (before the current node)
    props.editor.commands.insertContentAt(pos, activeAIBlock.value.node.attrs.result)
    
    toast({
      title: 'Text Inserted',
      description: 'AI-generated text has been inserted into the document'
    })
  } catch (error) {
    logger.error('Error inserting content:', error)
    
    // Alternative approach: use regular insert at current selection
    props.editor.commands.insertContent(activeAIBlock.value.node.attrs.result)
    
    toast({
      title: 'Text Inserted',
      description: 'Response has been inserted at the current position'
    })
  }
}

// Handle text selection
const handleTextSelection = (messageContent: string) => {
  // Use setTimeout to ensure the selection is complete
  setTimeout(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      selectedText.value = selection.toString()
      
      // Show a small toast notification
      toast({
        title: 'Text Selected',
        description: `${selectedText.value.substring(0, 30)}${selectedText.value.length > 30 ? '...' : ''}`,
        duration: 2000
      })
    }
  }, 10)
}

// Insert selected text to document
const insertSelectionToDocument = () => {
  if (!activeAIBlock.value || !selectedText.value) {
    // If no text is selected, show a toast notification
    if (!selectedText.value) {
      toast({
        title: 'No text selected',
        description: 'Please select some text from the AI response first'
      })
    }
    return
  }
  
  try {
    // Get the position of the current node
    const pos = activeAIBlock.value.getPos()
    
    // Insert the selected text at the position (before the current node)
    props.editor.commands.insertContentAt(pos, selectedText.value)
    
    toast({
      title: 'Selection Inserted',
      description: 'Selected text has been inserted into the document'
    })
    
    // Clear the selection after inserting
    selectedText.value = ''
  } catch (error) {
    logger.error('Error inserting selection:', error)
    
    // Alternative approach: use regular insert at current selection
    props.editor.commands.insertContent(selectedText.value)
    
    toast({
      title: 'Selection Inserted',
      description: 'Selected text has been inserted at the current position'
    })
  }
}

// Copy individual message to clipboard
const copyMessageToClipboard = (content: string) => {
  navigator.clipboard.writeText(content)
    .then(() => {
      toast({
        title: 'Copied to clipboard',
        description: 'Response has been copied to clipboard'
      })
    })
    .catch(err => {
      logger.error('Failed to copy text: ', err)
      toast({
        title: 'Copy failed',
        description: 'Could not copy text to clipboard',
        variant: 'destructive'
      })
    })
}

// Insert individual message to document
const insertMessageToDocument = (content: string) => {
  if (!activeAIBlock.value) return
  
  try {
    // Get the position of the current node
    const pos = activeAIBlock.value.getPos()
    
    // Insert the text at the position (before the current node)
    props.editor.commands.insertContentAt(pos, content)
    
    toast({
      title: 'Text Inserted',
      description: 'Response has been inserted into the document'
    })
  } catch (error) {
    logger.error('Error inserting content:', error)
    
    // Alternative approach: use regular insert at current selection
    props.editor.commands.insertContent(content)
    
    toast({
      title: 'Text Inserted',
      description: 'Response has been inserted at the current position'
    })
  }
}

// Remove the block
const removeBlock = () => {
  if (!activeAIBlock.value) return
  
  const pos = activeAIBlock.value.getPos()
  if (typeof pos === 'number') {
    props.editor.commands.deleteNode('inlineAIGeneration')
    emit('close')
  }
}

// Watch for changes in the active block's result
watch(
  () => activeAIBlock.value?.node.attrs.result,
  (newResult) => {
    if (newResult && !isEditing.value && activeAIBlock.value) {
      // Add new assistant message to conversation when result changes
      const hasAssistantMessage = conversationHistory.value.some(msg => 
        msg.role === 'assistant' && msg.content === newResult
      )
      
      if (!hasAssistantMessage) {
        conversationHistory.value.push({ 
          role: 'assistant', 
          content: newResult, 
          timestamp: new Date(),
          id: generateUniqueId()
        })
      }
    }
  }
)

// Clear active block
const clearActiveBlock = () => {
  activeAIBlock.value = null
  activeBlockId.value = null
  conversationHistory.value = []
  emit('close')
}
</script>

<template>
  <div class="h-full flex flex-col relative" :style="{ width: `${sidebarWidth}px` }">
    <!-- Resize Handle -->
    <div 
      class="absolute h-full w-1 right-0 top-0 cursor-ew-resize hover:bg-primary/20 z-10"
      @mousedown="startResizing"
    ></div>
    
    <!-- Header -->
    <CardHeader class="border-b px-4 py-3 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <SparklesIcon class="h-4 w-4 text-primary" />
          <CardTitle class="text-sm font-medium">{{ selectedProvider?.name || 'AI' }} Assistant</CardTitle>
          <Badge 
            v-if="isLoading" 
            variant="outline" 
            class="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 text-xs"
          >
            <LoaderIcon class="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          class="h-7 w-7 hover:text-destructive" 
          @click="clearActiveBlock"
        >
          <XIcon class="h-4 w-4" />
        </Button>
      </div>
    </CardHeader>
    
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Empty State -->
      <div 
        v-if="!activeAIBlock" 
        class="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 text-center"
      >
        <Bot class="h-12 w-12 mb-4 text-muted-foreground/70" />
        <p class="mb-2">No active AI assistant.</p>
        <p class="text-sm">Click on any AI robot icon in your document to start a conversation.</p>
      </div>
      
      <!-- Conversation Content -->
      <ScrollArea v-else class="flex-1 p-4 space-y-4">
        <div v-for="(message, index) in conversationHistory" :key="message.id || index" class="flex gap-3 mb-4">
          <Avatar :class="message.role === 'user' ? 'bg-muted' : 'bg-primary/10'">
            <User v-if="message.role === 'user'" class="h-4 w-4" />
            <Bot v-else class="h-4 w-4 text-primary" />
          </Avatar>
          
          <div class="flex-1 space-y-1.5">
            <div class="text-xs text-muted-foreground flex items-center justify-between">
              <span>{{ message.role === 'user' ? 'You' : selectedProvider?.name || 'AI' }}</span>
              <span>{{ formatTimestamp(message.timestamp) }}</span>
            </div>
            
            <div 
              class="leading-relaxed"
              :class="message.role === 'assistant' ? 'selectable-text' : ''"
              @mouseup="message.role === 'assistant' ? handleTextSelection(message.content) : null"
              @mousedown="message.role === 'assistant' ? selectedText = '' : null"
            >
              {{ message.content }}
            </div>
            
            <div v-if="message.role === 'assistant'" class="flex items-center gap-2 mt-1.5">
              <Button 
                variant="ghost" 
                size="sm"
                class="h-6 px-1.5 text-xs"
                @click="copyMessageToClipboard(message.content)"
              >
                <CopyIcon class="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                class="h-6 px-1.5 text-xs"
                @click="insertMessageToDocument(message.content)"
              >
                <ScissorsIcon class="h-3 w-3 mr-1" />
                Insert
              </Button>
            </div>
          </div>
        </div>
        
        <!-- Loading Indicator -->
        <div v-if="isLoading" class="flex items-start gap-3">
          <Avatar class="bg-primary/10">
            <Bot class="h-4 w-4 text-primary" />
          </Avatar>
          <div class="text-sm text-muted-foreground">
            <LoaderIcon class="h-4 w-4 animate-spin inline mr-2" />
            Generating response...
          </div>
        </div>
        
        <!-- Error Message -->
        <div v-if="activeAIBlock?.node.attrs.error" class="flex items-start gap-3 text-destructive">
          <Avatar class="bg-destructive/10">
            <XIcon class="h-4 w-4 text-destructive" />
          </Avatar>
          <div class="space-y-2">
            <div class="text-sm">Error: {{ activeAIBlock.node.attrs.error }}</div>
            <Button 
              variant="secondary" 
              size="sm"
              class="h-7 text-xs"
              @click="regenerateText"
            >
              <RefreshCwIcon class="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      </ScrollArea>
      
      <!-- Input Area -->
      <div v-if="activeAIBlock" class="border-t p-3 bg-muted/20">
        <!-- New Prompt Input (if no conversation yet) -->
        <div v-if="!activeAIBlock.node.attrs.result && !activeAIBlock.node.attrs.isLoading">
          <Textarea
            v-model="promptInput"
            placeholder="Enter your prompt here..."
            class="min-h-[80px] resize-none w-full"
            @keydown.ctrl.enter.prevent="generateText"
          />
          <div class="flex justify-between items-center text-xs text-muted-foreground mt-2">
            <span>{{ promptTokenCount }} tokens (approx)</span>
            <Button 
              size="sm" 
              class="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
              @click="generateText" 
              :disabled="isPromptEmpty"
            >
              <LoaderIcon v-if="isLoading" class="h-3.5 w-3.5 mr-1.5 animate-spin" />
              <SparklesIcon v-else class="h-3.5 w-3.5 mr-1.5" />
              Generate
            </Button>
          </div>
        </div>
        
        <!-- Continue Conversation -->
        <div v-else-if="isContinuing">
          <Textarea
            v-model="followUpPrompt"
            placeholder="Continue the conversation..."
            class="min-h-[80px] resize-none w-full"
            :disabled="isLoading"
            @keydown.ctrl.enter.prevent="continueConversation"
          />
          <div class="flex justify-between items-center text-xs text-muted-foreground mt-2">
            <span>Ctrl+Enter to send</span>
            <Button 
              size="sm" 
              class="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
              @click="continueConversation" 
              :disabled="!followUpPrompt.trim() || isLoading"
            >
              <SendIcon class="h-3.5 w-3.5 mr-1.5" />
              Send
            </Button>
          </div>
        </div>
        
        <!-- Edit Response -->
        <div v-else-if="isEditing">
          <Textarea
            v-model="resultInput"
            class="min-h-[80px] resize-none w-full"
            @keydown.ctrl.enter.prevent="saveEditedText"
          />
          <div class="flex justify-end gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline"
              @click="toggleEditing"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              variant="default"
              @click="saveEditedText"
            >
              Save Changes
            </Button>
          </div>
        </div>
        
        <!-- Default Actions Bar -->
        <div v-else-if="activeAIBlock.node.attrs.result" class="flex justify-between">
          <div class="flex gap-1">
            <Button 
              variant="secondary" 
              size="sm"
              class="h-8"
              @click="regenerateText"
              :disabled="isLoading"
            >
              <RefreshCwIcon class="h-3.5 w-3.5 mr-1" />
              Regenerate
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              class="h-8"
              @click="toggleContinuing"
            >
              <SendIcon class="h-3.5 w-3.5 mr-1" />
              Continue
            </Button>
          </div>
          
          <div class="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" class="h-8 w-8">
                  <MoreHorizontal class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="copyToClipboard">
                  <CopyIcon class="h-4 w-4 mr-2" />
                  <span>Copy all</span>
                </DropdownMenuItem>
                <DropdownMenuItem @click="toggleEditing">
                  <EditIcon class="h-4 w-4 mr-2" />
                  <span>Edit response</span>
                </DropdownMenuItem>
                <DropdownMenuItem @click="insertSelectionToDocument" :disabled="!selectedText">
                  <ScissorsIcon class="h-4 w-4 mr-2" />
                  <span>Insert selection</span>
                </DropdownMenuItem>
                <DropdownMenuItem @click="removeBlock" class="text-destructive">
                  <XIcon class="h-4 w-4 mr-2" />
                  <span>Remove block</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="default" 
              size="sm"
              class="h-8"
              @click="insertToDocument"
            >
              Insert
            </Button>
          </div>
        </div>
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

/* Code block styling within AI responses */
.selectable-text :deep(pre),
.selectable-text :deep(code) {
  background-color: hsl(var(--muted));
  border-radius: 4px;
  padding: 0.2em 0.4em;
  font-family: 'Courier New', monospace;
  border-left: 2px solid hsl(var(--primary));
}

.selectable-text :deep(pre) {
  padding: 0.5em;
  margin: 0.5em 0;
  overflow-x: auto;
}
</style>