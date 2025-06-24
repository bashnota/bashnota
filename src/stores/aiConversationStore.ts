// src/stores/aiConversationStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db'
import type { ConversationMessage } from '@/components/sidebars/ai-assistant/composables/useConversation'
import { logger } from '@/services/logger'

export interface AIConversation {
  id: string
  notaId: string
  blockId: string // Unique identifier for the AI block
  messages: ConversationMessage[]
  createdAt: Date
  updatedAt: Date
}

export const useAIConversationStore = defineStore('aiConversation', () => {
  const conversations = ref<AIConversation[]>([])
  const activeConversationId = ref<string | null>(null)

  const activeConversation = ref<AIConversation | null>(null)

  async function loadConversations(notaId: string) {
    try {
      const result = await db.conversations.where('notaId').equals(notaId).sortBy('createdAt')
      conversations.value = result
      return result
    } catch (error) {
      logger.error('Error loading conversations:', error)
      return []
    }
  }

  async function createConversation(notaId: string, blockId: string): Promise<AIConversation> {
    const newConversation: AIConversation = {
      id: crypto.randomUUID(),
      notaId,
      blockId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.conversations.add(newConversation)
    await loadConversations(notaId)
    setActiveConversation(newConversation.id)
    return newConversation
  }

  async function addMessage(conversationId: string, message: ConversationMessage) {
    const conversation = await db.conversations.get(conversationId)
    if (conversation) {
      conversation.messages.push(message)
      conversation.updatedAt = new Date()
      await db.conversations.put(conversation)
      if (activeConversation.value?.id === conversationId) {
        activeConversation.value = conversation
      }
    }
  }

  async function setActiveConversation(conversationId: string | null) {
    if (conversationId) {
      const conversation = await db.conversations.get(conversationId)
      activeConversation.value = conversation || null
    } else {
      activeConversation.value = null
    }
    activeConversationId.value = conversationId
  }

  async function deleteConversation(conversationId: string) {
    await db.conversations.delete(conversationId)
    if (activeConversationId.value === conversationId) {
      activeConversationId.value = null
      activeConversation.value = null
    }
    const index = conversations.value.findIndex(c => c.id === conversationId)
    if (index !== -1) {
      conversations.value.splice(index, 1)
    }
  }

  async function getConversationByBlockId(blockId: string): Promise<AIConversation | null> {
    try {
      const conversation = await db.conversations.where('blockId').equals(blockId).first()
      return conversation || null
    } catch (error) {
      logger.error('Error getting conversation by blockId:', error)
      return null
    }
  }

  async function createOrGetConversation(notaId: string, blockId: string): Promise<AIConversation> {
    // Try to get existing conversation first
    const existing = await getConversationByBlockId(blockId)
    if (existing) {
      return existing
    }
    
    // Create new conversation if none exists
    return await createConversation(notaId, blockId)
  }

  async function updateConversation(conversationId: string, messages: ConversationMessage[]) {
    try {
      const conversation = await db.conversations.get(conversationId)
      if (conversation) {
        conversation.messages = messages
        conversation.updatedAt = new Date()
        await db.conversations.put(conversation)
        
        // Update local state if this is the active conversation
        if (activeConversation.value?.id === conversationId) {
          activeConversation.value = conversation
        }
      }
    } catch (error) {
      logger.error('Error updating conversation:', error)
    }
  }

  return {
    conversations,
    activeConversation,
    activeConversationId,
    loadConversations,
    createConversation,
    createOrGetConversation,
    addMessage,
    setActiveConversation,
    deleteConversation,
    getConversationByBlockId,
    updateConversation,
  }
}) 