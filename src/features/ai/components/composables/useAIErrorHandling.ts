import { ref } from 'vue'
import { logger } from '@/services/logger'
import { toast } from '@/ui/toast'
import type { ConversationMessage } from './useConversation'

// Define error types for better error handling
export type AIGenerationErrorType = 
  | 'API_KEY'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'CONTENT_POLICY'
  | 'TIMEOUT'
  | 'MODEL_UNAVAILABLE'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export interface AIGenerationError {
  type: AIGenerationErrorType;
  message: string;
  originalError?: Error;
}

export function useAIErrorHandling() {
  const errorMessage = ref('')

  /**
   * Classify error based on error message for consistent handling
   */
  const classifyError = (error: unknown): AIGenerationError => {
    // Default error
    const defaultError: AIGenerationError = {
      type: 'UNKNOWN',
      message: 'Failed to generate text. Please try again.',
      originalError: error instanceof Error ? error : undefined
    }
    
    if (!(error instanceof Error)) return defaultError
    
    const errorMessage = error.message.toLowerCase()
    
    if (errorMessage.includes('api key')) {
      return {
        type: 'API_KEY',
        message: 'Missing or invalid API key. Please check your settings.',
        originalError: error
      }
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        type: 'RATE_LIMIT',
        message: 'Rate limit exceeded. Please wait a moment and try again.',
        originalError: error
      }
    } else if (errorMessage.includes('timeout') || 
              errorMessage.includes('network') || 
              errorMessage.includes('connection')) {
      return {
        type: 'NETWORK',
        message: 'Network error or timeout. Please check your connection.',
        originalError: error
      }
    } else if (errorMessage.includes('content policy') || 
              errorMessage.includes('moderation') || 
              errorMessage.includes('safety') ||
              errorMessage.includes('harmful')) {
      return {
        type: 'CONTENT_POLICY',
        message: 'Content policy violation. Please modify your prompt and try again.',
        originalError: error
      }
    } else if (errorMessage.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        message: 'Request timed out. Please try again or use a shorter prompt.',
        originalError: error
      }
    } else if (errorMessage.includes('model') && 
              (errorMessage.includes('unavailable') || errorMessage.includes('not found'))) {
      return {
        type: 'MODEL_UNAVAILABLE',
        message: 'The selected AI model is currently unavailable. Please try another model.',
        originalError: error
      }
    } else if (errorMessage.includes('500') || errorMessage.includes('server')) {
      return {
        type: 'SERVER_ERROR',
        message: 'Server error. Please try again later.',
        originalError: error
      }
    }
    
    return defaultError
  }
  
  /**
   * Handle errors consistently across all generation functions
   */
  const handleGenerationError = (
    error: unknown,
    editor: any,
    block: any,
    conversationHistory: ConversationMessage[]
  ): ConversationMessage[] => {
    const classifiedError = classifyError(error)
    logger.error(`AI Generation Error (${classifiedError.type}):`, classifiedError.originalError || error)
    
    // Set local error state
    errorMessage.value = classifiedError.message
    
    // Update block with error
    if (editor && block) {
      try {
        editor.commands.updateAttributes('aiGeneration', {
          error: classifiedError.message,
          loading: false
        })
      } catch (editorError) {
        logger.error('Failed to update editor with error:', editorError)
      }
    }
    
    // Show toast notification
    toast({
      title: 'Error',
      description: classifiedError.message,
      variant: 'destructive'
    })
    
    return conversationHistory
  }

  return {
    errorMessage,
    classifyError,
    handleGenerationError
  }
} 








