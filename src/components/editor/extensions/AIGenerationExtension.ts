import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { aiService } from '@/services/aiService'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { toast } from '@/lib/utils'

export const AIGenerationExtension = Extension.create({
  name: 'aiGeneration',

  addCommands() {
    return {
      generateText: (prompt: string) => ({ chain }) => {
        return chain().focus().command(async ({ tr, view, dispatch }) => {
          const aiSettings = useAISettingsStore()
          const providerId = aiSettings.settings.preferredProviderId
          const apiKey = aiSettings.getApiKey(providerId)
          
          // Check if API key is set for the provider that requires it
          const provider = aiSettings.preferredProvider
          if (provider?.requiresApiKey && !apiKey) {
            toast({
              title: 'API Key Required',
              description: `Please set your API key for ${provider.name} in the settings.`,
              variant: 'destructive'
            })
            return false
          }

          try {
            // Show loading state
            toast({
              title: 'Generating...',
              description: `Using ${provider?.name} to generate text.`
            })

            // Generate text
            const result = await aiService.generateText(
              providerId,
              apiKey,
              {
                prompt,
                maxTokens: aiSettings.settings.maxTokens,
                temperature: aiSettings.settings.temperature
              }
            )

            // Insert the generated text
            if (dispatch) {
              const text = result.text.trim()
              const transaction = tr.insertText(text)
              dispatch(transaction)
            }

            // Show success message
            toast({
              title: 'Text Generated',
              description: `Generated ${result.text.length} characters with ${provider?.name}.`
            })

            return true
          } catch (error) {
            console.error('AI generation failed:', error)
            toast({
              title: 'Generation Failed',
              description: error instanceof Error ? error.message : 'Unknown error occurred',
              variant: 'destructive'
            })
            return false
          }
        })
      }
    }
  }
}) 