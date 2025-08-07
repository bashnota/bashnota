import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'
import { aiService } from '@/features/ai/services'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import type { GenerationOptions } from '@/features/ai/services'
import type { AIAction } from '@/features/ai/types/aiActions'

export function useAIActions() {
  const isProcessing = ref(false)
  const aiSettings = useAISettingsStore()

  const executeAction = async (
    action: AIAction,
    selectedText: string,
    onTextReplaced?: (newText: string) => void
  ): Promise<string | null> => {
    if (!selectedText.trim()) {
      toast({
        title: 'No text selected',
        description: 'Please select some text to perform this action.',
        variant: 'destructive'
      })
      return null
    }

    try {
      isProcessing.value = true
      
      const providerId = aiSettings.settings.preferredProviderId
      const apiKey = aiSettings.getApiKey(providerId)
      
      if (!apiKey && providerId !== 'webllm') {
        toast({
          title: 'API Key Required',
          description: `Please configure your ${providerId} API key in settings.`,
          variant: 'destructive'
        })
        return null
      }

      const fullPrompt = `${action.prompt}\n\nText to process: "${selectedText}"\n\nPlease respond with only the processed text, no additional commentary.`
      
      const options: GenerationOptions = {
        prompt: fullPrompt,
        maxTokens: aiSettings.settings.maxTokens,
        temperature: 0.3 // Lower temperature for more consistent results
      }

      const result = await aiService.generateText(providerId, options, apiKey)
      
      if (result?.text) {
        // Clean up the response by removing quotes and extra whitespace
        let processedText = result.text.trim()
        
        // Remove surrounding quotes if present
        if ((processedText.startsWith('"') && processedText.endsWith('"')) ||
            (processedText.startsWith("'") && processedText.endsWith("'"))) {
          processedText = processedText.slice(1, -1)
        }
        
        // Call the callback if provided
        if (onTextReplaced) {
          onTextReplaced(processedText)
        }
        
        toast({
          title: `${action.name} Complete`,
          description: 'Text has been successfully processed.'
        })
        
        return processedText
      } else {
        throw new Error('No response received from AI service')
      }
    } catch (error) {
      logger.error(`Error in ${action.name}:`, error)
      toast({
        title: `${action.name} Failed`,
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive'
      })
      return null
    } finally {
      isProcessing.value = false
    }
  }

  return {
    isProcessing,
    executeAction
  }
} 