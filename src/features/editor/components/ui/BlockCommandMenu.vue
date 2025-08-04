<script setup lang="ts">
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { 
  Trash2 as Trash2Icon, 
  Scissors as ScissorsIcon, 
  Copy as CopyIcon, 
  Star as StarIcon
} from 'lucide-vue-next'
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import type { EditorView } from '@tiptap/pm/view'
import { serializeForClipboard } from '@/features/editor/components/extensions/DragHandlePlugin'
import type { Selection } from '@tiptap/pm/state'
import { useFavoriteBlocksStore } from '@/features/nota/stores/favoriteBlocksStore'
import AddToFavoritesModal from '@/features/editor/components/dialogs/AddToFavoritesModal.vue'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'
import { useAIActionsStore } from '@/features/ai/stores/aiActionsStore'
import { useAIActions } from '@/features/ai/components/composables/useAIActions'
import { getIconComponent, getColorClasses } from '@/features/ai/utils/iconResolver'

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

const handleAIAction = async (actionId: string) => {
  const action = aiActionsStore.getActionById(actionId)
  if (!action) return
  
  const selectedText = getSelectedText()
  
  await executeAction(action, selectedText, (newText) => {
    replaceSelectedText(newText)
  })
  
  emit('close')
}

// Handle context menu open/close
const handleOpenChange = (open: boolean) => {
  if (!open) {
    emit('close')
  }
}

// Handle click outside to close menu
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  // Check if the click is inside the menu or the modal
  if (!target.closest('.bg-popover') && !target.closest('[role="dialog"]')) {
    emit('close')
  }
}

onMounted(() => {
  if (props.isVisible) {
    document.addEventListener('mousedown', handleClickOutside)
  }
})

// Watch for changes in visibility to add/remove event listener
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    document.addEventListener('mousedown', handleClickOutside)
  } else {
    document.removeEventListener('mousedown', handleClickOutside)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div>
    <div
      v-if="isVisible && position"
      class="fixed z-50 rounded-lg border border-gray-200 shadow-lg w-64 bg-white"
      :style="{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }"
    >
      <div class="py-1">
        <!-- Standard Actions -->
        <div class="flex flex-col">
          <button
            @click="cut"
            class="flex items-center px-3 py-2 text-sm hover:bg-gray-100 w-full text-left transition-colors"
          >
            <ScissorsIcon class="mr-2 h-4 w-4" />
            <span>Cut</span>
          </button>
          <button
            @click="copy"
            class="flex items-center px-3 py-2 text-sm hover:bg-gray-100 w-full text-left transition-colors"
          >
            <CopyIcon class="mr-2 h-4 w-4" />
            <span>Copy</span>
          </button>
          <button
            @click="addToFavorites"
            class="flex items-center px-3 py-2 text-sm hover:bg-gray-100 w-full text-left transition-colors"
          >
            <StarIcon class="mr-2 h-4 w-4" />
            <span>Add to Favorites</span>
          </button>
        </div>

        <div v-if="aiActionsStore.isLoaded && enabledAIActions.length > 0" class="border-t border-gray-200 my-1"></div>

        <!-- AI-Powered Actions -->
        <div v-if="aiActionsStore.isLoaded && enabledAIActions.length > 0" class="flex flex-col">
          <button
            v-for="action in enabledAIActions"
            :key="action.id"
            @click="() => handleAIAction(action.id)"
            :disabled="isProcessing"
            class="flex items-center px-3 py-2 text-sm hover:bg-gray-100 w-full text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <component 
              :is="getIconComponent(action.icon || 'EditIcon')" 
              class="mr-2 h-4 w-4" 
            />
            <span>{{ isProcessing ? 'Processing...' : (action.name || 'AI Action') }}</span>
          </button>
        </div>

        <div v-if="aiActionsStore.isLoaded && enabledAIActions.length > 0" class="border-t border-gray-200 my-1"></div>

        <!-- Destructive Actions -->
        <div class="flex flex-col">
          <button
            @click="deleteBlock"
            class="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
          >
            <Trash2Icon class="mr-2 h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>

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

/* Ensure menu appears above other elements */
.z-50 {
  z-index: 50;
}
</style>








