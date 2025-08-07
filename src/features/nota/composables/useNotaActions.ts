import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { toast } from 'vue-sonner'
import { ERROR_MESSAGES, SUCCESS_MESSAGES, FILE_EXTENSIONS } from '@/constants/app'

export function useNotaActions() {
  const router = useRouter()
  const store = useNotaStore()

  const createNewNota = async (title = 'Untitled Nota'): Promise<string | null> => {
    try {
      const nota = await store.createItem(title)
      router.push(`/nota/${nota.id}`)
      toast(SUCCESS_MESSAGES.notas.created)
      return nota.id
    } catch (error) {
      console.error('Failed to create nota:', error)
      toast(ERROR_MESSAGES.notas.createFailed)
      return null
    }
  }

  const deleteNota = async (id: string): Promise<boolean> => {
    try {
      await store.deleteItem(id)
      toast(SUCCESS_MESSAGES.notas.deleted)
      return true
    } catch (error) {
      console.error('Failed to delete nota:', error)
      toast(ERROR_MESSAGES.notas.deleteFailed)
      return false
    }
  }

  const toggleNotaFavorite = async (id: string): Promise<boolean> => {
    try {
      await store.toggleFavorite(id)
      toast(SUCCESS_MESSAGES.notas.favoriteToggled)
      return true
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      toast('Failed to update favorite status')
      return false
    }
  }

  const duplicateNota = async (id: string): Promise<string | null> => {
    try {
      const originalNota = store.getItem(id)
      if (!originalNota) {
        throw new Error('Original nota not found')
      }

      const duplicatedNota = await store.createItem(`${originalNota.title} (Copy)`)
      
      // Update the duplicated nota with original content and tags
      await store.saveNota({
        ...duplicatedNota,
        content: originalNota.content,
        tags: [...(originalNota.tags || [])]
      })

      toast('Nota duplicated successfully')
      return duplicatedNota.id
    } catch (error) {
      console.error('Failed to duplicate nota:', error)
      toast('Failed to duplicate nota')
      return null
    }
  }

  const exportNota = async (id: string): Promise<boolean> => {
    try {
      await store.exportNota(id)
      toast(SUCCESS_MESSAGES.notas.exported)
      return true
    } catch (error) {
      console.error('Failed to export nota:', error)
      toast(ERROR_MESSAGES.notas.exportFailed)
      return false
    }
  }

  const handleImport = async (acceptedExtensions: string[] = [FILE_EXTENSIONS.nota]): Promise<boolean> => {
    const { useNotaImport } = await import('./useNotaImport')
    const { importNota } = useNotaImport()
    return await importNota(acceptedExtensions)
  }

  const handleExport = async (): Promise<boolean> => {
    try {
      await store.exportAllNotas()
      toast(SUCCESS_MESSAGES.notas.exported)
      return true
    } catch (error) {
      console.error('Export failed:', error)
      toast(ERROR_MESSAGES.notas.exportFailed)
      return false
    }
  }

  const navigateToNota = (id: string) => {
    router.push(`/nota/${id}`)
  }

  const navigateToNotaSettings = (id: string) => {
    router.push(`/nota/${id}/settings`)
  }

  const navigateToNotaEdit = (id: string) => {
    router.push(`/nota/${id}/edit`)
  }

  const navigateToPublishedNota = (id: string) => {
    router.push(`/p/${id}`)
  }

  // Batch operations
  const deleteMultipleNotas = async (ids: string[]): Promise<boolean> => {
    try {
      const promises = ids.map(id => store.deleteItem(id))
      await Promise.all(promises)
      toast(`${ids.length} notas deleted successfully`)
      return true
    } catch (error) {
      console.error('Failed to delete multiple notas:', error)
      toast('Failed to delete some notas')
      return false
    }
  }

  const toggleMultipleFavorites = async (ids: string[]): Promise<boolean> => {
    try {
      const promises = ids.map(id => store.toggleFavorite(id))
      await Promise.all(promises)
      toast(`Updated favorite status for ${ids.length} notas`)
      return true
    } catch (error) {
      console.error('Failed to toggle multiple favorites:', error)
      toast('Failed to update some favorite statuses')
      return false
    }
  }

  return {
    // Single nota operations
    createNewNota,
    deleteNota,
    toggleNotaFavorite,
    duplicateNota,
    exportNota,
    
    // Import/Export operations
    handleImport,
    handleExport,
    
    // Navigation operations
    navigateToNota,
    navigateToNotaSettings,
    navigateToNotaEdit,
    navigateToPublishedNota,
    
    // Batch operations
    deleteMultipleNotas,
    toggleMultipleFavorites,
    
    // Constants
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    FILE_EXTENSIONS
  }
} 







