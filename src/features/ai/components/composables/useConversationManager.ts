/**
 * Conversation Manager Composable
 * 
 * Manages AI conversations using the database instead of storing them in block attributes.
 * This composable provides a clean interface for loading and managing conversation history
 * while maintaining separation of concerns.
 */

import { ref, computed, watch } from 'vue'
import { nanoid } from 'nanoid'
import { aiConversationService } from '@/features/ai/services/aiConversationService'
import type { ConversationMessage } from './useConversation'
import type { AIBlock } from './useConversation'
import { logger } from '@/services/logger'

export function useConversationManager(editor: any, notaId: string) {
  // State management
  const currentConversationId = ref<string | null>(null)
  const conversationHistory = ref<ConversationMessage[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Logger for debugging
  const convLogger = logger.createPrefixedLogger('useConversationManager')

  /**
   * Generate a unique block ID for an AI block
   */
  const generateBlockId = (): string => {
    return `ai-block-${nanoid()}`
  }

  /**
   * Get block ID from block attributes or generate a new one
   */
  const getOrCreateBlockId = (block: AIBlock): string => {
    // Check if block already has an ID
    if (block.node.attrs.blockId) {
      return block.node.attrs.blockId
    }

    // Generate new ID and update block
    const blockId = generateBlockId()
    
    try {
      editor.commands.updateAttributes('aiGeneration', {
        blockId: blockId
      })
      convLogger.debug('Generated new block ID', { blockId })
      return blockId
    } catch (error) {
      convLogger.error('Error updating block with new ID:', error)
      // Return generated ID even if update fails
      return blockId
    }
  }

  /**
   * Load conversation history for a specific AI block
   */
  const loadConversationFromBlock = async (block: AIBlock): Promise<void> => {
    if (!block) {
      convLogger.warn('Attempted to load conversation from null block')
      return
    }

    try {
      isLoading.value = true
      error.value = null
      
      convLogger.debug('Loading conversation from block', { blockAttrs: block.node.attrs })
      
      // Get or create block ID
      const blockId = getOrCreateBlockId(block)
      
      // Try to load existing conversation from database
      const messages = await aiConversationService.loadConversationHistory(blockId)
      
      if (messages.length > 0) {
        // Load existing conversation
        conversationHistory.value = messages
        convLogger.info('Loaded conversation history from database', { 
          blockId, 
          messageCount: messages.length 
        })
      } else {
        // Check if block has legacy conversation data or create new conversation
        await handleLegacyConversationData(block, blockId)
      }
      
      // Get conversation metadata
      const metadata = await aiConversationService.getConversationMetadata(blockId)
      if (metadata) {
        currentConversationId.value = metadata.id
      }
      
    } catch (err) {
      convLogger.error('Error loading conversation from block:', err)
      error.value = 'Failed to load conversation history'
      conversationHistory.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Handle legacy conversation data stored in block attributes
   */
  const handleLegacyConversationData = async (block: AIBlock, blockId: string): Promise<void> => {
    const attrs = block.node.attrs
    
    // Check for legacy conversation data in block attributes
    if (attrs.conversation && Array.isArray(attrs.conversation) && attrs.conversation.length > 0) {
      convLogger.debug('Found legacy conversation data in block attributes', { 
        messageCount: attrs.conversation.length 
      })
      
      // Convert legacy data to proper format
      const legacyMessages = attrs.conversation.map((msg: any) => ({
        ...msg,
        id: msg.id || `${msg.role}-${Date.now()}`,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
      }))
      
      // Save to database
      try {
        await aiConversationService.getOrCreateConversation({
          notaId,
          blockId
        })
        
        await aiConversationService.updateConversationHistory(blockId, legacyMessages)
        conversationHistory.value = legacyMessages
        
        convLogger.info('Migrated legacy conversation data to database', { 
          blockId, 
          messageCount: legacyMessages.length 
        })
        
        // Remove legacy data from block attributes
        editor.commands.updateAttributes('aiGeneration', {
          conversation: undefined
        })
        
      } catch (error) {
        convLogger.error('Error migrating legacy conversation data:', error)
        // Fall back to using legacy data without saving to database
        conversationHistory.value = legacyMessages
      }
      
    } else if (attrs.prompt || attrs.result) {
      // Create conversation from prompt/result
      const messages: ConversationMessage[] = []
      
      if (attrs.prompt) {
        messages.push({
          id: `user-${Date.now()}`,
          role: 'user',
          content: attrs.prompt,
          timestamp: attrs.lastUpdated ? new Date(attrs.lastUpdated) : new Date()
        })
      }
      
      if (attrs.result) {
        messages.push({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: attrs.result,
          timestamp: attrs.lastUpdated ? new Date(attrs.lastUpdated) : new Date()
        })
      }
      
      if (messages.length > 0) {
        try {
          await aiConversationService.getOrCreateConversation({
            notaId,
            blockId
          })
          
          await aiConversationService.updateConversationHistory(blockId, messages)
          conversationHistory.value = messages
          
          convLogger.info('Created conversation from prompt/result', { 
            blockId, 
            messageCount: messages.length 
          })
        } catch (error) {
          convLogger.error('Error creating conversation from prompt/result:', error)
          conversationHistory.value = messages
        }
      }
    } else {
      // No existing data, start fresh
      conversationHistory.value = []
      convLogger.debug('No existing conversation data found', { blockId })
    }
  }

  /**
   * Add a message to the current conversation
   */
  const addMessage = async (blockId: string, message: ConversationMessage): Promise<void> => {
    try {
      convLogger.debug('Adding message to conversation', { 
        blockId, 
        messageRole: message.role,
        messageId: message.id 
      })
      
      // Ensure conversation exists
      await aiConversationService.getOrCreateConversation({
        notaId,
        blockId
      })
      
      // Add message to database
      await aiConversationService.addMessage(blockId, message)
      
      // Update local state
      conversationHistory.value.push(message)
      
      convLogger.debug('Message added successfully', { blockId, messageId: message.id })
    } catch (err) {
      convLogger.error('Error adding message to conversation:', err)
      error.value = 'Failed to add message to conversation'
      throw err
    }
  }

  /**
   * Update the entire conversation history
   */
  const updateConversationHistory = async (blockId: string, messages: ConversationMessage[]): Promise<void> => {
    try {
      convLogger.debug('Updating conversation history', { 
        blockId, 
        messageCount: messages.length 
      })
      
      // Ensure conversation exists
      await aiConversationService.getOrCreateConversation({
        notaId,
        blockId
      })
      
      // Update database
      await aiConversationService.updateConversationHistory(blockId, messages)
      
      // Update local state
      conversationHistory.value = [...messages]
      
      convLogger.debug('Conversation history updated successfully', { blockId })
    } catch (err) {
      convLogger.error('Error updating conversation history:', err)
      error.value = 'Failed to update conversation history'
      throw err
    }
  }

  /**
   * Clear the current conversation
   */
  const clearConversation = (): void => {
    conversationHistory.value = []
    currentConversationId.value = null
    error.value = null
    convLogger.debug('Conversation cleared')
  }

  /**
   * Delete a conversation by block ID
   */
  const deleteConversation = async (blockId: string): Promise<void> => {
    try {
      convLogger.debug('Deleting conversation', { blockId })
      
      await aiConversationService.deleteConversationByBlockId(blockId)
      
      // Clear local state if this was the active conversation
      const metadata = await aiConversationService.getConversationMetadata(blockId)
      if (!metadata) {
        clearConversation()
      }
      
      convLogger.debug('Conversation deleted successfully', { blockId })
    } catch (err) {
      convLogger.error('Error deleting conversation:', err)
      error.value = 'Failed to delete conversation'
      throw err
    }
  }

  /**
   * Get conversation statistics
   */
  const conversationStats = computed(() => ({
    messageCount: conversationHistory.value.length,
    userMessageCount: conversationHistory.value.filter(m => m.role === 'user').length,
    assistantMessageCount: conversationHistory.value.filter(m => m.role === 'assistant').length,
    hasMessages: conversationHistory.value.length > 0
  }))

  return {
    // State
    conversationHistory,
    currentConversationId,
    isLoading,
    error,
    
    // Computed
    conversationStats,
    
    // Methods
    loadConversationFromBlock,
    addMessage,
    updateConversationHistory,
    clearConversation,
    deleteConversation,
    getOrCreateBlockId,
    generateBlockId
  }
} 








