import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import InlineAIGenerationComponent from '../blocks/InlineAIGeneration.vue'
import { aiService } from '@/services/aiService'
import { useAISettingsStore } from '@/stores/aiSettingsStore'
import { toast } from '@/lib/utils'

export interface InlineAIGenerationAttributes {
  prompt: string
  result: string
  isLoading: boolean
  error: string
}

export const InlineAIGenerationExtension = Node.create({
  name: 'inlineAIGeneration',
  
  group: 'block',
  
  content: '',
  
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
      }
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
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-ai-generation' }), 0]
  },
  
  addNodeView() {
    return VueNodeViewRenderer(InlineAIGenerationComponent)
  },
  
  addCommands() {
    return {
      insertInlineAIGeneration: () => ({ commands }) => {
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
      
      generateInlineAI: (nodePos, prompt) => ({ editor }) => {
        console.log('generateInlineAI called with:', nodePos, prompt)
        
        const aiSettings = useAISettingsStore()
        const providerId = aiSettings.settings.preferredProviderId
        const apiKey = aiSettings.getApiKey(providerId)
        const provider = aiSettings.preferredProvider
        
        if (provider?.requiresApiKey && !apiKey) {
          // Update node with error
          console.error('API key required for', provider.name)
          
          // Find the node and update it directly
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
          
          toast({
            title: 'API Key Required',
            description: `Please set your API key for ${provider.name} in the settings.`,
            variant: 'destructive'
          })
          
          return false
        }
        
        // Set loading state
        console.log('Setting loading state at position:', nodePos)
        const node = editor.state.doc.nodeAt(nodePos)
        if (node && node.type.name === 'inlineAIGeneration') {
          editor.view.dispatch(
            editor.state.tr.setNodeMarkup(nodePos, undefined, {
              ...node.attrs,
              isLoading: true,
              error: ''
            })
          )
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
          }
        ).then(result => {
          console.log('Generation successful:', result)
          
          // Update node with result
          const updatedNode = editor.state.doc.nodeAt(nodePos)
          if (updatedNode && updatedNode.type.name === 'inlineAIGeneration') {
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(nodePos, undefined, {
                ...updatedNode.attrs,
                result: result.text.trim(),
                isLoading: false
              })
            )
          }
          
          // Show success toast
          toast({
            title: 'Text Generated',
            description: `Generated ${result.text.length} characters with ${provider?.name}.`
          })
        }).catch(error => {
          console.error('Generation failed:', error)
          
          // Update node with error
          const updatedNode = editor.state.doc.nodeAt(nodePos)
          if (updatedNode && updatedNode.type.name === 'inlineAIGeneration') {
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(nodePos, undefined, {
                ...updatedNode.attrs,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                isLoading: false
              })
            )
          }
          
          // Show error toast
          toast({
            title: 'Generation Failed',
            description: error instanceof Error ? error.message : 'Unknown error occurred',
            variant: 'destructive'
          })
        })
        
        return true
      }
    }
  }
}) 