<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  SparklesIcon, 
  LoaderIcon, 
  RefreshCwIcon, 
  XIcon, 
  CopyIcon, 
  CheckIcon, 
  EditIcon, 
  SendIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon,
  TerminalIcon,
  MaximizeIcon,
  MinimizeIcon,
  ScissorsIcon
} from 'lucide-vue-next'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { toast } from '@/components/ui/toast'

const props = defineProps(nodeViewProps)

const aiSettings = useAISettingsStore()
const promptInput = ref(props.node.attrs.prompt || '')
const resultInput = ref(props.node.attrs.result || '')
const isExpanded = ref(!props.node.attrs.result)
const isEditing = ref(false)
const isContinuing = ref(false)
const followUpPrompt = ref('')
const copied = ref(false)
const isFullscreen = ref(false)
const isCollapsed = ref(false)
// Add timestamp and id to conversation history items
const conversationHistory = ref<{ role: 'user' | 'assistant', content: string, timestamp?: Date, id?: string }[]>([
  { role: 'user', content: props.node.attrs.prompt || '', timestamp: new Date(), id: generateUniqueId() },
  { role: 'assistant', content: props.node.attrs.result || '', timestamp: new Date(), id: generateUniqueId() }
])
// Terminal-style history navigation
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)

// Generate a unique ID for each message
function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Format timestamp
function formatTimestamp(date?: Date): string {
  if (!date) return '';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // Time part
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}:${seconds}`;
  
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

const selectedProvider = computed(() => {
  return aiSettings.providers.find(p => p.id === aiSettings.settings.preferredProviderId)
})

// Approximate token count (4 chars ≈ 1 token for most models)
const promptTokenCount = computed(() => {
  return Math.round(promptInput.value.length / 4)
})

const resultTokenCount = computed(() => {
  return Math.round((props.node.attrs.result?.length || 0) / 4)
})

const selectedText = ref<string>('')

// Reset loading state on mount to ensure it's not stuck
onMounted(() => {
  if (props.node.attrs.isLoading) {
    props.updateAttributes({
      isLoading: false,
      error: ''
    })
  }
})

// Watch for changes in the loading state
watch(() => props.node.attrs.isLoading, (newValue) => {
  // Remove debug log
})

// After the other watchers
watch(promptInput, (newValue) => {
  // Remove debug log
}, { immediate: true })

const generateText = () => {
  if (!promptInput.value.trim()) {
    return
  }
  
  // Add to command history
  if (commandHistory.value.indexOf(promptInput.value) === -1) {
    commandHistory.value.unshift(promptInput.value)
    if (commandHistory.value.length > 50) commandHistory.value.pop()
  }
  historyIndex.value = -1
  
  try {
    // Update the prompt attribute first
    props.updateAttributes({
      prompt: promptInput.value,
      isLoading: true,
      error: ''
    })
    
    // Reset conversation history
    conversationHistory.value = [
      { role: 'user', content: promptInput.value, timestamp: new Date(), id: generateUniqueId() }
    ]
    
    // Use a setTimeout to ensure the attribute update has been processed
    setTimeout(() => {
      try {
        props.editor.commands.generateInlineAI(props.getPos(), promptInput.value)
      } catch (error) {
        console.error('Error generating text:', error)
        props.updateAttributes({
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
    
    // Collapse the input after generating
    isExpanded.value = false
  } catch (error) {
    console.error('Error in generateText:', error)
    props.updateAttributes({
      isLoading: false,
      error: 'Failed to update AI generation settings'
    })
    toast({
      title: 'Error',
      description: 'Failed to update AI generation settings',
      variant: 'destructive'
    })
  }
}

const regenerateText = () => {
  try {
    // Reset conversation to just the initial prompt
    conversationHistory.value = [
      { role: 'user', content: props.node.attrs.prompt }
    ]
    
    // Set loading state
    props.updateAttributes({
      isLoading: true,
      error: ''
    })
    
    // Use setTimeout to ensure the attribute update has been processed
    setTimeout(() => {
      try {
        props.editor.commands.generateInlineAI(props.getPos(), props.node.attrs.prompt)
      } catch (error) {
        console.error('Error regenerating text:', error)
        props.updateAttributes({
          isLoading: false,
          error: 'Failed to regenerate text. Please try again.'
        })
      }
    }, 0)
  } catch (error) {
    console.error('Error in regenerateText:', error)
    toast({
      title: 'Error',
      description: 'Failed to regenerate text',
      variant: 'destructive'
    })
  }
}

const continueConversation = () => {
  if (!followUpPrompt.value.trim() || props.node.attrs.isLoading) return
  
  try {
    // Add to command history
    if (commandHistory.value.indexOf(followUpPrompt.value) === -1) {
      commandHistory.value.unshift(followUpPrompt.value)
      if (commandHistory.value.length > 50) commandHistory.value.pop()
    }
    historyIndex.value = -1
    
    // Add the follow-up prompt to conversation history
    conversationHistory.value.push(
      { role: 'user', content: followUpPrompt.value, timestamp: new Date(), id: generateUniqueId() }
    )
    
    // Create a full conversation context for the AI
    const fullPrompt = conversationHistory.value
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n') + '\n\nAssistant:'
    
    // Set loading state directly
    props.updateAttributes({
      isLoading: true,
      error: ''
    })
    
    // Clear the follow-up prompt
    const savedPrompt = followUpPrompt.value
    followUpPrompt.value = ''
    
    // Use setTimeout to ensure the attribute update has been processed
    setTimeout(() => {
      try {
        // Generate continuation
        props.editor.commands.generateInlineAI(props.getPos(), fullPrompt, true)
      } catch (error) {
        console.error('Error continuing conversation:', error)
        props.updateAttributes({
          isLoading: false,
          error: 'Failed to continue conversation. Please try again.'
        })
        // Restore the prompt if there was an error
        followUpPrompt.value = savedPrompt
      }
    }, 0)
  } catch (error) {
    console.error('Error in continueConversation:', error)
    toast({
      title: 'Error',
      description: 'Failed to continue conversation',
      variant: 'destructive'
    })
  }
}

const saveEditedText = () => {
  // Update the result in the node
  props.updateAttributes({
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

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const toggleEditing = () => {
  if (!isEditing.value) {
    resultInput.value = props.node.attrs.result || ''
  }
  isEditing.value = !isEditing.value
}

const toggleContinuing = () => {
  isContinuing.value = !isContinuing.value
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
}

const removeBlock = () => {
  const pos = props.getPos()
  if (typeof pos === 'number') {
    props.editor.commands.deleteNode('inlineAIGeneration')
  }
}

const copyToClipboard = () => {
  if (!props.node.attrs.result) return
  
  navigator.clipboard.writeText(props.node.attrs.result)
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
      console.error('Failed to copy text: ', err)
      toast({
        title: 'Copy failed',
        description: 'Could not copy text to clipboard',
        variant: 'destructive'
      })
    })
}

const insertToDocument = () => {
  if (!props.node.attrs.result) return
  
  try {
    // Get the position of the current node
    const pos = props.getPos()
    
    // Insert the text at the position (before the current node)
    props.editor.commands.insertContentAt(pos, props.node.attrs.result)
    
    toast({
      title: 'Text Inserted',
      description: 'AI-generated text has been inserted above the terminal'
    })
  } catch (error) {
    console.error('Error inserting content:', error)
    
    // Alternative approach: use regular insert at current selection
    props.editor.commands.insertContent(props.node.attrs.result)
    
    toast({
      title: 'Text Inserted',
      description: 'AI-generated text has been inserted at the current position'
    })
  }
}

const insertSelectionToDocument = () => {
  if (!selectedText.value) {
    // If no text is selected, show a toast notification
    toast({
      title: 'No text selected',
      description: 'Please select some text from the AI response first'
    })
    return
  }
  
  try {
    // Get the position of the current node
    const pos = props.getPos()
    
    // Insert the selected text at the position (before the current node)
    props.editor.commands.insertContentAt(pos, selectedText.value)
    
    toast({
      title: 'Selection Inserted',
      description: 'Selected text has been inserted above the terminal'
    })
    
    // Clear the selection after inserting
    selectedText.value = ''
  } catch (error) {
    console.error('Error inserting selection:', error)
    
    // Alternative approach: use regular insert at current selection
    props.editor.commands.insertContent(selectedText.value)
    
    toast({
      title: 'Selection Inserted',
      description: 'Selected text has been inserted at the current position'
    })
  }
}

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

// Terminal-style history navigation
const navigateHistory = (direction: 'up' | 'down') => {
  if (commandHistory.value.length === 0) return
  
  if (direction === 'up') {
    historyIndex.value = Math.min(historyIndex.value + 1, commandHistory.value.length - 1)
    if (isExpanded.value) {
      promptInput.value = commandHistory.value[historyIndex.value]
    } else if (isContinuing.value) {
      followUpPrompt.value = commandHistory.value[historyIndex.value]
    }
  } else if (direction === 'down') {
    historyIndex.value = Math.max(historyIndex.value - 1, -1)
    if (historyIndex.value === -1) {
      if (isExpanded.value) {
        promptInput.value = ''
      } else if (isContinuing.value) {
        followUpPrompt.value = ''
      }
    } else {
      if (isExpanded.value) {
        promptInput.value = commandHistory.value[historyIndex.value]
      } else if (isContinuing.value) {
        followUpPrompt.value = commandHistory.value[historyIndex.value]
      }
    }
  }
}

// Keyboard shortcut handling
const handleKeyDown = (e: KeyboardEvent) => {
  // Only handle shortcuts when this component is focused or has a child focused
  const isComponentFocused = document.activeElement?.closest('.inline-ai-block')
  if (!isComponentFocused) return
  
  // Terminal-style history navigation with up/down arrows
  if (e.key === 'ArrowUp' && (isExpanded.value || isContinuing.value)) {
    e.preventDefault()
    navigateHistory('up')
    return
  }
  
  if (e.key === 'ArrowDown' && (isExpanded.value || isContinuing.value)) {
    e.preventDefault()
    navigateHistory('down')
    return
  }
  
  // Ctrl+Enter to generate text or send follow-up
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    if (isExpanded.value) {
      generateText()
    } else if (isContinuing.value) {
      continueConversation()
    }
  }
  
  // Escape to collapse expanded view or exit editing/continuing
  if (e.key === 'Escape') {
    e.preventDefault()
    if (isFullscreen.value) {
      isFullscreen.value = false
    } else if (isEditing.value) {
      isEditing.value = false
    } else if (isContinuing.value) {
      isContinuing.value = false
    } else if (isExpanded.value) {
      isExpanded.value = false
    }
  }
  
  // Ctrl+L to clear the terminal-like input
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault()
    if (isExpanded.value) {
      promptInput.value = ''
    } else if (isContinuing.value) {
      followUpPrompt.value = ''
    }
  }
}

// Update conversation history when result changes
watch(() => props.node.attrs.result, (newResult) => {
  if (newResult && !isEditing.value) {
    // Always add a new assistant message when we get a response
    conversationHistory.value.push({ 
      role: 'assistant', 
      content: newResult, 
      timestamp: new Date(),
      id: generateUniqueId()
    })
  }
}, { immediate: true })

// Set up keyboard shortcuts
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// Add new methods for handling individual messages
const copyMessageToClipboard = (content: string) => {
  navigator.clipboard.writeText(content)
    .then(() => {
      toast({
        title: 'Copied to clipboard',
        description: 'Response has been copied to clipboard'
      })
    })
    .catch(err => {
      console.error('Failed to copy text: ', err)
      toast({
        title: 'Copy failed',
        description: 'Could not copy text to clipboard',
        variant: 'destructive'
      })
    })
}

const insertMessageToDocument = (content: string) => {
  try {
    // Get the position of the current node
    const pos = props.getPos()
    
    // Insert the text at the position (before the current node)
    props.editor.commands.insertContentAt(pos, content)
    
    toast({
      title: 'Text Inserted',
      description: 'Response has been inserted above the terminal'
    })
  } catch (error) {
    console.error('Error inserting content:', error)
    
    // Alternative approach: use regular insert at current selection
    props.editor.commands.insertContent(content)
    
    toast({
      title: 'Text Inserted',
      description: 'Response has been inserted at the current position'
    })
  }
}

// Add this with the other computed properties
const isPromptEmpty = computed(() => {
  return !promptInput.value || promptInput.value.trim().length === 0
})
</script>

<template>
  <NodeViewWrapper class="inline-ai-block" :class="{ 'fullscreen': isFullscreen }">
    <div class="terminal-container border rounded-lg overflow-hidden shadow-md" 
      :class="{ 
        'fullscreen-container': isFullscreen,
        'collapsed': isCollapsed 
      }">
      <!-- Terminal Header -->
      <div class="terminal-header flex justify-between items-center px-3 py-2 bg-gradient-to-r from-gray-900 to-gray-800 text-white border-b border-gray-700">
        <div class="flex items-center">
          <TerminalIcon class="h-4 w-4 mr-2 text-green-400" />
          <span class="text-sm font-mono font-medium">{{ selectedProvider?.name || 'AI' }} Terminal</span>
        </div>
        <div class="flex space-x-1.5">
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-6 w-6 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors" 
            @click="toggleCollapsed"
            title="Toggle collapse"
          >
            <ChevronUpIcon v-if="!isCollapsed" class="h-3.5 w-3.5" />
            <ChevronDownIcon v-else class="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-6 w-6 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors" 
            @click="toggleFullscreen"
            title="Toggle fullscreen"
          >
            <MaximizeIcon v-if="!isFullscreen" class="h-3.5 w-3.5" />
            <MinimizeIcon v-else class="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-6 w-6 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors" 
            @click="removeBlock"
            title="Close terminal"
          >
            <XIcon class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <!-- Terminal Content -->
      <div v-if="!isCollapsed" class="terminal-content bg-gradient-to-b from-gray-900 to-black text-green-400 font-mono p-3 overflow-auto" :class="{ 'fullscreen-content': isFullscreen }">
        <!-- Conversation History -->
        <div v-if="conversationHistory.length > 0" class="mb-3 space-y-4">
          <!-- Group messages by conversation turn (user followed by assistant) -->
          <template v-for="(message, index) in conversationHistory" :key="message.id || index">
            <!-- Add timestamp separator if this is a new user message after an assistant message -->
            <div v-if="index > 0 && message.role === 'user' && conversationHistory[index-1].role === 'assistant'" 
                 class="terminal-timestamp-separator flex items-center my-4">
              <div class="h-px bg-gray-700 flex-grow"></div>
              <div class="px-3 text-xs text-gray-500">{{ formatTimestamp(message.timestamp) }}</div>
              <div class="h-px bg-gray-700 flex-grow"></div>
            </div>
            
            <div class="message-container rounded-md p-2" 
                 :class="message.role === 'assistant' ? 'bg-gray-900/50 border-l-2 border-green-500' : 'bg-gray-900/30'">
              <div class="text-xs text-gray-500 mb-1 flex items-center justify-between">
                <div class="flex items-center">
                  <span class="inline-block w-2 h-2 rounded-full mr-2" 
                        :class="message.role === 'assistant' ? 'bg-green-500' : 'bg-blue-500'"></span>
                  {{ message.role === 'user' ? '> user@bashnota' : '> ai@bashnota' }}:~$
                </div>
                <div class="flex items-center space-x-2">
                  <div class="text-xs text-gray-600">{{ formatTimestamp(message.timestamp) }}</div>
                  <!-- Add action buttons for assistant messages -->
                  <div v-if="message.role === 'assistant'" class="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      class="text-xs h-6 text-gray-400 hover:text-white hover:bg-gray-700 px-1.5 rounded transition-colors"
                      @click="copyMessageToClipboard(message.content)"
                      title="Copy response"
                    >
                      <CopyIcon class="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      class="text-xs h-6 text-gray-400 hover:text-white hover:bg-gray-700 px-1.5 rounded transition-colors"
                      @click="insertMessageToDocument(message.content)"
                      title="Insert response"
                    >
                      <ScissorsIcon class="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <div 
                class="whitespace-pre-wrap pl-4 text-sm leading-relaxed" 
                :class="message.role === 'assistant' ? 'text-green-300 selectable-text' : 'text-gray-100'"
                @mouseup="message.role === 'assistant' ? handleTextSelection(message.content) : null"
                @mousedown="message.role === 'assistant' ? selectedText = '' : null"
              >
                {{ message.content }}
              </div>
            </div>
          </template>
        </div>
        
        <!-- Loading Indicator -->
        <div v-if="node.attrs.isLoading" class="text-yellow-300 text-sm p-2 bg-yellow-900/20 rounded-md border border-yellow-800/50 flex items-center">
          <LoaderIcon class="animate-spin h-4 w-4 mr-2" />
          <span>Processing request...</span>
        </div>
        
        <!-- Error Message -->
        <div v-if="node.attrs.error" class="text-red-300 text-sm mb-3 p-2 bg-red-900/20 rounded-md border border-red-800/50">
          <div class="flex items-center">
            <XIcon class="h-4 w-4 mr-2 text-red-400" />
            Error: {{ node.attrs.error }}
          </div>
          <div class="mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              class="text-xs bg-transparent border-red-500 text-red-300 hover:bg-red-900/30 transition-colors"
              @click="regenerateText"
            >
              <RefreshCwIcon class="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        </div>
        
        <!-- Prompt Input -->
        <div v-if="isExpanded" class="mt-3 bg-gray-900/50 p-3 rounded-md border border-gray-800">
          <div class="text-xs text-gray-400 mb-1.5 flex items-center">
            <span class="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
            > user@bashnota:~$ <span class="text-white ml-1">prompt</span>
          </div>
          <Textarea
            v-model="promptInput"
            placeholder="Enter your prompt here..."
            class="resize-none min-h-[100px] w-full bg-black/50 border-gray-700 text-white font-mono text-sm rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
            :disabled="node.attrs.isLoading"
            @keydown.ctrl.enter.prevent="generateText"
            @keydown.up.prevent="navigateHistory('up')"
            @keydown.down.prevent="navigateHistory('down')"
          />
          <div class="flex justify-between items-center mt-2 text-xs text-gray-400">
            <span>{{ promptTokenCount }} tokens (approx)</span>
            <Button 
              size="sm" 
              class="bg-emerald-500 hover:bg-emerald-400 text-white text-xs px-3 py-1 rounded-md transition-colors shadow-sm"
              @click="generateText" 
              :disabled="isPromptEmpty"
            >
              <LoaderIcon v-if="node.attrs.isLoading" class="mr-1.5 h-3.5 w-3.5 animate-spin" />
              <SparklesIcon v-else class="mr-1.5 h-3.5 w-3.5" />
              Execute
            </Button>
          </div>
        </div>
        
        <!-- Continue Conversation -->
        <div v-if="node.attrs.result && !isExpanded && !isEditing && isContinuing" class="mt-3 bg-gray-900/50 p-3 rounded-md border border-gray-800">
          <div class="text-xs text-gray-400 mb-1.5 flex items-center">
            <span class="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
            > user@bashnota:~$ <span class="text-white ml-1">continue</span>
          </div>
          <Textarea
            v-model="followUpPrompt"
            placeholder="Enter follow-up prompt..."
            class="resize-none min-h-[80px] w-full bg-black/50 border-gray-700 text-white font-mono text-sm rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
            :disabled="node.attrs.isLoading"
            @keydown.ctrl.enter.prevent="continueConversation"
            @keydown.up.prevent="navigateHistory('up')"
            @keydown.down.prevent="navigateHistory('down')"
          />
          <div class="flex justify-between items-center mt-2 text-xs text-gray-400">
            <span>Ctrl+Enter to send</span>
            <Button 
              size="sm" 
              class="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1 rounded-md transition-colors shadow-sm"
              @click="continueConversation" 
              :disabled="!followUpPrompt.trim() || node.attrs.isLoading"
            >
              <SendIcon class="mr-1.5 h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>
        
        <!-- Editable Result -->
        <div v-if="isEditing" class="mt-3 bg-gray-900/50 p-3 rounded-md border border-gray-800">
          <div class="text-xs text-gray-400 mb-1.5 flex items-center">
            <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
            > ai@bashnota:~$ <span class="text-white ml-1">edit</span>
          </div>
          <Textarea
            v-model="resultInput"
            class="resize-none min-h-[120px] w-full bg-black/50 border-gray-700 text-green-300 font-mono text-sm rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
            @keydown.ctrl.enter.prevent="saveEditedText"
          />
          <div class="flex justify-end space-x-2 mt-2">
            <Button 
              size="sm" 
              variant="outline"
              class="bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
              @click="toggleEditing"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              class="bg-green-600 hover:bg-green-500 text-white shadow-sm transition-colors"
              @click="saveEditedText"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
      
      <!-- Terminal Footer - Only show if not collapsed and other conditions are met -->
      <div v-if="!isCollapsed && node.attrs.result && !isExpanded && !isEditing && !isContinuing" 
           class="terminal-footer bg-gradient-to-r from-gray-900 to-gray-800 px-3 py-2 flex justify-between items-center border-t border-gray-700">
        <div class="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            class="text-xs text-gray-300 hover:text-white hover:bg-gray-700 h-7 px-2.5 py-0 rounded-md transition-colors"
            @click="regenerateText"
            :disabled="node.attrs.isLoading"
          >
            <RefreshCwIcon class="mr-1.5 h-3.5 w-3.5" />
            Regenerate
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            class="text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            @click="toggleContinuing"
          >
            <SendIcon class="mr-1.5 h-3.5 w-3.5" />
            Continue
          </Button>
        </div>
        
        <div class="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            class="text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            @click="copyToClipboard"
          >
            <CheckIcon v-if="copied" class="mr-1.5 h-3.5 w-3.5 text-green-500" />
            <CopyIcon v-else class="mr-1.5 h-3.5 w-3.5" />
            Copy
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            class="text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            @click="toggleEditing"
          >
            <EditIcon class="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            class="text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            @click="insertSelectionToDocument"
            :disabled="!selectedText"
            title="Insert selected text"
          >
            <ScissorsIcon class="mr-1.5 h-3.5 w-3.5" />
            <span :class="{'text-gray-500': !selectedText}">Selection</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            class="text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            @click="insertToDocument"
          >
            Insert
          </Button>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style>
.inline-ai-block {
  margin: 0.75rem 0;
  position: relative;
}

.terminal-container {
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.terminal-content {
  max-height: 450px;
  min-height: 120px;
  transition: all 0.2s ease;
  scrollbar-width: thin;
  scrollbar-color: rgba(74, 222, 128, 0.5) rgba(0, 0, 0, 0.2);
}

.terminal-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.terminal-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.terminal-content::-webkit-scrollbar-thumb {
  background: rgba(74, 222, 128, 0.5);
  border-radius: 4px;
}

.terminal-content::-webkit-scrollbar-thumb:hover {
  background: rgba(74, 222, 128, 0.7);
}

/* Fullscreen mode */
.inline-ai-block.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  margin: 0;
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fullscreen-container {
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  max-height: 800px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from { transform: scale(0.95); }
  to { transform: scale(1); }
}

.fullscreen-content {
  height: calc(100% - 70px);
  max-height: none;
}

/* Terminal cursor animation */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.cursor::after {
  content: '|';
  animation: blink 1s step-end infinite;
}

/* Button size xs */
.btn-xs {
  height: 1.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  font-size: 0.75rem;
}

/* Add this to your existing styles */
.selectable-text {
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.selectable-text::selection {
  background: rgba(74, 222, 128, 0.3);
  color: #ffffff;
}

/* Collapsed state */
.terminal-container.collapsed {
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.terminal-container.collapsed .terminal-header {
  border-radius: 0.5rem;
  border-bottom: none;
}

/* Message container hover effect */
.message-container {
  transition: all 0.2s ease;
}

.message-container:hover {
  background-color: rgba(31, 41, 55, 0.7);
}

/* Button transitions */
button {
  transition: all 0.15s ease;
}

button:active:not(:disabled) {
  transform: translateY(1px);
}

/* Code block styling within AI responses */
.selectable-text pre,
.selectable-text code {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 0.2em 0.4em;
  font-family: 'Courier New', monospace;
  border-left: 2px solid #4ade80;
}

.selectable-text pre {
  padding: 0.5em;
  margin: 0.5em 0;
  overflow-x: auto;
}

/* Terminal timestamp separator */
.terminal-timestamp-separator {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.terminal-timestamp-separator:hover {
  opacity: 1;
}
</style> 