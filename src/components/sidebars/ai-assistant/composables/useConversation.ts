import { ref, computed, watch } from 'vue'
import { nanoid } from 'nanoid'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { logger } from '@/services/logger'

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
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
  
  // State management
  const activeAIBlock = ref<AIBlock | null>(null)
  const promptInput = ref('')
  const followUpPrompt = ref('')
  const resultInput = ref('')
  const isContinuing = ref(false)
  const isEditing = ref(false)
  const selectedText = ref('')
  const copied = ref(false)
  const conversationHistory = ref<ConversationMessage[]>([])
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
  const loadConversationFromBlock = (block: AIBlock) => {
    if (!block) return
    
    // Create a logger for debugging this function
    const convLogger = logger.createPrefixedLogger('useConversation');
    convLogger.debug('Loading conversation from block:', block.node.attrs);
    
    // Set active block
    activeAIBlock.value = block
    
    // Reset state
    promptInput.value = block.node.attrs.prompt || ''
    followUpPrompt.value = ''
    resultInput.value = block.node.attrs.result || ''
    isEditing.value = false
    isContinuing.value = false
    
    // Load conversation history from block
    if (block.node.attrs.conversation && Array.isArray(block.node.attrs.conversation) && block.node.attrs.conversation.length > 0) {
      // Convert ISO strings back to Date objects
      convLogger.debug('Block has stored conversation history, length:', block.node.attrs.conversation.length);
      const processedHistory = block.node.attrs.conversation.map((msg: any) => {
        const processedMsg = {
          ...msg,
          id: msg.id || `${msg.role}-${Date.now()}`,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
        };
        convLogger.debug('Processed message:', processedMsg);
        return processedMsg;
      });
      conversationHistory.value = processedHistory;
      convLogger.info('Loaded conversation history from block.node.attrs.conversation, message count:', conversationHistory.value.length);
    } else if (block.node.attrs.prompt) {
      // Create a basic conversation if only prompt exists
      convLogger.debug('No stored conversation history, creating from prompt/result');
      conversationHistory.value = [
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: block.node.attrs.prompt,
          timestamp: block.node.attrs.lastUpdated ? new Date(block.node.attrs.lastUpdated) : new Date()
        }
      ]
      
      // Add assistant message if result exists
      if (block.node.attrs.result) {
        conversationHistory.value.push({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: block.node.attrs.result,
          timestamp: block.node.attrs.lastUpdated ? new Date(block.node.attrs.lastUpdated) : new Date()
        })
      }
      
      convLogger.info('Created conversation history from prompt/result, message count:', conversationHistory.value.length);
    } else {
      // No conversation history or prompt
      convLogger.warn('No conversation history or prompt found in block');
      conversationHistory.value = [];
    }
    
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
    conversationHistory.value = []
    isLoading.value = false
  }
  
  // Create a new AI session
  const createNewSession = () => {
    // First check if editor is available
    if (!editor) {
      console.error('Editor not available')
      return
    }
    
    try {
      // Instead of inserting "/gen " as text, directly use the command to insert an AI block
      editor.chain()
        .focus()
        .insertInlineAIGeneration() // This directly calls the extension's command
        .run()
      
      // Find the newly created block
      const { state } = editor
      const { doc } = state
      let newBlock = null
      
      doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'inlineAIGeneration' && !node.attrs.prompt) {
          // This is likely our new node
          newBlock = {
            node,
            type: node.type.name,
            pos
          }
          return false // Stop traversal
        }
        return true // Continue traversal
      })
      
      if (newBlock) {
        // Load the new block
        loadConversationFromBlock(newBlock)
      }
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
  const saveEditedText = () => {
    if (!activeAIBlock.value || !isEditing.value) return
    
    try {
      // Update the block with edited result
      editor.commands.updateAttributes('aiGeneration', {
        result: resultInput.value,
        lastUpdated: new Date().toISOString()
      })
      
      // Update conversation history
      if (conversationHistory.value.length > 0) {
        const lastMessage = conversationHistory.value[conversationHistory.value.length - 1]
        if (lastMessage.role === 'assistant') {
          lastMessage.content = resultInput.value
          lastMessage.timestamp = new Date()
        }
        
        // Update block with new conversation history
        editor.commands.updateAttributes('aiGeneration', {
          conversation: conversationHistory.value.map(msg => ({
            ...msg,
            timestamp: msg.timestamp?.toISOString()
          }))
        })
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
    conversationHistory,
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
    saveEditedText
  }
}