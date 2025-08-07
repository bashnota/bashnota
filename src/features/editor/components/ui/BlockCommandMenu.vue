<script setup lang="ts">
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { 
  Trash2 as Trash2Icon, 
  Scissors as ScissorsIcon, 
  Copy as CopyIcon, 
  Star as StarIcon
} from 'lucide-vue-next'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { EditorView } from '@tiptap/pm/view'
import { serializeForClipboard } from '@/features/editor/components/extensions/DragHandle'
import type { Selection } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'
import { useFavoriteBlocksStore } from '@/features/nota/stores/favoriteBlocksStore'
import AddToFavoritesModal from '@/features/editor/components/dialogs/AddToFavoritesModal.vue'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'
import { useAIActionsStore } from '@/features/ai/stores/aiActionsStore'
import { useAIActions } from '@/features/ai/components/composables/useAIActions'
import { getIconComponent, getColorClasses } from '@/features/ai/utils/iconResolver'

const props = defineProps<{
  editorView?: EditorView
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Store the selection when the context menu is opened
const storedSelection = ref<Selection | null>(null)

// Get current selection from the editor view when needed
const getCurrentSelection = () => {
  // Use stored selection if available, otherwise get current selection
  return storedSelection.value || props.editorView?.state.selection || null
}

// Store selection when context menu opens
const storeCurrentSelection = () => {
  // Clear any previous stored selection first
  storedSelection.value = null
  
  if (props.editorView?.state.selection) {
    storedSelection.value = props.editorView.state.selection
    logger.info('Stored fresh selection:', {
      from: storedSelection.value.from,
      to: storedSelection.value.to,
      empty: storedSelection.value.empty
    })
  }
}

// Clear stored selection when context menu closes
const clearStoredSelection = () => {
  storedSelection.value = null
}

// Handle selection update events from the context menu plugin
const handleSelectionUpdate = (event: CustomEvent) => {
  if (event.detail?.selection) {
    storedSelection.value = event.detail.selection
    logger.info('Received selection update from context menu plugin:', {
      from: event.detail.selection.from,
      to: event.detail.selection.to,
      empty: event.detail.selection.empty
    })
  }
}

// Set up event listeners for context menu events
onMounted(() => {
  document.addEventListener('block-context-menu:selection-update', handleSelectionUpdate as EventListener)
})

onUnmounted(() => {
  document.removeEventListener('block-context-menu:selection-update', handleSelectionUpdate as EventListener)
})

// Handle context menu open/close
const handleOpenChange = (open: boolean) => {
  if (open) {
    storeCurrentSelection()
  } else {
    clearStoredSelection()
    emit('close')
  }
}

// Set up event listeners
onMounted(() => {
  document.addEventListener('block-context-menu:selection-update', handleSelectionUpdate as EventListener)
})

onUnmounted(() => {
  document.removeEventListener('block-context-menu:selection-update', handleSelectionUpdate as EventListener)
})

// Helper to get the current selected node info for debugging
const getSelectedNodeInfo = () => {
  const selection = getCurrentSelection()
  if (!props.editorView || !selection) return null
  
  const node = props.editorView.state.doc.nodeAt(selection.from)
  return {
    nodeName: node?.type.name,
    isBlock: node?.isBlock,
    isInline: node?.isInline,
    selection: {
      from: selection.from,
      to: selection.to,
      empty: selection.empty
    }
  }
}

const favoriteBlocksStore = useFavoriteBlocksStore()
const aiActionsStore = useAIActionsStore()
const { isProcessing, executeAction } = useAIActions()

const showAddToFavoritesModal = ref(false)

// Get enabled AI actions with safety checks
const enabledAIActions = computed(() => {
  try {
    // Only return actions if the store is loaded
    if (!aiActionsStore.isLoaded) {
      return []
    }
    
    return aiActionsStore.enabledActions.filter(action => 
      action && 
      action.id && 
      action.name && 
      action.icon && 
      action.color
    )
  } catch (error) {
    logger.error('Error getting enabled AI actions:', error)
    return []
  }
})

const cut = async () => {
  emit('close')
  const selection = getCurrentSelection()
  if (!props.editorView || !selection) {
    logger.error('No selection available for cut operation')
    toast({
      title: 'Error',
      description: 'No content selected to cut',
      variant: 'destructive'
    })
    return
  }

  try {
    // First copy the content
    await copyToClipboard()
    
    // Then delete the selected content
    const { state, dispatch } = props.editorView
    const tr = state.tr.delete(selection.from, selection.to)
    dispatch(tr)
    
    // Clear the stored selection since the content has been removed
    clearStoredSelection()
    
    // Focus the editor after cutting
    props.editorView.focus()
    
    toast({
      title: 'Success',
      description: 'Content cut to clipboard'
    })
  } catch (error) {
    logger.error('Failed to cut content:', error)
    toast({
      title: 'Error',
      description: 'Failed to cut content',
      variant: 'destructive'
    })
  }
}

// Helper function to copy content to clipboard
const copyToClipboard = async () => {
  const selection = getCurrentSelection()
  if (!props.editorView || !selection) {
    logger.error('No selection available for clipboard operation')
    return
  }

  // Additional validation
  if (selection.empty) {
    logger.warn('Selection is empty, attempting to select current block')
    // Try to select the current block/node
    const pos = selection.from
    const node = props.editorView.state.doc.nodeAt(pos)
    if (node && node.isBlock) {
      const nodeStart = pos - selection.$from.parentOffset
      const nodeEnd = nodeStart + node.nodeSize
      // Update the stored selection
      storedSelection.value = TextSelection.create(props.editorView.state.doc, nodeStart, nodeEnd)
    } else {
      toast({
        title: 'Warning',
        description: 'No block content selected',
        variant: 'destructive'
      })
      return
    }
  }

  const slice = (storedSelection.value || selection).content()
  const { dom, text } = serializeForClipboard(props.editorView, slice)

  try {
    // For modern browsers that support ClipboardItem
    if (typeof ClipboardItem !== 'undefined') {
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([dom.innerHTML], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })
      await navigator.clipboard.write([clipboardItem])
    } else {
      // Fallback for older browsers
      await navigator.clipboard.writeText(text)
    }
    
    toast({
      title: 'Success',
      description: 'Content copied to clipboard'
    })
  } catch (error) {
    logger.error('Failed to copy to clipboard:', error)
    // Fallback: try to use the old execCommand method
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      
      toast({
        title: 'Success',
        description: 'Content copied to clipboard'
      })
    } catch (fallbackError) {
      logger.error('Fallback copy also failed:', fallbackError)
      toast({
        title: 'Error',
        description: 'Failed to copy content to clipboard',
        variant: 'destructive'
      })
    }
  }
}

