import { ref, computed, watch } from 'vue'
import { nanoid } from 'nanoid'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import { logger } from '@/services/logger'
import { useConversationManager } from './useConversationManager'
import { aiConversationService } from '@/features/ai/services/aiConversationService'

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
}

export interface ChatHistoryItem {
  id: string
  blockId: string
  title: string
  preview: string
  messageCount: number
  lastMessage?: ConversationMessage
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface AIBlock {
  node: {
    attrs: {
      prompt?: string
      result?: string
      loading?: boolean
      error?: string
      lastUpdated?: string
      conversation?: ConversationMessage[]
      blockId?: string
    }
  }
  type: string
}

// Default token settings
const DEFAULT_MAX_TOKENS = 8000
const TOKEN_WARNING_THRESHOLD = 0.8 // 80% of max tokens
const MAX_INPUT_CHARS = 20000 // Maximum characters allowed in input

export function useConversation(editor: any, notaId: string) {
  // Get AI settings store for token limits
  const aiSettings = useAISettingsStore()
  
  // Initialize conversation manager
  const conversationManager = useConversationManager(editor, notaId)
  
  // State management
  const activeAIBlock = ref<AIBlock | null>(null)
  const promptInput = ref('')
  const followUpPrompt = ref('')
  const resultInput = ref('')
  const isContinuing = ref(false)
  const isEditing = ref(false)
  const selectedText = ref('')
  const copied = ref(false)
  const isLoading = ref(false)
  
  // Max tokens from settings or default
  const maxTokens = computed(() => {
    return aiSettings.settings.maxTokens || DEFAULT_MAX_TOKENS
  })
  
  // Computed properties
  const promptTokenCount = computed(() => {
    return Math.round(promptInput.value.length / 4) // Approximate token count
  })
  
  const isPromptEmpty = computed(() => {
    return !promptInput.value.trim()
  })
  
  // Token warning computed property
  const tokenWarning = computed(() => {
    // Calculate token usage based on current input
    const currentTokens = isContinuing.value 
      ? Math.round(followUpPrompt.value.length / 4) // Follow-up tokens
      : promptTokenCount.value // Initial prompt tokens
    
    // Add result tokens if we're continuing conversation
    const responseTokens = activeAIBlock.value?.node.attrs.result
      ? Math.round((activeAIBlock.value.node.attrs.result.length || 0) / 4)
      : 0
    
    // Total tokens for continuation mode
    const totalTokens = isContinuing.value 
      ? currentTokens + responseTokens
      : currentTokens
    
    // Check if we're approaching the token limit
    if (totalTokens > maxTokens.value * TOKEN_WARNING_THRESHOLD) {
      return {
        show: true,
        message: `Approaching token limit (${Math.round(totalTokens / maxTokens.value * 100)}%)`
      }
    }
    
    return { show: false, message: '' }
  })
  
  // Format timestamp for display
  const formatTimestamp = (date?: Date): string => {
    if (!date) return ''
    
    const now = new Date()
    const messageDate = new Date(date)
    
    // Same day formatting
    if (
      messageDate.getDate() === now.getDate() &&
      messageDate.getMonth() === now.getMonth() &&
      messageDate.getFullYear() === now.getFullYear()
    ) {
      return messageDate.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      })
    }
    
    // Different day formatting
    return messageDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }
  
  // Load conversation from an existing block
  const loadConversationFromBlock = async (block: AIBlock) => {
    if (!block) return
    
    // Set active block
    activeAIBlock.value = block
    
    // Reset state
    promptInput.value = block.node.attrs.prompt || ''
    followUpPrompt.value = ''
    resultInput.value = block.node.attrs.result || ''
    isEditing.value = false
    isContinuing.value = false
    
    // Load conversation history using conversation manager
    await conversationManager.loadConversationFromBlock(block)
    
    // Set loading state
    isLoading.value = !!block.node.attrs.loading
  }
  
  // Clear active block
  const clearActiveBlock = () => {
    activeAIBlock.value = null
    promptInput.value = ''
    followUpPrompt.value = ''
    resultInput.value = ''
    isContinuing.value = false
    isEditing.value = false
    conversationManager.clearConversation()
    isLoading.value = false
  }
  
    // Create a new AI session
  const createNewSession = async () => {
    try {
      // Clear any existing active block
      clearActiveBlock()
      
      // Generate a unique session ID for the sidebar-only conversation
      const sessionId = conversationManager.generateBlockId()
      
      // Create a conversation in the database for this session
      await aiConversationService.getOrCreateConversation({
        notaId,
        blockId: sessionId
      })
      
      // Create a virtual block object for the sidebar session
      const virtualBlock = {
        node: {
          attrs: {
            blockId: sessionId,
            prompt: '',
            result: '',
            loading: false,
            error: ''
          }
        },
        type: 'aiGeneration'
      }
      
      // Set the virtual block as active
      activeAIBlock.value = virtualBlock
      
      // Initialize empty conversation history
      conversationManager.conversationHistory.value = []
      
      console.log('Created new AI sidebar session with ID:', sessionId)
      
    } catch (error) {
      console.error('Error creating new AI session:', error)
    }
  }
  
  // Toggle continuing mode
  const toggleContinuing = () => {
    isContinuing.value = !isContinuing.value
    
    // Reset follow-up prompt when toggling off
    if (!isContinuing.value) {
      followUpPrompt.value = ''
    }
  }
  
  // Toggle editing mode
  const toggleEditing = () => {
    if (!activeAIBlock.value) return
    
    isEditing.value = !isEditing.value
    
    // Set result input when entering edit mode
    if (isEditing.value) {
      resultInput.value = activeAIBlock.value.node.attrs.result || ''
    }
  }
  
      // Save edited text
  const saveEditedText = async () => {
    if (!activeAIBlock.value || !isEditing.value) return
    
    try {
      // Update the block with edited result
      editor.commands.updateAttributes('aiGeneration', {
        result: resultInput.value,
        lastUpdated: new Date().toISOString()
      })
      
      // Update conversation history using conversation manager
      const currentHistory = conversationManager.conversationHistory.value
      if (currentHistory.length > 0) {
        const lastMessage = currentHistory[currentHistory.length - 1]
        if (lastMessage.role === 'assistant') {
          lastMessage.content = resultInput.value
          lastMessage.timestamp = new Date()
        }
        
        // Get block ID and update conversation in database
        const blockId = conversationManager.getOrCreateBlockId(activeAIBlock.value)
        await conversationManager.updateConversationHistory(blockId, currentHistory)
      }
      
      // Exit editing mode
      isEditing.value = false
    } catch (error) {
      console.error('Error saving edited text:', error)
    }
  }
  
  // Watch changes to active block to update UI
  watch(() => activeAIBlock.value?.node.attrs.loading, (loading) => {
    if (loading !== undefined) {
      isLoading.value = loading
    }
  })
  
  return {
    activeAIBlock,
    promptInput,
    followUpPrompt,
    resultInput,
    isContinuing,
    isEditing,
    selectedText,
    copied,
    conversationHistory: conversationManager.conversationHistory,
    promptTokenCount,
    isPromptEmpty,
    isLoading,
    tokenWarning,
    maxInputChars: MAX_INPUT_CHARS,
    formatTimestamp,
    loadConversationFromBlock,
    clearActiveBlock,
    createNewSession,
    toggleContinuing,
    toggleEditing,
    saveEditedText,
    conversationManager
  }
}







