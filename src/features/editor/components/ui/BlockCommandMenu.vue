<script setup lang="ts">
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/ui/command'
import { 
  Trash2Icon, 
  ScissorsIcon, 
  CopyIcon, 
  StarIcon,
  SparklesIcon,
  EditIcon,
  CheckCircleIcon,
  LinkIcon,
  WandIcon
} from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import type { EditorView } from '@tiptap/pm/view'
import { serializeForClipboard } from '@/features/editor/components/extensions/DragHandlePlugin'
import type { Selection } from '@tiptap/pm/state'
import { useFavoriteBlocksStore } from '@/features/nota/stores/favoriteBlocksStore'
import AddToFavoritesModal from '@/features/editor/components/dialogs/AddToFavoritesModal.vue'
import { toast } from '@/ui/toast'
import { logger } from '@/services/logger'
import { aiService } from '@/features/ai/services'
import { useAISettingsStore } from '@/features/ai/stores/aiSettingsStore'
import type { GenerationOptions } from '@/features/ai/services'

const props = defineProps<{
  position: { x: number; y: number } | null
  selection: Selection | null
  isVisible: boolean
  editorView?: EditorView
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const favoriteBlocksStore = useFavoriteBlocksStore()
const aiSettings = useAISettingsStore()

const showAddToFavoritesModal = ref(false)
const isAIProcessing = ref(false)

const cut = () => {
  emit('close')
  if (!props.editorView || !props.selection) return

  const slice = props.selection.content()
  const { dom, text } = serializeForClipboard(props.editorView, slice)

  // Copy the content to the clipboard
  const clipboardItem = new ClipboardItem({
    'text/html': new Blob([dom.innerHTML], { type: 'text/html' }),
    'text/plain': new Blob([text], { type: 'text/plain' }),
  })

  navigator.clipboard.write([clipboardItem]).then(() => {
    if (!props.editorView || !props.selection) return

    // After copying, delete the selected block
    const { state, dispatch } = props.editorView
    const tr = state.tr.delete(props.selection.from, props.selection.to)
    dispatch(tr)
  })
}

const copy = () => {
  emit('close')
  if (!props.editorView || !props.selection) return

  const slice = props.selection.content()
  const { dom, text } = serializeForClipboard(props.editorView, slice)

  // Copy the content to the clipboard
  const clipboardItem = new ClipboardItem({
    'text/html': new Blob([dom.innerHTML], { type: 'text/html' }),
    'text/plain': new Blob([text], { type: 'text/plain' }),
  })

  navigator.clipboard.write([clipboardItem])
}

const deleteBlock = () => {
  emit('close')
  if (!props.editorView || !props.selection) return

  const { state, dispatch } = props.editorView!
  const tr = state.tr.delete(props.selection.from, props.selection.to)
  dispatch(tr)

  // Focus the editor after deleting
  props.editorView.focus()
}

const addToFavorites = () => {
  showAddToFavoritesModal.value = true
}

const handleAddToFavorites = async (name: string, tags: string[]) => {
  if (!props.editorView || !props.selection) return

  const node = props.editorView.state.doc.nodeAt(props.selection.from)
  if (!node) return

  const nodeType = node.type.name
  const content = node.toJSON()

  try {
    // Ensure content is stringified before saving
    await favoriteBlocksStore.addBlock({
      name,
      content: JSON.stringify(content),
      type: nodeType,
      tags: Array.from(tags) // Ensure tags is a plain array
    })
    
    showAddToFavoritesModal.value = false
    
    toast({
      title: 'Success',
      description: 'Block added to favorites'
    })
    
    emit('close')
    props.editorView.focus()
  } catch (error) {
    logger.error('Failed to add block:', error)
    toast({
      title: 'Error',
      description: 'Failed to add block to favorites',
      variant: 'destructive'
    })
  }
}

// AI-powered functions
const getSelectedText = (): string => {
  if (!props.editorView || !props.selection) return ''
  
  const { from, to } = props.selection
  const text = props.editorView.state.doc.textBetween(from, to, ' ')
  return text.trim()
}

const replaceSelectedText = (newText: string) => {
  if (!props.editorView || !props.selection) return
  
  const { state, dispatch } = props.editorView
  const { from, to } = props.selection
  
  const tr = state.tr.replaceWith(from, to, state.schema.text(newText))
  dispatch(tr)
  
  // Focus the editor after replacing
  props.editorView.focus()
}

const performAIAction = async (prompt: string, actionName: string) => {
  const selectedText = getSelectedText()
  if (!selectedText) {
    toast({
      title: 'No text selected',
      description: 'Please select some text to perform this action.',
      variant: 'destructive'
    })
    return
  }

  try {
    isAIProcessing.value = true
    
    const providerId = aiSettings.settings.preferredProviderId
    const apiKey = aiSettings.getApiKey(providerId)
    
    if (!apiKey && providerId !== 'webllm') {
      toast({
        title: 'API Key Required',
        description: `Please configure your ${providerId} API key in settings.`,
        variant: 'destructive'
      })
      return
    }

    const fullPrompt = `${prompt}\n\nText to process: "${selectedText}"\n\nPlease respond with only the processed text, no additional commentary.`
    
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
      
      replaceSelectedText(processedText)
      
      toast({
        title: `${actionName} Complete`,
        description: 'Text has been successfully processed.'
      })
    } else {
      throw new Error('No response received from AI service')
    }
  } catch (error) {
    logger.error(`Error in ${actionName}:`, error)
    toast({
      title: `${actionName} Failed`,
      description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      variant: 'destructive'
    })
  } finally {
    isAIProcessing.value = false
    emit('close')
  }
}

