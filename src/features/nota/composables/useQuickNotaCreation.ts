import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { logger } from '@/services/logger'

export function useQuickNotaCreation() {
  const router = useRouter()
  const notaStore = useNotaStore()
  
  const isCreating = ref(false)

  const createQuickNota = async (title: string, parentId: string | null = null) => {
    if (!title.trim()) {
      title = 'Untitled Nota'
    }

    isCreating.value = true

    try {
      const nota = await notaStore.createItem(title.trim(), parentId)
      
      // Navigate to the new nota
      await router.push(`/nota/${nota.id}`)
      
      return { success: true, nota }
    } catch (error) {
      logger.error('Failed to create quick nota:', error)
      return { success: false, error }
    } finally {
      isCreating.value = false
    }
  }

  const createNotaWithContent = async (
    title: string, 
    parentId: string | null = null,
    tags: string[] = []
  ) => {
    if (!title.trim()) {
      title = 'Untitled Nota'
    }

    isCreating.value = true

    try {
      // Create the nota first
      const nota = await notaStore.createItem(title.trim(), parentId)

      // Update with tags if provided
      const updates: any = {}
      if (tags.length > 0) {
        updates.tags = tags
      }

      if (Object.keys(updates).length > 0) {
        await notaStore.saveNota({
          id: nota.id,
          ...updates
        })
      }



      return { success: true, nota }
    } catch (error) {
      logger.error('Failed to create nota with content:', error)
      return { success: false, error }
    } finally {
      isCreating.value = false
    }
  }

  return {
    isCreating,
    createQuickNota,
    createNotaWithContent
  }
} 