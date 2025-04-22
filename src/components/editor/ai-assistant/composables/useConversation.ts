import { ref, computed, watch } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { logger } from '@/services/logger'
import { toast } from '@/components/ui/toast'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  id?: string
}

export interface AIBlock {
  node: {
    attrs: {
      id: string
      prompt: string
      result: string
      isLoading: boolean
      error: string
    }
  }
  updateAttributes: (attrs: any) => void
  getPos: () => number | undefined
  conversationHistory?: ConversationMessage[]
}

export function useConversation(editor: any, notaId: string) {
  // Store for managing active AI blocks
  const activeAIBlock = ref<AIBlock | null>(null)
  const activeBlockId = ref<string | null>(null)
  const promptInput = ref('')
  const followUpPrompt = ref('')
  const isContinuing = ref(false)
  const isEditing = ref(false)
  const resultInput = ref('')
  const selectedText = ref('')
  const copied = ref(false)

  // Conversation history
  const conversationHistory = ref<ConversationMessage[]>([])

  // Nota store for accessing notas
  const notaStore = useNotaStore()

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

  // Generate a unique ID for each message
  function generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

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

  // Load conversation from AI block
  function loadConversationFromBlock(block: AIBlock) {
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

  // Clear active block
  const clearActiveBlock = () => {
    activeAIBlock.value = null
    activeBlockId.value = null
    promptInput.value = ''
    followUpPrompt.value = ''
    resultInput.value = ''
    isContinuing.value = false
    isEditing.value = false
    selectedText.value = ''
    conversationHistory.value = []
    return null
  }

  // Create a new AI session directly from the sidebar
  const createNewSession = () => {
    if (!editor) return null
    
    try {
      // Create a new inline AI generation block
      editor.chain().focus().insertInlineAIGeneration().run()
      
      // Clear any existing active block
      clearActiveBlock()
      
      // Create a temporary block to initialize the UI, which will be updated when the actual block node is available
      const tempBlock = {
        node: {
          attrs: {
            id: generateUniqueId(),
            prompt: '',
            result: '',
            isLoading: false,
            error: ''
          }
        },
        updateAttributes: (attrs: any) => {
          // This will be replaced once the actual block node is activated
          Object.assign(tempBlock.node.attrs, attrs)
        },
        getPos: () => 0 // This will be updated when the actual node position is available
      }
      
      // Set this as the active block
      activeAIBlock.value = tempBlock as AIBlock
      activeBlockId.value = tempBlock.node.attrs.id
      
      // Show success message
      toast({
        title: 'New AI Session Created',
        description: 'Start typing your prompt to generate content'
      })
      
      return tempBlock
    } catch (error) {
      logger.error('Failed to create new AI session:', error)
      toast({
        title: 'Failed to Create Session',
        description: 'Could not create a new AI session',
        variant: 'destructive'
      })
      return null
    }
  }

  // Toggle continuing mode
  const toggleContinuing = () => {
    isContinuing.value = !isContinuing.value
  }

  // Toggle editing mode
  const toggleEditing = () => {
    if (isEditing.value) {
      isEditing.value = false
      return
    }
    
    const result = activeAIBlock.value?.node.attrs.result
    if (result) {
      resultInput.value = result
      isEditing.value = true
    }
  }

  // Save edited text
  const saveEditedText = () => {
    if (!activeAIBlock.value || !resultInput.value.trim()) return
    
    // Update the block attributes
    activeAIBlock.value.updateAttributes({
      result: resultInput.value
    })
    
    // Update conversation history
    if (conversationHistory.value.length > 0) {
      const lastMessageIndex = conversationHistory.value.findIndex(msg => msg.role === 'assistant')
      if (lastMessageIndex !== -1) {
        conversationHistory.value[lastMessageIndex].content = resultInput.value
      } else {
        conversationHistory.value.push({
          role: 'assistant',
          content: resultInput.value,
          timestamp: new Date(),
          id: generateUniqueId()
        })
      }
    }
    
    // Exit editing mode
    isEditing.value = false
  }

  // Watch for changes in the active AI block's result
  watch(
    () => activeAIBlock.value?.node.attrs.result,
    (newResult) => {
      if (activeAIBlock.value && newResult && !isLoading.value) {
        // Check if we already have this result in the conversation
        const resultExists = conversationHistory.value.some(
          message => message.role === 'assistant' && message.content === newResult
        )

        // Only add if it doesn't already exist in the conversation
        if (!resultExists) {
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

  return {
    activeAIBlock,
    activeBlockId,
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
    generateUniqueId,
    formatTimestamp,
    loadConversationFromBlock,
    clearActiveBlock,
    createNewSession,
    toggleContinuing,
    toggleEditing,
    saveEditedText
  }
}