const rewriteText = async () => {
  await performAIAction(
    'Please rewrite the following text to improve its clarity, flow, and readability while maintaining the original meaning and intent:',
    'Text Rewrite'
  )
}

const correctGrammar = async () => {
  await performAIAction(
    'Please correct any grammar, spelling, and punctuation errors in the following text while preserving the original meaning and style:',
    'Grammar Correction'
  )
}

const improveWriting = async () => {
  await performAIAction(
    'Please improve the following text by enhancing its vocabulary, sentence structure, and overall writing quality while maintaining the original meaning:',
    'Writing Improvement'
  )
}

const makeConcise = async () => {
  await performAIAction(
    'Please make the following text more concise and to-the-point while preserving all important information and meaning:',
    'Text Concision'
  )
}

// Handle click outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  // Check if the click is inside the command menu or the modal
  if (!target.closest('.command-menu') && !target.closest('[role="dialog"]')) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div>
    <Command
      v-if="isVisible && position"
      class="fixed z-50 rounded-lg border shadow-md w-64 h-auto command-menu bg-popover"
      :style="{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }"
    >
      <CommandList>
        <!-- Standard Actions -->
        <CommandGroup>
          <CommandItem value="cut" @select="cut">
            <ScissorsIcon class="mr-2 h-4 w-4" />
            <span>Cut</span>
          </CommandItem>
          <CommandItem value="copy" @select="copy">
            <CopyIcon class="mr-2 h-4 w-4" />
            <span>Copy</span>
          </CommandItem>
          <CommandItem value="favorite" @select="addToFavorites">
            <StarIcon class="mr-2 h-4 w-4" />
            <span>Add to Favorites</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <!-- AI-Powered Actions -->
        <CommandGroup>
          <CommandItem 
            value="rewrite" 
            @select="rewriteText"
            :disabled="isAIProcessing"
            class="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <EditIcon class="mr-2 h-4 w-4" />
            <span>{{ isAIProcessing ? 'Processing...' : 'Rewrite with AI' }}</span>
          </CommandItem>
          <CommandItem 
            value="grammar" 
            @select="correctGrammar"
            :disabled="isAIProcessing"
            class="text-green-600 hover:bg-green-50 hover:text-green-700"
          >
            <CheckCircleIcon class="mr-2 h-4 w-4" />
            <span>{{ isAIProcessing ? 'Processing...' : 'Fix Grammar' }}</span>
          </CommandItem>
          <CommandItem 
            value="improve" 
            @select="improveWriting"
            :disabled="isAIProcessing"
            class="text-purple-600 hover:bg-purple-50 hover:text-purple-700"
          >
            <SparklesIcon class="mr-2 h-4 w-4" />
            <span>{{ isAIProcessing ? 'Processing...' : 'Improve Writing' }}</span>
          </CommandItem>
          <CommandItem 
            value="concise" 
            @select="makeConcise"
            :disabled="isAIProcessing"
            class="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          >
            <WandIcon class="mr-2 h-4 w-4" />
            <span>{{ isAIProcessing ? 'Processing...' : 'Make Concise' }}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <!-- Destructive Actions -->
        <CommandGroup>
          <CommandItem
            class="text-red-600 hover:bg-red-100 hover:text-red-600"
            value="delete"
            @select="deleteBlock"
          >
            <Trash2Icon class="mr-2 h-4 w-4" />
            <span>Delete</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>

    <AddToFavoritesModal
      v-model:open="showAddToFavoritesModal"
      @submit="handleAddToFavorites"
    />
  </div>
</template>

<style scoped>
.fixed {
  position: fixed;
}

.command-menu .lucide {
  flex-shrink: 0;
}
</style>