const copy = async () => {
  // Debug: Log what's being selected
  const nodeInfo = getSelectedNodeInfo()
  logger.info('Copy operation - Selected node info:', nodeInfo)
  
  const selection = getCurrentSelection()
  if (!props.editorView || !selection || selection.empty) {
    logger.warn('Copy operation aborted - no valid selection')
    toast({
      title: 'Warning', 
      description: 'No content selected to copy',
      variant: 'destructive'
    })
    emit('close')
    return
  }
  
  try {
    await copyToClipboard()
    // Clear stored selection after successful copy
    clearStoredSelection()
  } catch (error) {
    logger.error('Copy operation failed:', error)
  }
  emit('close')
}

const deleteBlock = () => {
  const selection = getCurrentSelection()
  if (!props.editorView || !selection || selection.empty) {
    logger.warn('Delete operation aborted - no valid selection')
    toast({
      title: 'Warning',
      description: 'No content selected to delete',
      variant: 'destructive'
    })
    emit('close')
    return
  }

  const { state, dispatch } = props.editorView!
  const tr = state.tr.delete(selection.from, selection.to)
  dispatch(tr)

  // Clear the stored selection since the content has been removed
  clearStoredSelection()

  // Focus the editor after deleting
  props.editorView.focus()
  
  toast({
    title: 'Success',
    description: 'Content deleted'
  })
  
  emit('close')
}

const addToFavorites = () => {
  showAddToFavoritesModal.value = true
}

const handleAddToFavorites = async (name: string, tags: string[]) => {
  const selection = getCurrentSelection()
  if (!props.editorView || !selection) return

  const node = props.editorView.state.doc.nodeAt(selection.from)
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
  const selection = getCurrentSelection()
  if (!props.editorView || !selection) return ''
  
  const { from, to } = selection
  const text = props.editorView.state.doc.textBetween(from, to, ' ')
  return text.trim()
}

const replaceSelectedText = (newText: string) => {
  const selection = getCurrentSelection()
  if (!props.editorView || !selection) return
  
  const { state, dispatch } = props.editorView
  const { from, to } = selection
  
  const tr = state.tr.replaceWith(from, to, state.schema.text(newText))
  dispatch(tr)
  
  // Focus the editor after replacing
  props.editorView.focus()
}

const handleAIAction = async (actionId: string) => {
  const action = aiActionsStore.getActionById(actionId)
  if (!action) return
  
  const selectedText = getSelectedText()
  
  await executeAction(action, selectedText, (newText) => {
    replaceSelectedText(newText)
  })
  
  emit('close')
}
</script>

<template>
  <ContextMenu @update:open="handleOpenChange">
    <ContextMenuTrigger as-child>
      <slot />
    </ContextMenuTrigger>
    <ContextMenuContent class="w-64">
      <ContextMenuLabel>Block Actions</ContextMenuLabel>
      <ContextMenuSeparator />
      
      <!-- Standard Actions -->
      <ContextMenuItem @click="cut">
        <ScissorsIcon class="mr-2 h-4 w-4" />
        <span>Cut</span>
        <ContextMenuShortcut>⌘X</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem @click="copy">
        <CopyIcon class="mr-2 h-4 w-4" />
        <span>Copy</span>
        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem @click="addToFavorites">
        <StarIcon class="mr-2 h-4 w-4" />
        <span>Add to Favorites</span>
      </ContextMenuItem>

      <!-- AI-Powered Actions -->
      <template v-if="aiActionsStore.isLoaded && enabledAIActions.length > 0">
        <ContextMenuSeparator />
        <ContextMenuLabel class="text-xs text-muted-foreground">AI Actions</ContextMenuLabel>
        <ContextMenuItem
          v-for="action in enabledAIActions"
          :key="action.id"
          @click="() => handleAIAction(action.id)"
          :disabled="isProcessing"
        >
          <component 
            :is="getIconComponent(action.icon || 'EditIcon')" 
            class="mr-2 h-4 w-4" 
          />
          <span>{{ isProcessing ? 'Processing...' : (action.name || 'AI Action') }}</span>
        </ContextMenuItem>
      </template>

      <!-- Destructive Actions -->
      <ContextMenuSeparator />
      <ContextMenuItem @click="deleteBlock" class="text-destructive focus:text-destructive">
        <Trash2Icon class="mr-2 h-4 w-4" />
        <span>Delete</span>
        <ContextMenuShortcut>Del</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>

  <AddToFavoritesModal
    v-model:open="showAddToFavoritesModal"
    @submit="handleAddToFavorites"
  />
</template>

<style scoped>
/* Custom styles for the block command menu */
</style>








