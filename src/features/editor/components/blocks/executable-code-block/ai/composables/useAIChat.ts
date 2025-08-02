import { ref, computed } from 'vue'
import { useAIActionsStore } from '@/features/editor/stores/aiActionsStore'

export interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'assistant' | 'system'
  timestamp: Date
  actionId?: string
  codeBlockIndex?: number
  isLoading?: boolean
}

export interface ChatThread {
  id: string
  actionId: string
  resultId?: string
  messages: ChatMessage[]
  isExpanded: boolean
  lastActivity: Date
}

export function useAIChat() {
  const aiActionsStore = useAIActionsStore()
  
  // State
  const chatThreads = ref<Map<string, ChatThread>>(new Map())
  const activeChatInputs = ref<Map<string, string>>(new Map())
  const loadingChats = ref<Set<string>>(new Set())
  
  // Computed
  const hasActiveChats = computed(() => chatThreads.value.size > 0)
  
  const getThreadMessages = (threadId: string): ChatMessage[] => {
    return chatThreads.value.get(threadId)?.messages || []
  }
  
  // Methods
  const createChatThread = (actionId: string, resultId?: string): string => {
    const threadId = generateThreadId(actionId, resultId)
    
    if (!chatThreads.value.has(threadId)) {
      const thread: ChatThread = {
        id: threadId,
        actionId,
        resultId,
        messages: [],
        isExpanded: false,
        lastActivity: new Date()
      }
      
      // Add system message
      const systemMessage: ChatMessage = {
        id: generateMessageId(),
        content: `Chat thread for action: ${actionId}`,
        type: 'system',
        timestamp: new Date(),
        actionId
      }
      
      thread.messages.push(systemMessage)
      chatThreads.value.set(threadId, thread)
    }
    
    return threadId
  }
  
  const sendMessage = async (
    threadId: string, 
    message: string,
    context?: {
      code: string
      language: string
      previousResult?: string
    }
  ): Promise<ChatMessage | null> => {
    if (!message.trim() || loadingChats.value.has(threadId)) {
      return null
    }
    
    const thread = chatThreads.value.get(threadId)
    if (!thread) return null
    
    loadingChats.value.add(threadId)
    
    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        content: message.trim(),
        type: 'user',
        timestamp: new Date(),
        actionId: thread.actionId
      }
      
      thread.messages.push(userMessage)
      thread.lastActivity = new Date()
      
      // Clear input
      activeChatInputs.value.set(threadId, '')
      
      // Add loading message
      const loadingMessage: ChatMessage = {
        id: generateMessageId(),
        content: 'AI is thinking...',
        type: 'assistant',
        timestamp: new Date(),
        actionId: thread.actionId,
        isLoading: true
      }
      
      thread.messages.push(loadingMessage)
      
      // Build context for AI
      const chatContext = buildChatContext(thread, context)
      
      // Send to AI
      const actionContext = {
        code: context?.code || '',
        language: context?.language || '',
        chatHistory: thread.messages.slice(0, -1).map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        currentMessage: message,
        chatContext
      }
      
      const response = await aiActionsStore.executeCustomAction('chat-followup', actionContext)
      
      // Remove loading message
      thread.messages.pop()
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        content: response,
        type: 'assistant',
        timestamp: new Date(),
        actionId: thread.actionId
      }
      
      thread.messages.push(assistantMessage)
      thread.lastActivity = new Date()
      
      return assistantMessage
      
    } catch (error) {
      console.error('Failed to send chat message:', error)
      
      // Remove loading message
      thread.messages.pop()
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        content: 'Sorry, I encountered an error. Please try again.',
        type: 'assistant',
        timestamp: new Date(),
        actionId: thread.actionId
      }
      
      thread.messages.push(errorMessage)
      return errorMessage
      
    } finally {
      loadingChats.value.delete(threadId)
    }
  }
  
  const toggleThreadExpansion = (threadId: string) => {
    const thread = chatThreads.value.get(threadId)
    if (thread) {
      thread.isExpanded = !thread.isExpanded
    }
  }
  
  const getChatInput = (threadId: string): string => {
    return activeChatInputs.value.get(threadId) || ''
  }
  
  const setChatInput = (threadId: string, value: string) => {
    activeChatInputs.value.set(threadId, value)
  }
  
  const clearChatInput = (threadId: string) => {
    activeChatInputs.value.delete(threadId)
  }
  
  const isThreadLoading = (threadId: string): boolean => {
    return loadingChats.value.has(threadId)
  }
  
  const clearThread = (threadId: string) => {
    chatThreads.value.delete(threadId)
    activeChatInputs.value.delete(threadId)
    loadingChats.value.delete(threadId)
  }
  
  const clearAllThreads = () => {
    chatThreads.value.clear()
    activeChatInputs.value.clear()
    loadingChats.value.clear()
  }
  
  const getThreadsByAction = (actionId: string): ChatThread[] => {
    return Array.from(chatThreads.value.values())
      .filter(thread => thread.actionId === actionId)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
  }
  
  const getActiveThreads = (): ChatThread[] => {
    return Array.from(chatThreads.value.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
  }
  
  // Helper functions
  function buildChatContext(thread: ChatThread, context?: { 
    code: string
    language: string
    previousResult?: string 
  }): string {
    let chatContext = `Action: ${thread.actionId}\n`
    
    if (context?.code) {
      chatContext += `\nCode (${context.language}):\n\`\`\`${context.language}\n${context.code}\n\`\`\`\n`
    }
    
    if (context?.previousResult) {
      chatContext += `\nPrevious result:\n${context.previousResult}\n`
    }
    
    // Add recent conversation history
    const recentMessages = thread.messages.slice(-6) // Last 6 messages
    if (recentMessages.length > 1) {
      chatContext += '\nRecent conversation:\n'
      recentMessages.forEach(msg => {
        if (msg.type !== 'system' && !msg.isLoading) {
          chatContext += `${msg.type === 'user' ? 'User' : 'AI'}: ${msg.content}\n`
        }
      })
    }
    
    return chatContext
  }
  
  function generateThreadId(actionId: string, resultId?: string): string {
    const base = resultId ? `${actionId}_${resultId}` : actionId
    return `thread_${base}_${Date.now()}`
  }
  
  function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  return {
    // State
    chatThreads: computed(() => chatThreads.value),
    hasActiveChats,
    
    // Methods
    createChatThread,
    sendMessage,
    toggleThreadExpansion,
    getChatInput,
    setChatInput,
    clearChatInput,
    isThreadLoading,
    clearThread,
    clearAllThreads,
    getThreadMessages,
    getThreadsByAction,
    getActiveThreads
  }
}
