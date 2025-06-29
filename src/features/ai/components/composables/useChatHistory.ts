import { ref, computed, onMounted, watch } from 'vue'
import { aiConversationService } from '@/features/ai/services/aiConversationService'
import type { AIConversation } from '@/features/ai/stores/aiConversationStore'
import type { ConversationMessage, ChatHistoryItem } from './useConversation'
import { logger } from '@/services/logger'

export function useChatHistory(notaId: string, activeBlockId?: string) {
  // State
  const conversations = ref<AIConversation[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  // Logger
  const chatHistoryLogger = logger.createPrefixedLogger('useChatHistory')

  /**
   * Load all conversations for the current nota
   */
  const loadConversations = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      chatHistoryLogger.debug('Loading conversations for nota', { notaId })
      const result = await aiConversationService.getConversationsForNota(notaId)
      conversations.value = result
      
      chatHistoryLogger.info('Conversations loaded', { 
        notaId, 
        count: result.length 
      })
    } catch (err) {
      chatHistoryLogger.error('Error loading conversations:', err)
      error.value = 'Failed to load conversation history'
      conversations.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Generate a title from the first user message
   */
  const generateTitle = (messages: ConversationMessage[]): string => {
    const firstUserMessage = messages.find(m => m.role === 'user')
    if (!firstUserMessage) return 'New Conversation'
    
    // Use first 50 characters of the first user message
    const title = firstUserMessage.content.slice(0, 50).trim()
    return title.length < firstUserMessage.content.length ? `${title}...` : title
  }

  /**
   * Generate a preview from the last assistant message
   */
  const generatePreview = (messages: ConversationMessage[]): string => {
    // Find the last assistant message
    const lastAssistantMessage = [...messages]
      .reverse()
      .find(m => m.role === 'assistant')
    
    if (!lastAssistantMessage) {
      // If no assistant message, use the last user message
      const lastUserMessage = [...messages]
        .reverse()
        .find(m => m.role === 'user')
      
      if (!lastUserMessage) return 'No messages yet'
      return `You: ${lastUserMessage.content.slice(0, 100)}${lastUserMessage.content.length > 100 ? '...' : ''}`
    }
    
    // Use last assistant message for preview
    const preview = lastAssistantMessage.content.slice(0, 100).trim()
    return preview.length < lastAssistantMessage.content.length ? `${preview}...` : preview
  }

  /**
   * Convert conversation data to chat history items
   */
  const chatHistoryItems = computed<ChatHistoryItem[]>(() => {
    return conversations.value
      .map(conversation => {
        const lastMessage = conversation.messages[conversation.messages.length - 1]
        
        return {
          id: conversation.id,
          blockId: conversation.blockId,
          title: generateTitle(conversation.messages),
          preview: generatePreview(conversation.messages),
          messageCount: conversation.messages.length,
          lastMessage,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          isActive: conversation.blockId === activeBlockId
        }
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  })

  /**
   * Filter conversations based on search query
   */
  const filteredChatHistory = computed<ChatHistoryItem[]>(() => {
    if (!searchQuery.value.trim()) {
      return chatHistoryItems.value
    }
    
    const query = searchQuery.value.toLowerCase()
    return chatHistoryItems.value.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.preview.toLowerCase().includes(query)
    )
  })

  /**
   * Get conversation by block ID
   */
  const getConversationByBlockId = (blockId: string): AIConversation | undefined => {
    return conversations.value.find(conv => conv.blockId === blockId)
  }

  /**
   * Delete a conversation
   */
  const deleteConversation = async (conversationId: string) => {
    try {
      chatHistoryLogger.debug('Deleting conversation', { conversationId })
      
      // Find the conversation to get the blockId
      const conversation = conversations.value.find(c => c.id === conversationId)
      if (!conversation) {
        throw new Error('Conversation not found')
      }
      
      await aiConversationService.deleteConversationByBlockId(conversation.blockId)
      
      // Remove from local state
      conversations.value = conversations.value.filter(c => c.id !== conversationId)
      
      chatHistoryLogger.info('Conversation deleted', { conversationId })
    } catch (err) {
      chatHistoryLogger.error('Error deleting conversation:', err)
      error.value = 'Failed to delete conversation'
      throw err
    }
  }

  /**
   * Clear search query
   */
  const clearSearch = () => {
    searchQuery.value = ''
  }

  /**
   * Refresh conversations
   */
  const refresh = async () => {
    await loadConversations()
  }

  // Computed properties for UI
  const hasConversations = computed(() => conversations.value.length > 0)
  const hasFilteredResults = computed(() => filteredChatHistory.value.length > 0)
  const activeConversation = computed(() => 
    conversations.value.find(conv => conv.blockId === activeBlockId)
  )

  // Load conversations on mount
  onMounted(() => {
    loadConversations()
  })

  // Watch for changes in activeBlockId to refresh if needed
  watch(() => activeBlockId, () => {
    // Optional: refresh conversations when active block changes
    // loadConversations()
  })

  return {
    // State
    conversations,
    isLoading,
    error,
    searchQuery,
    
    // Computed
    chatHistoryItems,
    filteredChatHistory,
    hasConversations,
    hasFilteredResults,
    activeConversation,
    
    // Methods
    loadConversations,
    getConversationByBlockId,
    deleteConversation,
    clearSearch,
    refresh
  }
} 







