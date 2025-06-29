/**
 * AI Conversation Service
 * 
 * A service layer that abstracts conversation management operations.
 * This service provides a clean interface for managing AI conversations
 * and separates business logic from UI components.
 */

import { useAIConversationStore } from '@/features/ai/stores/aiConversationStore'
import type { ConversationMessage } from '@/features/ai/components/composables/useConversation'
import type { AIConversation } from '@/features/ai/stores/aiConversationStore'
import { logger } from '@/services/logger'

export interface ConversationServiceOptions {
  notaId: string
  blockId: string
}

export class AIConversationService {
  private conversationStore = useAIConversationStore()
  private logger = logger.createPrefixedLogger('AIConversationService')

  /**
   * Get or create a conversation for a specific AI block
   */
  async getOrCreateConversation(options: ConversationServiceOptions): Promise<AIConversation> {
    try {
      this.logger.debug('Getting or creating conversation', options)
      const conversation = await this.conversationStore.createOrGetConversation(
        options.notaId,
        options.blockId
      )
      this.logger.debug('Conversation retrieved/created', { conversationId: conversation.id })
      return conversation
    } catch (error) {
      this.logger.error('Error getting or creating conversation:', error)
      throw new Error('Failed to get or create conversation')
    }
  }

  /**
   * Load conversation history for an AI block
   */
  async loadConversationHistory(blockId: string): Promise<ConversationMessage[]> {
    try {
      this.logger.debug('Loading conversation history for block', { blockId })
      const conversation = await this.conversationStore.getConversationByBlockId(blockId)
      
      if (!conversation) {
        this.logger.debug('No conversation found for block', { blockId })
        return []
      }

      this.logger.debug('Conversation history loaded', { 
        conversationId: conversation.id, 
        messageCount: conversation.messages.length 
      })
      return conversation.messages
    } catch (error) {
      this.logger.error('Error loading conversation history:', error)
      return []
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(blockId: string, message: ConversationMessage): Promise<void> {
    try {
      this.logger.debug('Adding message to conversation', { blockId, messageRole: message.role })
      const conversation = await this.conversationStore.getConversationByBlockId(blockId)
      
      if (!conversation) {
        throw new Error(`No conversation found for block ${blockId}`)
      }

      await this.conversationStore.addMessage(conversation.id, message)
      this.logger.debug('Message added to conversation', { 
        conversationId: conversation.id, 
        messageId: message.id 
      })
    } catch (error) {
      this.logger.error('Error adding message to conversation:', error)
      throw new Error('Failed to add message to conversation')
    }
  }

  /**
   * Update the entire conversation history
   */
  async updateConversationHistory(blockId: string, messages: ConversationMessage[]): Promise<void> {
    try {
      this.logger.debug('Updating conversation history', { blockId, messageCount: messages.length })
      const conversation = await this.conversationStore.getConversationByBlockId(blockId)
      
      if (!conversation) {
        throw new Error(`No conversation found for block ${blockId}`)
      }

      await this.conversationStore.updateConversation(conversation.id, messages)
      this.logger.debug('Conversation history updated', { conversationId: conversation.id })
    } catch (error) {
      this.logger.error('Error updating conversation history:', error)
      throw new Error('Failed to update conversation history')
    }
  }

  /**
   * Delete a conversation by block ID
   */
  async deleteConversationByBlockId(blockId: string): Promise<void> {
    try {
      this.logger.debug('Deleting conversation for block', { blockId })
      const conversation = await this.conversationStore.getConversationByBlockId(blockId)
      
      if (!conversation) {
        this.logger.debug('No conversation found to delete', { blockId })
        return
      }

      await this.conversationStore.deleteConversation(conversation.id)
      this.logger.debug('Conversation deleted', { conversationId: conversation.id })
    } catch (error) {
      this.logger.error('Error deleting conversation:', error)
      throw new Error('Failed to delete conversation')
    }
  }

  /**
   * Get conversation metadata (without full message history)
   */
  async getConversationMetadata(blockId: string): Promise<Pick<AIConversation, 'id' | 'createdAt' | 'updatedAt'> | null> {
    try {
      const conversation = await this.conversationStore.getConversationByBlockId(blockId)
      
      if (!conversation) {
        return null
      }

      return {
        id: conversation.id,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    } catch (error) {
      this.logger.error('Error getting conversation metadata:', error)
      return null
    }
  }

  /**
   * Check if a conversation exists for a block
   */
  async hasConversation(blockId: string): Promise<boolean> {
    try {
      const conversation = await this.conversationStore.getConversationByBlockId(blockId)
      return !!conversation
    } catch (error) {
      this.logger.error('Error checking if conversation exists:', error)
      return false
    }
  }

  /**
   * Get all conversations for a nota
   */
  async getConversationsForNota(notaId: string): Promise<AIConversation[]> {
    try {
      this.logger.debug('Loading conversations for nota', { notaId })
      const conversations = await this.conversationStore.loadConversations(notaId)
      this.logger.debug('Conversations loaded for nota', { 
        notaId, 
        conversationCount: conversations.length 
      })
      return conversations
    } catch (error) {
      this.logger.error('Error loading conversations for nota:', error)
      return []
    }
  }
}

// Export a singleton instance
export const aiConversationService = new AIConversationService() 







