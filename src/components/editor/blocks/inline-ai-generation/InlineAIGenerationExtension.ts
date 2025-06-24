import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import InlineAIGenerationComponent from './InlineAIGeneration.vue'
import { aiService } from '@/services/aiService'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { toast } from '@/components/ui/toast'
import type { CommandProps } from '@tiptap/core'
import { logger } from '@/services/logger'

export interface InlineAIGenerationAttributes {
  prompt: string
  result: string
  isLoading: boolean
  error: string
}

export const InlineAIGenerationExtension = Node.create({
  name: 'inlineAIGeneration',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      prompt: {
        default: '',
      },
      result: {
        default: '',
      },
      isLoading: {
        default: false,
      },
      error: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="inline-ai-generation"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-ai-generation' })]
  },

  addNodeView() {
    return VueNodeViewRenderer(InlineAIGenerationComponent)
  },

  addCommands() {
    return {
      insertInlineAIGeneration: () => ({ commands }: { commands: any }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            prompt: '',
            result: '',
            isLoading: false,
            error: ''
          }
        })
      },

      generateInlineAI: (nodePos, prompt, isContinuation = false) => ({ editor }) => {
        logger.log('generateInlineAI called with:', nodePos, prompt, isContinuation)

        const aiSettings = useAISettingsStore()
        const providerId = aiSettings.settings.preferredProviderId
        const apiKey = aiSettings.getApiKey(providerId)
        const provider = aiSettings.preferredProvider

        if (provider?.requiresApiKey && !apiKey) {
          // Update node with error
          logger.error('API key required for', provider.name)

          // Find the node and update it directly
          if (nodePos !== undefined && nodePos >= 0 && nodePos < editor.state.doc.content.size) {
            const node = editor.state.doc.nodeAt(nodePos)
            if (node && node.type.name === 'inlineAIGeneration') {
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(nodePos, undefined, {
                  ...node.attrs,
                  error: `API key required for ${provider.name}`,
                  isLoading: false
                })
              )
            }
          }

          toast({
            title: 'API Key Required',
            description: `Please set your API key for ${provider.name} in the settings.`,
            variant: 'destructive'
          })

          return false
        }

        // Set loading state
        logger.log('Setting loading state at position:', nodePos)

        // Get the node at the position
        const { state } = editor.view
        const node = state.doc.nodeAt(nodePos)
        if (node && node.type.name === 'inlineAIGeneration') {
          const transaction = state.tr.setNodeMarkup(nodePos, undefined, {
            ...node.attrs,
            isLoading: true,
            error: ''
          })
          editor.view.dispatch(transaction)
        }

        // Show loading toast
        toast({
          title: 'Generating...',
          description: `Using ${provider?.name} to generate text.`
        })

        // Generate text
        aiService.generateText(
          providerId,
          apiKey,
          {
            prompt,
            maxTokens: aiSettings.settings.maxTokens,
            temperature: aiSettings.settings.temperature
          },
          providerId === 'gemini' ? aiSettings.settings.geminiModel : undefined,
          providerId === 'gemini' ? aiSettings.settings.geminiSafetyThreshold : undefined
        ).then(result => {
          logger.log('Generation successful:', result)

          // Update node with result
          if (nodePos !== undefined && nodePos >= 0 && nodePos < editor.state.doc.content.size) {
            const updatedNode = editor.state.doc.nodeAt(nodePos)
            if (updatedNode && updatedNode.type.name === 'inlineAIGeneration') {
              // Always set the latest response as the result
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(nodePos, undefined, {
                  ...updatedNode.attrs,
                  result: result.text.trim(),
                  isLoading: false
                })
              )
            }
          }

          // Show success toast
          toast({
            title: 'Text Generated',
            description: `Generated ${result.text.length} characters with ${provider?.name}.`
          })
        }).catch(error => {
          logger.error('Error generating inline AI text:', error)

          // Update node with error
          if (nodePos !== undefined && nodePos >= 0 && nodePos < editor.state.doc.content.size) {
            const updatedNode = editor.state.doc.nodeAt(nodePos)
            if (updatedNode && updatedNode.type.name === 'inlineAIGeneration') {
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(nodePos, undefined, {
                  ...updatedNode.attrs,
                  error: error.message,
                  isLoading: false
                })
              )
            }
          }

          // Show error toast
          toast({
            title: 'Generation Failed',
            description: error.message,
            variant: 'destructive'
          })
        })

        return true
      },
    }
  },
}) 