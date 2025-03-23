import { useNotaStore } from '@/stores/nota'
import { Editor } from '@tiptap/vue-3'
import { logger } from '@/services/logger'
import { toast } from '@/lib/utils'

export interface SubNotaCreationOptions {
  parentId: string
  title: string
  editor?: Editor
  range?: any
  insertLink?: boolean
}

export async function createSubNota({ 
  parentId, 
  title, 
  editor, 
  range, 
  insertLink = true 
}: SubNotaCreationOptions) {
  try {
    if (!title.trim()) {
      throw new Error('Title cannot be empty')
    }

    // Validate parentId to ensure it's a non-empty string
    const validParentId = parentId && typeof parentId === 'string' && parentId.trim() !== '' 
      ? parentId.trim() 
      : null
    
    console.log(`SubNotaService creating nota with parentId: ${validParentId}`)
    
    const store = useNotaStore()
    const newNota = await store.createItem(title.trim(), validParentId)
    
    console.log('SubNotaService created nota:', JSON.stringify(newNota, null, 2))

    // Insert page link if editor and range are provided
    if (insertLink && editor && range) {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'pageLink',
          attrs: {
            href: `/nota/${newNota.id}`,
            title: title,
          },
        })
        .run()
        
      // Trigger content save by dispatching an update event
      const transaction = editor.state.tr
      editor.view.dispatch(transaction)
    }

    return {
      success: true,
      notaId: newNota.id,
      title: newNota.title,
      nota: newNota
    }
  } catch (error) {
    logger.error('Failed to create sub nota:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
} 