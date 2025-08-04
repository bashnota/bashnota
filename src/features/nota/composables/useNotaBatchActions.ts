import { computed, ref } from 'vue'
import type { Nota } from '@/features/nota/types/nota'

export interface BatchActionResult {
  success: boolean
  message: string
  count: number
}

export function useNotaBatchActions() {
  const isProcessing = ref(false)

  // Batch action handlers
  const batchToggleFavorite = async (
    selectedIds: string[], 
    allNotas: Nota[], 
    toggleFavoriteAction: (id: string) => Promise<void> | void
  ): Promise<BatchActionResult> => {
    if (selectedIds.length === 0) {
      return { success: false, message: 'No notas selected', count: 0 }
    }

    isProcessing.value = true
    
    try {
      const selectedNotas = allNotas.filter(nota => selectedIds.includes(nota.id))
      const hasFavorites = selectedNotas.some(nota => nota.favorite)
      const hasNonFavorites = selectedNotas.some(nota => !nota.favorite)
      
      // If mixed state or all favorites, remove favorites. If all non-favorites, add favorites
      const shouldFavorite = !hasFavorites && hasNonFavorites
      
      for (const id of selectedIds) {
        const nota = allNotas.find(n => n.id === id)
        if (nota && nota.favorite !== shouldFavorite) {
          await toggleFavoriteAction(id)
        }
      }

      const action = shouldFavorite ? 'added to' : 'removed from'
      return {
        success: true,
        message: `${selectedIds.length} notas ${action} favorites`,
        count: selectedIds.length
      }
    } catch (error) {
      console.error('Batch favorite toggle failed:', error)
      return {
        success: false,
        message: 'Failed to update favorites',
        count: 0
      }
    } finally {
      isProcessing.value = false
    }
  }

  const batchDelete = async (
    selectedIds: string[],
    deleteAction: (id: string) => Promise<void> | void
  ): Promise<BatchActionResult> => {
    console.log('useNotaBatchActions: batchDelete called with IDs:', selectedIds)
    
    if (selectedIds.length === 0) {
      return { success: false, message: 'No notas selected', count: 0 }
    }

    isProcessing.value = true
    
    try {
      for (const id of selectedIds) {
        console.log('useNotaBatchActions: Processing delete for ID:', id)
        await deleteAction(id)
      }

      console.log('useNotaBatchActions: All deletes completed successfully')
      return {
        success: true,
        message: `${selectedIds.length} notas deleted`,
        count: selectedIds.length
      }
    } catch (error) {
      console.error('Batch delete failed:', error)
      return {
        success: false,
        message: 'Failed to delete notas',
        count: 0
      }
    } finally {
      isProcessing.value = false
    }
  }

  const batchAddTags = async (
    selectedIds: string[],
    tags: string[],
    addTagsAction: (id: string, tags: string[]) => Promise<void> | void
  ): Promise<BatchActionResult> => {
    if (selectedIds.length === 0) {
      return { success: false, message: 'No notas selected', count: 0 }
    }

    if (tags.length === 0) {
      return { success: false, message: 'No tags specified', count: 0 }
    }

    isProcessing.value = true
    
    try {
      for (const id of selectedIds) {
        await addTagsAction(id, tags)
      }

      return {
        success: true,
        message: `Tags added to ${selectedIds.length} notas`,
        count: selectedIds.length
      }
    } catch (error) {
      console.error('Batch add tags failed:', error)
      return {
        success: false,
        message: 'Failed to add tags',
        count: 0
      }
    } finally {
      isProcessing.value = false
    }
  }

  const batchRemoveTags = async (
    selectedIds: string[],
    tags: string[],
    removeTagsAction: (id: string, tags: string[]) => Promise<void> | void
  ): Promise<BatchActionResult> => {
    if (selectedIds.length === 0) {
      return { success: false, message: 'No notas selected', count: 0 }
    }

    if (tags.length === 0) {
      return { success: false, message: 'No tags specified', count: 0 }
    }

    isProcessing.value = true
    
    try {
      for (const id of selectedIds) {
        await removeTagsAction(id, tags)
      }

      return {
        success: true,
        message: `Tags removed from ${selectedIds.length} notas`,
        count: selectedIds.length
      }
    } catch (error) {
      console.error('Batch remove tags failed:', error)
      return {
        success: false,
        message: 'Failed to remove tags',
        count: 0
      }
    } finally {
      isProcessing.value = false
    }
  }

  // Batch action definitions for UI
  const batchActions = computed(() => [
    {
      id: 'toggle-favorite',
      label: 'Toggle Favorite',
      icon: 'Star',
      variant: 'outline' as const,
      description: 'Add/remove from favorites'
    },
    {
      id: 'add-tags',
      label: 'Add Tags',
      icon: 'Tag',
      variant: 'outline' as const,
      description: 'Add tags to selected notas'
    },
    {
      id: 'remove-tags',
      label: 'Remove Tags',
      icon: 'TagX',
      variant: 'outline' as const,
      description: 'Remove tags from selected notas'
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: 'Trash2',
      variant: 'destructive' as const,
      description: 'Delete selected notas'
    }
  ])

  return {
    // State
    isProcessing,
    batchActions,
    
    // Methods
    batchToggleFavorite,
    batchDelete,
    batchAddTags,
    batchRemoveTags,
  }
}
