import { nextTick } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { logger } from '@/services/logger'
import { toast } from '@/components/ui/toast'
import { type AIBlock, type ConversationMessage } from './useConversation'

export function useAIGeneration(editor: any) {
  // Generate text function
  const generateText = async (activeAIBlock: AIBlock, promptInput: string, conversationHistory: ConversationMessage[], generateUniqueId: () => string) => {
    if (!activeAIBlock || !promptInput.trim()) return
    
    try {
      // Get the node position before setting loading state
      const pos = activeAIBlock.getPos()
      
      // Reset conversation history
      const newHistory = [
        { role: 'user', content: promptInput, timestamp: new Date(), id: generateUniqueId() }
      ]
      
      // Update block attributes
      activeAIBlock.updateAttributes({
        prompt: promptInput,
        isLoading: true,
        error: ''
      })
      
      // Give the DOM time to update and ensure transaction is applied
      return await nextTick(() => {
        try {
          if (pos !== undefined && typeof pos === 'number') {
            // Use a simple focus + command chain with the stored position
            editor.chain().focus().command(({ commands }: { commands: any }) => {
              return commands.generateInlineAI(pos, promptInput)
            }).run()
            return newHistory
          } else {
            logger.error('Invalid node position')
            activeAIBlock.updateAttributes({
              isLoading: false,
              error: 'Failed to determine node position. Please try again.'
            })
            toast({
              title: 'Generation Failed',
              description: 'Unable to determine the proper position in the document.',
              variant: 'destructive'
            })
            return null
          }
        } catch (error) {
          logger.error('Error generating text:', error)
          activeAIBlock.updateAttributes({
            isLoading: false,
            error: 'Failed to generate text. Please try again.'
          })
          toast({
            title: 'Generation Failed',
            description: 'An error occurred while generating text.',
            variant: 'destructive'
          })
          return null
        }
      })
    } catch (error) {
      logger.error('Error in generateText:', error)
      toast({
        title: 'Error',
        description: 'Failed to update AI generation settings',
        variant: 'destructive'
      })
      return null
    }
  }

  // Continue conversation function
  const continueConversation = async (activeAIBlock: AIBlock, followUpPrompt: string, conversationHistory: ConversationMessage[], generateUniqueId: () => string) => {
    if (!activeAIBlock || !followUpPrompt.trim() || activeAIBlock.node.attrs.isLoading) return null
    
    try {
      // Get position before making changes
      const pos = activeAIBlock.getPos()
      
      // Add user message to conversation history
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: followUpPrompt, timestamp: new Date(), id: generateUniqueId() }
      ]
      
      // Create a full conversation context for the AI
      const fullPrompt = newHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n') + '\n\nAssistant:'
      
      // Set loading state
      activeAIBlock.updateAttributes({
        isLoading: true,
        error: ''
      })
      
      // Generate the continuation after state updates are applied
      return await nextTick(() => {
        try {
          if (pos !== undefined && typeof pos === 'number') {
            // Use a command chain with the stored position
            editor.chain().focus().command(({ commands }: { commands: any }) => {
              return commands.generateInlineAI(pos, fullPrompt, true)
            }).run()
            return newHistory
          } else {
            logger.error('Invalid node position')
            activeAIBlock.updateAttributes({
              isLoading: false,
              error: 'Failed to determine node position. Please try again.'
            })
            return null
          }
        } catch (error) {
          logger.error('Error continuing conversation:', error)
          activeAIBlock.updateAttributes({
            isLoading: false,
            error: 'Failed to continue conversation. Please try again.'
          })
          return null
        }
      })
    } catch (error) {
      logger.error('Error in continueConversation:', error)
      toast({
        title: 'Error',
        description: 'Failed to continue conversation',
        variant: 'destructive'
      })
      return null
    }
  }

  // Regenerate text
  const regenerateText = async (activeAIBlock: AIBlock, conversationHistory: ConversationMessage[]) => {
    if (!activeAIBlock || activeAIBlock.node.attrs.isLoading) return null
    
    try {
      // Get the position before updating any state
      const pos = activeAIBlock.getPos()
      
      // Remove last assistant message from history if it exists
      let newHistory = [...conversationHistory]
      if (newHistory.length > 0) {
        const lastMessage = newHistory[newHistory.length - 1]
        if (lastMessage.role === 'assistant') {
          newHistory.pop()
        }
      }
      
      // Create prompt from conversation history
      let prompt = ''
      if (newHistory.length > 0) {
        prompt = newHistory
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n') + '\n\nAssistant:'
      } else {
        prompt = activeAIBlock.node.attrs.prompt
      }
      
      // Set block to loading state
      activeAIBlock.updateAttributes({
        isLoading: true,
        error: ''
      })
      
      // Generate the response after state updates have been applied
      return await nextTick(() => {
        try {
          if (pos !== undefined && typeof pos === 'number') {
            // Use a command chain with the stored position
            editor.chain().focus().command(({ commands }: { commands: any }) => {
              return commands.generateInlineAI(pos, prompt, true)
            }).run()
            return newHistory
          } else {
            logger.error('Invalid node position')
            activeAIBlock.updateAttributes({
              isLoading: false,
              error: 'Failed to determine node position. Please try again.'
            })
            return null
          }
        } catch (error) {
          logger.error('Error regenerating text:', error)
          activeAIBlock.updateAttributes({
            isLoading: false,
            error: 'Failed to regenerate text. Please try again.'
          })
          return null
        }
      })
    } catch (error) {
      logger.error('Error in regenerateText:', error)
      toast({
        title: 'Error',
        description: 'Failed to regenerate text',
        variant: 'destructive'
      })
      return null
    }
  }

  // Remove the block from the document
  const removeBlock = (activeAIBlock: AIBlock) => {
    if (!activeAIBlock) return false
    
    try {
      editor.commands.deleteNode('inlineAIGeneration')
      
      toast({
        title: 'Removed',
        description: 'AI block removed from document',
        variant: 'default'
      })
      
      return true
    } catch (error) {
      logger.error('Failed to remove block:', error)
      toast({
        title: 'Remove Failed',
        description: 'Failed to remove AI block from document',
        variant: 'destructive'
      })
      return false
    }
  }

  return {
    generateText,
    continueConversation,
    regenerateText,
    removeBlock
  }
}