import { ref, computed, watch } from 'vue'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import { useNotaStore } from '@/features/nota/stores/nota'
import type { Block } from '@/features/nota/types/blocks'
import { logger } from '@/services/logger'

/**
 * Composable that integrates Tiptap editor with our block-based database
 * Tiptap handles all the editing, we handle the database storage
 */
export function useBlockEditor(notaId: string) {
  const blockStore = useBlockStore()
  const notaStore = useNotaStore()
  
  const isInitialized = ref(false)
  const lastSavedContent = ref<any>(null)
  
  /**
   * Get all blocks for the current nota
   */
  const blocks = computed(() => blockStore.getNotaBlocks(notaId))
  
  /**
   * Get the block structure for the current nota
   */
  const blockStructure = computed(() => blockStore.getBlockStructure(notaId))
  
  /**
   * Initialize blocks for the current nota
   * This should be called when a nota is first loaded
   */
  const initializeBlocks = async () => {
    if (isInitialized.value) return
    
    try {
      // Get the current nota
      const nota = notaStore.getCurrentNota(notaId)
      
      // Check if we already have blocks for this nota
      const existingBlocks = await blockStore.loadNotaBlocks(notaId, nota)
      
      if (existingBlocks.length === 0) {
        // No blocks exist, create initial block structure
        await blockStore.initializeNotaBlocks(notaId, nota?.title || 'Untitled')
      }
      
      isInitialized.value = true
      logger.info('Block system initialized for nota:', notaId)
    } catch (error) {
      logger.error('Failed to initialize blocks:', error)
    }
  }
  
  /**
   * Sanitize data to ensure it can be serialized for database storage
   */
  const sanitizeData = (data: any): any => {
    if (data === null || data === undefined) {
      return data
    }
    
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return data
    }
    
    if (data instanceof Date) {
      return data.toISOString()
    }
    
    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item))
    }
    
    if (typeof data === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        // Skip functions and other non-serializable types
        if (typeof value !== 'function' && value !== undefined) {
          sanitized[key] = sanitizeData(value)
        }
      }
      return sanitized
    }
    
    // For any other type, return undefined to skip it
    return undefined
  }

  /**
   * Extract text content from Tiptap node safely
   */
  const extractTextContent = (node: any): string => {
    if (!node || typeof node !== 'object') return ''
    
    if (node.text && typeof node.text === 'string') {
      return node.text
    }
    
    if (node.content && Array.isArray(node.content)) {
      return node.content
        .map((child: any) => extractTextContent(child))
        .filter((text: string) => text.length > 0)
        .join(' ')
    }
    
    return ''
  }

  /**
   * Sync current Tiptap content to blocks
   * This is the main function that gets called when content changes
   */
  const syncContentToBlocks = async (tiptapContent: any) => {
    if (!isInitialized.value) {
      await initializeBlocks()
    }
    
    // Don't sync if content hasn't changed
    if (JSON.stringify(tiptapContent) === JSON.stringify(lastSavedContent.value)) {
      return
    }
    
    try {
      // Get the current block structure
      const currentStructure = blockStore.getBlockStructure(notaId)
      if (!currentStructure) {
        logger.error('No block structure found for nota:', notaId)
        return
      }

      // Convert Tiptap content to blocks
      const newBlocks: any[] = []
      const newBlockOrder: string[] = []
      
      // Process each Tiptap node
      if (tiptapContent.content && Array.isArray(tiptapContent.content)) {
        for (let i = 0; i < tiptapContent.content.length; i++) {
          const node = tiptapContent.content[i]
          const order = i
          
          let blockData: any = {
            type: 'text', // default type
            order,
            notaId,
          }
          
          // Convert Tiptap node to block data based on type
          switch (node.type) {
            case 'heading':
              blockData.type = 'heading'
              blockData.level = node.attrs?.level || 1
              blockData.content = node.content?.[0]?.text || ''
              break
              
            case 'paragraph':
              // Check if paragraph contains subNotaLink content
              const hasSubNotaLink = node.content?.some((child: any) => child.type === 'subNotaLink')
              if (hasSubNotaLink) {
                // Extract the subNotaLink data from the first subNotaLink child
                const subNotaLinkChild = node.content.find((child: any) => child.type === 'subNotaLink')
                if (subNotaLinkChild) {
                  blockData.type = 'subNotaLink'
                  blockData.targetNotaId = subNotaLinkChild.attrs?.targetNotaId || ''
                  blockData.targetNotaTitle = subNotaLinkChild.attrs?.targetNotaTitle || 'Untitled Nota'
                  blockData.displayText = subNotaLinkChild.attrs?.displayText || subNotaLinkChild.attrs?.targetNotaTitle || 'Untitled Nota'
                  blockData.linkStyle = subNotaLinkChild.attrs?.linkStyle || 'inline'
                  
                  // Validate required fields for subNotaLink blocks
                  if (!blockData.targetNotaId) {
                    logger.warn('subNotaLink block missing targetNotaId, using placeholder')
                    blockData.targetNotaId = 'placeholder'
                  }
                }
              } else {
                // Regular paragraph
                blockData.type = 'text'
                blockData.content = node.content?.[0]?.text || ''
              }
              break
              
            case 'subNotaLink':
              // Handle standalone subNotaLink blocks (if they ever come as direct nodes)
              blockData.type = 'subNotaLink'
              blockData.targetNotaId = node.attrs?.targetNotaId || ''
              blockData.targetNotaTitle = node.attrs?.targetNotaTitle || 'Untitled Nota'
              blockData.displayText = node.attrs?.displayText || node.attrs?.targetNotaTitle || 'Untitled Nota'
              blockData.linkStyle = node.attrs?.linkStyle || 'inline'
              
              // Validate required fields for subNotaLink blocks
              if (!blockData.targetNotaId) {
                logger.warn('subNotaLink block missing targetNotaId, using placeholder')
                blockData.targetNotaId = 'placeholder'
              }
              break
              
            case 'codeBlock':
              blockData.type = 'code'
              blockData.language = node.attrs?.language || 'text'
              blockData.content = node.content?.[0]?.text || ''
              break
              
            case 'mathBlock':
              blockData.type = 'math'
              blockData.latex = node.content?.[0]?.text || ''
              blockData.displayMode = node.attrs?.displayMode || false
              break
            
            case 'math':
              blockData.type = 'math'
              // Some math nodes may carry latex in attrs or content; support both
              blockData.latex = node.attrs?.latex ?? (node.content?.[0]?.text || '')
              blockData.displayMode = node.attrs?.displayMode || false
              break
              
            case 'table':
              blockData.type = 'table'
              blockData.headers = node.content?.[0]?.content?.map((cell: any) => 
                cell.content?.[0]?.text || ''
              ) || []
              blockData.rows = node.content?.slice(1)?.map((row: any) => 
                row.content?.map((cell: any) => 
                  cell.content?.[0]?.text || ''
                ) || []
              ) || []
              break
              
            case 'image':
              blockData.type = 'image'
              blockData.src = node.attrs?.src || ''
              blockData.alt = node.attrs?.alt || ''
              blockData.caption = node.attrs?.title || ''
              break
              
            case 'blockquote':
              blockData.type = 'quote'
              blockData.content = node.content?.[0]?.content?.[0]?.text || ''
              break
              
            case 'bulletList':
            case 'orderedList':
              blockData.type = 'list'
              blockData.listType = node.type === 'orderedList' ? 'ordered' : 'unordered'
              blockData.items = node.content?.map((item: any) => 
                item.content?.[0]?.content?.[0]?.text || ''
              ) || []
              break
              
            case 'horizontalRule':
              blockData.type = 'horizontalRule'
              break
              
            case 'youtube':
              blockData.type = 'youtube'
              blockData.videoId = node.attrs?.videoId || ''
              blockData.title = node.attrs?.title || ''
              break
              
            case 'drawio':
              blockData.type = 'drawio'
              blockData.diagramData = node.attrs?.diagramData || ''
              blockData.width = node.attrs?.width
              blockData.height = node.attrs?.height
              break
              
            case 'citation':
              blockData.type = 'citation'
              blockData.citationKey = node.attrs?.citationKey || ''
              blockData.citationData = node.attrs?.citationData || {}
              break
              
            case 'bibliography':
              blockData.type = 'bibliography'
              blockData.citations = node.attrs?.citations || []
              break
              
            case 'subfigure':
              blockData.type = 'subfigure'
              blockData.images = node.attrs?.images || []
              blockData.layout = node.attrs?.layout || 'horizontal'
              break
              
            case 'notaTable':
              blockData.type = 'notaTable'
              blockData.tableData = node.attrs?.tableData || []
              blockData.columns = node.attrs?.columns || []
              break
              
            case 'aiGeneration':
              blockData.type = 'aiGeneration'
              blockData.prompt = node.attrs?.prompt || ''
              blockData.generatedContent = node.content?.[0]?.text || ''
              blockData.model = node.attrs?.model
              blockData.timestamp = new Date()
              break
              
            case 'executableCodeBlock':
              blockData.type = 'executableCodeBlock'
              blockData.language = node.attrs?.language || 'text'
              blockData.content = node.content?.[0]?.text || ''
              blockData.output = node.attrs?.output
              blockData.sessionId = node.attrs?.sessionId
              blockData.isExecuting = node.attrs?.isExecuting || false
              blockData.executionTime = node.attrs?.executionTime
              blockData.error = node.attrs?.error
              blockData.kernelPreferences = node.attrs?.kernelPreferences
              break
              
            case 'confusionMatrix':
              blockData.type = 'confusionMatrix'
              blockData.matrixData = node.attrs?.matrixData
              blockData.title = node.attrs?.title || 'Confusion Matrix'
              blockData.source = node.attrs?.source || 'upload'
              blockData.filePath = node.attrs?.filePath || ''
              blockData.stats = node.attrs?.stats
              break
              
            case 'theorem':
              blockData.type = 'theorem'
              blockData.title = node.attrs?.title || 'Theorem'
              blockData.content = node.attrs?.content || ''
              blockData.proof = node.attrs?.proof || ''
              blockData.theoremType = node.attrs?.type || 'theorem'
              blockData.number = node.attrs?.number
              blockData.tags = node.attrs?.tags || []
              break
              
            case 'pipeline':
              blockData.type = 'pipeline'
              blockData.title = node.attrs?.title || 'Pipeline'
              blockData.description = node.attrs?.description
              blockData.nodes = node.attrs?.nodes || []
              blockData.edges = node.attrs?.edges || []
              blockData.config = node.attrs?.config
              break
              
            case 'mermaid':
              blockData.type = 'mermaid'
              blockData.content = node.attrs?.content || ''
              blockData.title = node.attrs?.title
              blockData.theme = node.attrs?.theme || 'default'
              blockData.config = node.attrs?.config
              break
              
            case 'subNotaLink':
              blockData.type = 'subNotaLink'
              blockData.targetNotaId = node.attrs?.targetNotaId || ''
              blockData.targetNotaTitle = node.attrs?.targetNotaTitle || 'Untitled Nota'
              blockData.displayText = node.attrs?.displayText || node.attrs?.targetNotaTitle || 'Untitled Nota'
              blockData.linkStyle = node.attrs?.linkStyle || 'inline'
              
              // Validate required fields for subNotaLink blocks
              if (!blockData.targetNotaId) {
                logger.warn('subNotaLink block missing targetNotaId, using placeholder')
                blockData.targetNotaId = 'placeholder'
              }
              break
              
              default:
                // For unknown types, try to extract text content
                blockData.content = node.content?.[0]?.text || `[${node.type} block]`
          }
          
          // Create or update the block
          let compositeId: string
          const existingCompositeId = currentStructure.blockOrder[i]
          const existingBlock = existingCompositeId ? 
            blockStore.getBlock(existingCompositeId) : null
          
          // Sanitize block data to prevent DataCloneError
          const sanitizedBlockData = JSON.parse(JSON.stringify(blockData))
          
          if (existingBlock && existingBlock.type === blockData.type) {
            // Update existing block using composite ID
            await blockStore.updateBlock(existingCompositeId, sanitizedBlockData)
            compositeId = existingCompositeId
          } else {
            // Create new block
            const newBlock = await blockStore.createBlock(sanitizedBlockData)
            compositeId = `${newBlock.type}:${String(newBlock.id)}`
          }
          
          newBlockOrder.push(compositeId)
        }
      }
      
      // Update block structure with new order
      if (JSON.stringify(newBlockOrder) !== JSON.stringify(currentStructure.blockOrder)) {
        currentStructure.blockOrder = newBlockOrder
        currentStructure.version++
        currentStructure.lastModified = new Date()
        await blockStore.saveBlockStructure(currentStructure)
      }
      
      // Update the last saved content
      lastSavedContent.value = tiptapContent
      
      logger.info('Successfully synced Tiptap content to blocks for nota:', notaId, {
        blockCount: newBlockOrder.length,
        blockOrder: newBlockOrder
      })
    } catch (error) {
      logger.error('Failed to sync content to blocks:', error)
      throw error
    }
  }
  
  /**
   * Get blocks as Tiptap content for the editor
   * This converts our blocks back to Tiptap format
   */
  const getTiptapContent = computed(() => {
    if (!blockStructure.value || blocks.value.length === 0) {
      return null
    }
    
    // Use the store's method to get Tiptap content
    return blockStore.getTiptapContent(notaId)
  })
  
  // Use the store's convertBlockToTiptap method
  const convertBlockToTiptap = (block: Block): any => {
    return blockStore.convertBlockToTiptap(block)
  }
  
  /**
   * Insert a new block at a specific position
   * This is called when Tiptap creates new blocks
   */
  const insertBlock = async (blockType: Block['type'], content: any, position: number) => {
    try {
      let blockData: any = {
        type: blockType,
        order: position,
        notaId,
      }

      // Add type-specific properties
      switch (blockType) {
        case 'heading':
          blockData = { ...blockData, content: content, level: 1 }
          break
        case 'text':
          blockData = { ...blockData, content: content }
          break
        case 'code':
          blockData = { ...blockData, content: content, language: 'text' }
          break
        case 'math':
          blockData = { ...blockData, latex: content, displayMode: false }
          break
        case 'table':
          blockData = { ...blockData, headers: [], rows: [] }
          break
        case 'list':
          blockData = { ...blockData, listType: 'unordered', items: [] }
          break
        case 'drawio':
          blockData = { ...blockData, diagramData: content, width: undefined, height: undefined }
          break
        case 'citation':
          blockData = { ...blockData, citationKey: content, citationData: {} }
          break
        case 'bibliography':
          blockData = { ...blockData, citations: [] }
          break
        case 'subfigure':
          blockData = { ...blockData, images: [], layout: 'horizontal' }
          break
        case 'notaTable':
          blockData = { ...blockData, tableData: [], columns: [] }
          break
        case 'aiGeneration':
          blockData = { ...blockData, prompt: content, generatedContent: '', timestamp: new Date() }
          break
        case 'executableCodeBlock':
          blockData = { ...blockData, content: content, language: 'text', output: undefined, sessionId: undefined, isExecuting: false, kernelPreferences: undefined }
          break
        case 'confusionMatrix':
          blockData = { ...blockData, matrixData: undefined, title: 'Confusion Matrix', source: 'upload', filePath: '', stats: undefined }
          break
        case 'theorem':
          blockData = { ...blockData, title: 'Theorem', content: content, proof: '', theoremType: 'theorem', number: undefined, tags: [] }
          break
        case 'pipeline':
          blockData = { ...blockData, title: 'Pipeline', description: undefined, nodes: [], edges: [], config: undefined }
          break
        case 'mermaid':
          blockData = { ...blockData, content: content, title: undefined, theme: 'default', config: undefined }
          break
        case 'subNotaLink':
          blockData = { 
            ...blockData, 
            targetNotaId: 'placeholder', 
            targetNotaTitle: 'Untitled Nota', 
            displayText: 'Untitled Nota', 
            linkStyle: 'inline' 
          }
          break
        default:
          blockData = { ...blockData, content: content }
      }

      const newBlock = await blockStore.createBlock(blockData)
      
      logger.info('Inserted new block:', newBlock.id)
      return newBlock
    } catch (error) {
      logger.error('Failed to insert block:', error)
      throw error
    }
  }
  
  /**
   * Update a specific block
   * This is called when Tiptap updates block content
   */
  const updateBlock = async (blockId: string, updates: Partial<Block>) => {
    try {
      const updatedBlock = await blockStore.updateBlock(blockId, updates)
      logger.info('Updated block:', blockId)
      return updatedBlock
    } catch (error) {
      logger.error('Failed to update block:', error)
      throw error
    }
  }
  
  /**
   * Delete a block
   * This is called when Tiptap deletes blocks
   */
  const deleteBlock = async (blockId: string) => {
    try {
      await blockStore.deleteBlock(blockId)
      logger.info('Deleted block:', blockId)
    } catch (error) {
      logger.error('Failed to delete block:', error)
      throw error
    }
  }
  
  /**
   * Reorder blocks
   * This is called when Tiptap reorders blocks
   */
  const reorderBlocks = async (newOrder: string[]) => {
    try {
      await blockStore.reorderBlocks(notaId, newOrder)
      logger.info('Reordered blocks for nota:', notaId)
    } catch (error) {
      logger.error('Failed to reorder blocks:', error)
      throw error
    }
  }
  
  /**
   * Get block statistics for the nota
   */
  const blockStats = computed(() => {
    const stats = {
      totalBlocks: blocks.value.length,
      blockTypes: {} as Record<string, number>,
      wordCount: 0,
      characterCount: 0
    }
    
    blocks.value.forEach(block => {
      // Count block types
      stats.blockTypes[block.type] = (stats.blockTypes[block.type] || 0) + 1
      
      // Count words and characters
      if ('content' in block && typeof block.content === 'string') {
        const words = block.content.trim().split(/\s+/).filter(word => word.length > 0)
        stats.wordCount += words.length
        stats.characterCount += block.content.length
      }
    })
    
    return stats
  })
  
  return {
    // State
    isInitialized,
    blocks,
    blockStructure,
    
    // Actions
    initializeBlocks,
    syncContentToBlocks,
    insertBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    
    // Computed
    getTiptapContent,
    blockStats
  }
}
