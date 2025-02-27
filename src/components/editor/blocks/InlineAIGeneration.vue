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
const conversationHistory = ref<{ role: 'user' | 'assistant', content: string }[]>([
  { role: 'user', content: props.node.attrs.prompt || '' },
  { role: 'assistant', content: props.node.attrs.result || '' }
])
// Terminal-style history navigation
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)

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

const generateText = () => {
  if (!promptInput.value.trim()) return
  
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
      { role: 'user', content: promptInput.value }
    ]
    
    // Use a setTimeout to ensure the attribute update has been processed
    setTimeout(() => {
      // Call the generate command
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
      { role: 'user', content: followUpPrompt.value }
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
      conversationHistory.value[lastIndex].content = resultInput.value
    } else {
      conversationHistory.value.push({ role: 'assistant', content: resultInput.value })
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
  props.editor.commands.deleteNode(props.node.type.name)
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

const handleTextSelection = () => {
  // Use setTimeout to ensure the selection is complete
  setTimeout(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      selectedText.value = selection.toString()
      
      // Optional: Add visual feedback for debugging
      console.log('Selected text:', selectedText.value)
      
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
    // Find the last assistant message or add a new one
    const lastAssistantIndex = conversationHistory.value.findIndex(msg => msg.role === 'assistant')
    if (lastAssistantIndex !== -1) {
      conversationHistory.value[lastAssistantIndex].content = newResult
    } else {
      conversationHistory.value.push({ role: 'assistant', content: newResult })
    }
  }
}, { immediate: true })

// Set up keyboard shortcuts
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <NodeViewWrapper class="inline-ai-block" :class="{ 'fullscreen': isFullscreen }">
    <div class="terminal-container border rounded-md overflow-hidden shadow-sm" 
      :class="{ 
        'fullscreen-container': isFullscreen,
        'collapsed': isCollapsed 
      }">
      <!-- Terminal Header -->
      <div class="terminal-header flex justify-between items-center px-2 py-1 bg-black text-white">
        <div class="flex items-center">
          <TerminalIcon class="h-3.5 w-3.5 mr-1.5" />
          <span class="text-xs font-mono">{{ selectedProvider?.name || 'AI' }} Terminal</span>
        </div>
        <div class="flex space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-5 w-5 text-white hover:bg-gray-700" 
            @click="toggleCollapsed"
            title="Toggle collapse"
          >
            <ChevronUpIcon v-if="!isCollapsed" class="h-3 w-3" />
            <ChevronDownIcon v-else class="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-5 w-5 text-white hover:bg-gray-700" 
            @click="toggleFullscreen"
            title="Toggle fullscreen"
          >
            <MaximizeIcon v-if="!isFullscreen" class="h-3 w-3" />
            <MinimizeIcon v-else class="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-5 w-5 text-white hover:bg-gray-700" 
            @click="removeBlock"
            title="Close terminal"
          >
            <XIcon class="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <!-- Terminal Content - Only show if not collapsed -->
      <div v-if="!isCollapsed" class="terminal-content bg-black text-green-400 font-mono p-2 overflow-auto" :class="{ 'fullscreen-content': isFullscreen }">
        <!-- Conversation History -->
        <div v-if="conversationHistory.length > 0" class="mb-2">
          <div v-for="(message, index) in conversationHistory" :key="index" class="mb-2">
            <div class="text-xs text-gray-500 mb-0.5">
              {{ message.role === 'user' ? '> user@bashnota' : '> ai@bashnota' }}:~$
            </div>
            <div 
              class="whitespace-pre-wrap pl-2 text-sm" 
              :class="message.role === 'assistant' ? 'text-green-400 selectable-text' : 'text-white'"
              @mouseup="message.role === 'assistant' ? handleTextSelection() : null"
              @mousedown="message.role === 'assistant' ? selectedText = '' : null"
            >
              {{ message.content }}
            </div>
          </div>
        </div>
        
        <!-- Loading Indicator -->
        <div v-if="node.attrs.isLoading" class="text-yellow-400 text-sm">
          <span class="animate-pulse">Processing request...</span>
        </div>
        
        <!-- Error Message -->
        <div v-if="node.attrs.error" class="text-red-400 text-sm mb-2">
          <div>Error: {{ node.attrs.error }}</div>
          <div class="mt-1">
            <Button 
              variant="outline" 
              size="sm" 
              class="text-xs bg-transparent border-red-500 text-red-400 hover:bg-red-900/20"
              @click="regenerateText"
            >
              <RefreshCwIcon class="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        </div>
        
        <!-- Prompt Input -->
        <div v-if="isExpanded" class="mt-2">
          <div class="text-xs text-gray-500 mb-1">
            > user@bashnota:~$ <span class="text-white">prompt</span>
          </div>
          <Textarea
            v-model="promptInput"
            placeholder="Enter your prompt here..."
            class="resize-none min-h-[80px] w-full bg-black border-gray-700 text-white font-mono text-sm"
            :disabled="node.attrs.isLoading"
            @keydown.ctrl.enter.prevent="generateText"
            @keydown.up.prevent="navigateHistory('up')"
            @keydown.down.prevent="navigateHistory('down')"
          />
          <div class="flex justify-between items-center mt-1 text-xs text-gray-500">
            <span>{{ promptTokenCount }} tokens</span>
            <Button 
              size="sm" 
              class="bg-green-700 hover:bg-green-600 text-white text-xs"
              @click="generateText" 
              :disabled="!promptInput.trim() || node.attrs.isLoading"
            >
              <LoaderIcon v-if="node.attrs.isLoading" class="mr-1 h-3 w-3 animate-spin" />
              <SparklesIcon v-else class="mr-1 h-3 w-3" />
              Execute
            </Button>
          </div>
        </div>
        
        <!-- Continue Conversation -->
        <div v-if="node.attrs.result && !isExpanded && !isEditing && isContinuing" class="mt-2">
          <div class="text-xs text-gray-500 mb-1">
            > user@bashnota:~$ <span class="text-white">continue</span>
          </div>
          <Textarea
            v-model="followUpPrompt"
            placeholder="Enter follow-up prompt..."
            class="resize-none min-h-[60px] w-full bg-black border-gray-700 text-white font-mono text-sm"
            :disabled="node.attrs.isLoading"
            @keydown.ctrl.enter.prevent="continueConversation"
            @keydown.up.prevent="navigateHistory('up')"
            @keydown.down.prevent="navigateHistory('down')"
          />
          <div class="flex justify-between items-center mt-1 text-xs text-gray-500">
            <span>Ctrl+Enter to send</span>
            <Button 
              size="sm" 
              class="bg-green-700 hover:bg-green-600 text-white text-xs"
              @click="continueConversation" 
              :disabled="!followUpPrompt.trim() || node.attrs.isLoading"
            >
              <SendIcon class="mr-1 h-3 w-3" />
              Send
            </Button>
          </div>
        </div>
        
        <!-- Editable Result -->
        <div v-if="isEditing" class="mt-2">
          <div class="text-xs text-gray-500 mb-1">
            > ai@bashnota:~$ <span class="text-white">edit</span>
          </div>
          <Textarea
            v-model="resultInput"
            class="resize-none min-h-[100px] w-full bg-black border-gray-700 text-white font-mono text-sm"
            @keydown.ctrl.enter.prevent="saveEditedText"
          />
          <div class="flex justify-end space-x-2 mt-1">
            <Button 
              size="sm" 
              variant="outline"
              class="bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800"
              @click="toggleEditing"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              class="bg-green-700 hover:bg-green-600 text-white"
              @click="saveEditedText"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
      
      <!-- Terminal Footer - Only show if not collapsed and other conditions are met -->
      <div v-if="!isCollapsed && node.attrs.result && !isExpanded && !isEditing && !isContinuing" class="terminal-footer bg-gray-900 px-2 py-1 flex justify-between items-center">
        <div class="flex space-x-1">
          <Button 
            variant="ghost" 
            size="sm"
            class="text-xs text-gray-400 hover:text-white hover:bg-gray-800 h-6 px-2 py-0"
            @click="regenerateText"
            :disabled="node.attrs.isLoading"
          >
            <RefreshCwIcon class="mr-1 h-3 w-3" />
            Regenerate
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            class="text-xs text-gray-400 hover:text-white hover:bg-gray-800"
            @click="toggleContinuing"
          >
            Continue
          </Button>
        </div>
        
        <div class="flex space-x-1">
          <Button 
            variant="ghost" 
            size="sm" 
            class="text-xs text-gray-400 hover:text-white hover:bg-gray-800"
            @click="copyToClipboard"
          >
            <CheckIcon v-if="copied" class="mr-1 h-3 w-3 text-green-500" />
            <CopyIcon v-else class="mr-1 h-3 w-3" />
            Copy
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            class="text-xs text-gray-400 hover:text-white hover:bg-gray-800"
            @click="toggleEditing"
          >
            <EditIcon class="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            class="text-xs text-gray-400 hover:text-white hover:bg-gray-800"
            @click="insertSelectionToDocument"
            :disabled="!selectedText"
            title="Insert selected text"
          >
            <ScissorsIcon class="mr-1 h-3 w-3" />
            Insert Selection
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            class="text-xs text-gray-400 hover:text-white hover:bg-gray-800"
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
  margin: 0.5rem 0;
  position: relative;
}

.terminal-container {
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
}

.terminal-content {
  max-height: 400px;
  min-height: 100px;
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
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.fullscreen-container {
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  max-height: 800px;
}

.fullscreen-content {
  height: calc(100% - 60px);
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
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

/* Collapsed state */
.terminal-container.collapsed {
  border-radius: 0.375rem;
}

.terminal-container.collapsed .terminal-header {
  border-radius: 0.375rem;
}

/* Add a subtle indicator when collapsed */
.terminal-container.collapsed .terminal-header {
  border-bottom: none;
}
</style> 