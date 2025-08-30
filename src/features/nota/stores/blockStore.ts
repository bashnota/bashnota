import { defineStore } from 'pinia'
import { db } from '@/db'
import { toast } from 'vue-sonner'
import { logger } from '@/services/logger'
import type { Block, NotaBlockStructure } from '@/features/nota/types/blocks'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/constants/app'
import type { HeadingBlock } from '@/features/nota/types/blocks'

// Helper utilities for globally unique block identifiers
function toCompositeId(block: { id: any; type: string }): string {
  return `${block.type}:${String(block.id)}`
}
function parseCompositeId(compositeId: string): { type: string; id: string } {
  const [type, ...rest] = compositeId.split(':')
  return { type, id: rest.join(':') }
}
function isCompositeId(value: any): value is string {
  return typeof value === 'string' && value.includes(':')
}

export const useBlockStore = defineStore('blocks', {
  state: () => ({
    blocks: new Map<string, Block>(),
    blockStructures: new Map<string, NotaBlockStructure>(),
    loading: false,
    error: null as string | null,
  }),

  getters: {
    /**
     * Get all blocks for a specific nota
     */
    getNotaBlocks: (state) => (notaId: string): Block[] => {
      const structure = state.blockStructures.get(notaId)
      if (!structure) {
        logger.info('No block structure found for nota:', notaId)
        return []
      }
      
      logger.info('Getting blocks for structure:', structure)
      
      const blocks = structure.blockOrder
        .map(compositeId => {
          const block = state.blocks.get(compositeId)
          logger.info('Block lookup:', compositeId, block ? 'found' : 'not found')
          if (block && block.type === 'subNotaLink') {
            logger.info('Found subNotaLink block in getNotaBlocks:', compositeId, block)
          }
          return block
        })
        .filter((block): block is Block => block !== undefined)
        .sort((a, b) => a.order - b.order)
      
      logger.info('Returning blocks:', blocks.length, blocks.map(b => ({ id: b.id, type: b.type, order: b.order })))
      return blocks
    },

    /**
     * Get a specific block by composite ID
     */
    getBlock: (state) => (compositeId: string): Block | undefined => {
      return state.blocks.get(compositeId)
    },

    /**
     * Get block structure for a nota
     */
    getBlockStructure: (state) => (notaId: string): NotaBlockStructure | undefined => {
      return state.blockStructures.get(notaId)
    },

    /**
     * Get the next order number for a new block in a nota
     */
    getNextBlockOrder: (state) => (notaId: string): number => {
      const structure = state.blockStructures.get(notaId)
      if (!structure || structure.blockOrder.length === 0) return 0
      
      const maxOrder = Math.max(...structure.blockOrder.map(cid => {
        const block = state.blocks.get(cid)
        return block?.order || 0
      }))
      
      return maxOrder + 1
    },
  },

  actions: {
    /**
     * Helper function to serialize block structure for database storage
     */
    serializeBlockStructure(structure: NotaBlockStructure) {
      const serialized: any = {
        notaId: structure.notaId,
        blockOrder: structure.blockOrder,
        version: structure.version,
        lastModified: structure.lastModified.toISOString(),
      }
      
      if (structure.id) {
        serialized.id = structure.id
      }
      
      return serialized
    },

    /**
     * Helper function to deserialize block structure from database storage
     */
    deserializeBlockStructure(dbStructure: any): NotaBlockStructure {
      return {
        id: dbStructure.id,
        notaId: dbStructure.notaId,
        blockOrder: dbStructure.blockOrder,
        version: dbStructure.version,
        lastModified: new Date(dbStructure.lastModified),
      }
    },

    /**
     * Helper function to save block structure to database (add for new, put for updates)
     */
    async saveBlockStructure(structure: NotaBlockStructure): Promise<void> {
      const serialized = this.serializeBlockStructure(structure)
      logger.info('Saving block structure:', serialized)
      
      const sanitizedSerialized = JSON.parse(JSON.stringify(serialized))
      logger.info('Sanitized block structure:', sanitizedSerialized)
      
      if (structure.id) {
        await db.blockStructures.put(sanitizedSerialized)
        logger.info('Updated existing block structure:', structure.id)
      } else {
        const savedStructure = await db.blockStructures.add(sanitizedSerialized)
        structure.id = savedStructure
        logger.info('Created new block structure:', savedStructure)
      }
    },

    /**
     * Create a new block
     */
    async createBlock(blockData: Omit<Block, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Block> {
      try {
        // Validate subNotaLink blocks have required fields
        if (blockData.type === 'subNotaLink') {
          const subNotaLinkData = blockData as any
          if (!subNotaLinkData.targetNotaId || subNotaLinkData.targetNotaId === 'placeholder') {
            logger.warn('subNotaLink block created with placeholder targetNotaId')
          }
          if (!subNotaLinkData.targetNotaTitle) {
            logger.warn('subNotaLink block missing targetNotaTitle')
          }
        }
        
        const block = {
          ...blockData,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        } as Block

        // Save to database first to get the auto-generated numeric ID per-table
        const savedBlockId = await db.saveBlock(block)
        
        // Update the block with the generated ID
        const savedBlock = { ...block, id: savedBlockId } as Block
        const compositeId = toCompositeId({ id: (savedBlock as any).id, type: (savedBlock as any).type })

        // Add to memory with composite key
        this.blocks.set(compositeId, savedBlock)

        // Update block structure (only metadata, not full blocks)
        const structure = this.blockStructures.get(block.notaId)
        if (structure) {
          structure.blockOrder.push(compositeId)
          structure.version++
          structure.lastModified = new Date()
        }

        if (structure) {
          await this.saveBlockStructure(structure)
        }

        logger.info('Block created successfully:', compositeId)
        return savedBlock
      } catch (error) {
        logger.error('Failed to create block:', error)
        toast(ERROR_MESSAGES.blocks?.createFailed || 'Failed to create block')
        throw error
      }
    },

    /**
     * Update an existing block
     */
    async updateBlock(compositeId: string, updates: Partial<Block>): Promise<Block | null> {
      try {
        const block = this.blocks.get(compositeId)
        if (!block) {
          throw new Error('Block not found')
        }

        const updatedBlock = {
          ...block,
          ...updates,
          updatedAt: new Date(),
          version: block.version + 1,
        } as Block

        // Validate subNotaLink blocks after update
        if (updatedBlock.type === 'subNotaLink') {
          const subNotaLinkBlock = updatedBlock as any
          if (!subNotaLinkBlock.targetNotaId || subNotaLinkBlock.targetNotaId === 'placeholder') {
            logger.warn('subNotaLink block updated with invalid targetNotaId')
          }
          if (!subNotaLinkBlock.targetNotaTitle) {
            logger.warn('subNotaLink block updated with missing targetNotaTitle')
          }
        }

        // Update in memory
        this.blocks.set(compositeId, updatedBlock)

        // Update block structure metadata
        const structure = this.blockStructures.get(block.notaId)
        if (structure) {
          structure.version++
          structure.lastModified = new Date()
        }

        // Save to database (uses per-table numeric id)
        await db.saveBlock(updatedBlock)
        if (structure) {
          await this.saveBlockStructure(structure)
        }

        logger.info('Block updated successfully:', compositeId)
        return updatedBlock
      } catch (error) {
        logger.error('Failed to update block:', error)
        toast(ERROR_MESSAGES.blocks?.updateFailed || 'Failed to update block')
        throw error
      }
    },

    /**
     * Delete a block
     */
    async deleteBlock(compositeId: string): Promise<boolean> {
      try {
        const block = this.blocks.get(compositeId)
        if (!block) {
          throw new Error('Block not found')
        }

        // Remove from memory
        this.blocks.delete(compositeId)

        // Update block structure
        const structure = this.blockStructures.get(block.notaId)
        if (structure) {
          structure.blockOrder = structure.blockOrder.filter(id => id !== compositeId)
          structure.version++
          structure.lastModified = new Date()
        }

        // Remove from database using per-table id
        await db.deleteBlock(String(block.id), block.type)
        if (structure) {
          await this.saveBlockStructure(structure)
        }

        logger.info('Block deleted successfully:', compositeId)
        return true
      } catch (error) {
        logger.error('Failed to delete block:', error)
        toast(ERROR_MESSAGES.blocks?.deleteFailed || 'Failed to delete block')
        throw error
      }
    },

    /**
     * Reorder blocks in a nota
     */
    async reorderBlocks(notaId: string, newOrder: string[]): Promise<boolean> {
      try {
        const structure = this.blockStructures.get(notaId)
        if (!structure) {
          throw new Error('Block structure not found')
        }

        // Update order in memory
        structure.blockOrder = newOrder
        structure.version++
        structure.lastModified = new Date()

        // Update block order numbers
        newOrder.forEach((compositeId, index) => {
          const block = this.blocks.get(compositeId)
          if (block) {
            block.order = index
            this.blocks.set(compositeId, block)
          }
        })

        await this.saveBlockStructure(structure)

        logger.info('Blocks reordered successfully for nota:', notaId)
        return true
      } catch (error) {
        logger.error('Failed to reorder blocks:', error)
        toast(ERROR_MESSAGES.blocks?.reorderFailed || 'Failed to reorder blocks')
        throw error
      }
    },

    /**
     * Load all blocks for a nota
     */
    async loadNotaBlocks(notaId: string, nota?: any): Promise<Block[]> {
      try {
        // If already loaded, return current
        if (this.blockStructures.has(notaId)) {
          logger.info('Blocks already loaded for nota:', notaId)
          return this.getNotaBlocks(notaId)
        }

        let structureFromDb: any | null = null

        if (nota?.blockStructureId) {
          structureFromDb = await db.blockStructures.get(nota.blockStructureId)
          logger.info('Loaded block structure from DB by ID:', structureFromDb)
        } else {
          const structures = await db.blockStructures.where('notaId').equals(notaId).toArray()
          structureFromDb = structures[0]
          logger.info('Loaded block structure from DB by notaId:', structureFromDb)
        }

        let structure: NotaBlockStructure
        if (structureFromDb) {
          structure = this.deserializeBlockStructure(structureFromDb)
        } else {
          // Create empty structure for new nota
          structure = {
            notaId,
            blockOrder: [],
            version: 1,
            lastModified: new Date(),
          }
        }
        
        // Load individual blocks from all block tables
        const blocks = await db.getAllBlocksForNota(notaId)
        logger.info('Loaded blocks from DB:', blocks)
        
        // Log subNotaLink blocks specifically
        const subNotaLinkBlocks = blocks.filter(block => block.type === 'subNotaLink')
        if (subNotaLinkBlocks.length > 0) {
          logger.info('Found subNotaLink blocks in DB:', subNotaLinkBlocks)
        } else {
          logger.info('No subNotaLink blocks found in DB for nota:', notaId)
        }
        
        // Index blocks in memory by composite id
        this.blocks.clear()
        for (const block of blocks) {
          if (block.id != null && block.type) {
            const compositeId = toCompositeId(block as any)
            this.blocks.set(compositeId, block as Block)
          }
        }

        // Migration: if blockOrder entries are not composite, rebuild in correct order
        const needsMigration = structure.blockOrder.some(id => !isCompositeId(id))
        if (needsMigration) {
          logger.info('Migrating blockOrder to composite IDs for nota:', notaId)
          const sortedBlocks = Array.from(this.blocks.entries())
            .map(([cid, b]) => b)
            .sort((a, b) => a.order - b.order)
          structure.blockOrder = sortedBlocks.map(b => toCompositeId(b as any))
          structure.version++
          structure.lastModified = new Date()
          await this.saveBlockStructure(structure)
        }

        this.blockStructures.set(notaId, structure)

        const result = this.getNotaBlocks(notaId)
        logger.info('Final loaded blocks for nota:', notaId, result.length)
        return result
      } catch (error) {
        logger.error('Failed to load nota blocks:', error)
        throw error
      }
    },

    /**
     * Create initial block structure for a new nota
     */
    async initializeNotaBlocks(notaId: string, title: string): Promise<void> {
      try {
        const titleBlock: Omit<HeadingBlock, 'id'> = {
          type: 'heading',
          order: 0,
          notaId,
          content: title,
          level: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        }

        const savedBlockId = await db.saveBlock(titleBlock)
        const savedTitleBlock = { ...titleBlock, id: savedBlockId } as HeadingBlock
        const structure: NotaBlockStructure = {
          notaId,
          blockOrder: [toCompositeId({ id: (savedTitleBlock as any).id, type: (savedTitleBlock as any).type })],
          version: 1,
          lastModified: new Date(),
        }
        
        await this.saveBlockStructure(structure)

        // Add to memory
        this.blocks.set(toCompositeId({ id: (savedTitleBlock as any).id, type: (savedTitleBlock as any).type }), savedTitleBlock as unknown as Block)
        this.blockStructures.set(notaId, structure)

        logger.info('Initialized blocks for new nota:', notaId)
      } catch (error) {
        logger.error('Failed to initialize nota blocks:', error)
        throw error
      }
    },

    /**
     * Clear all blocks for a nota (when deleting nota)
     */
    async clearNotaBlocks(notaId: string): Promise<void> {
      try {
        const structure = this.blockStructures.get(notaId)
        if (!structure) return

        for (const compositeId of structure.blockOrder) {
          this.blocks.delete(compositeId)
        }
        this.blockStructures.delete(notaId)

        await db.deleteAllBlocksForNota(notaId)
        await db.blockStructures.delete(notaId)

        logger.info('Cleared blocks for nota:', notaId)
      } catch (error) {
        logger.error('Failed to clear nota blocks:', error)
        throw error
      }
    },

    /**
     * Get Tiptap content as an object (for the editor)
     */
    getTiptapContent(notaId: string): any | null {
      const structure = this.blockStructures.get(notaId)
      if (!structure || structure.blockOrder.length === 0) {
        return null
      }
      
      const blocks = structure.blockOrder
        .map(cid => this.blocks.get(cid))
        .filter((block): block is Block => block !== undefined)
        .sort((a, b) => a.order - b.order)
      
      if (blocks.length === 0) {
        return null
      }
      
      const content = {
        type: 'doc',
        content: blocks.map(block => this.convertBlockToTiptap(block))
      }
      
      return content
    },

    /**
     * Convert a single block to Tiptap format
     */
    convertBlockToTiptap(block: Block): any {
      // Helper function to ensure text content is never empty
      const ensureTextContent = (content: string | undefined | null): string => {
        return content && content.trim() ? content.trim() : ' '
      }

      switch (block.type) {
        case 'heading':
          return {
            type: 'heading',
            attrs: { level: (block as any).level || 1 },
            content: [{ type: 'text', text: ensureTextContent((block as any).content) }]
          }
        
        case 'text':
          return {
            type: 'paragraph',
            content: [{ type: 'text', text: ensureTextContent((block as any).content) }]
          }
        
        case 'code':
          return {
            type: 'codeBlock',
            attrs: { language: (block as any).language || 'text' },
            content: [{ type: 'text', text: ensureTextContent((block as any).content) }]
          }
        
        case 'math':
          return {
            type: 'math',
            attrs: { 
              displayMode: (block as any).displayMode || false,
              latex: (block as any).latex || ''
            },
            content: [{ type: 'text', text: ensureTextContent((block as any).latex) }]
          }
        
        case 'table':
          return {
            type: 'table',
            content: [
              // Header row
              {
                type: 'tableRow',
                content: (block as any).headers?.map((header: string) => ({
                  type: 'tableHeader',
                  content: [{ type: 'text', text: ensureTextContent(header) }]
                })) || []
              },
              // Data rows
              ...((block as any).rows?.map((row: string[]) => ({
                type: 'tableRow',
                content: row.map((cell: string) => ({
                  type: 'tableCell',
                  content: [{ type: 'text', text: ensureTextContent(cell) }]
                }))
              })) || [])
            ]
          }
        
        case 'image':
          return {
            type: 'image',
            attrs: {
              src: (block as any).src || '',
              alt: (block as any).alt || '',
              title: (block as any).caption || ''
            }
          }
        
        case 'quote':
          return {
            type: 'blockquote',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: ensureTextContent((block as any).content) }] }]
          }
        
        case 'list':
          const listType = (block as any).listType === 'ordered' ? 'orderedList' : 'bulletList'
          return {
            type: listType,
            content: ((block as any).items || []).map((item: string) => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: ensureTextContent(item) }] }]
            }))
          }
        
        case 'horizontalRule':
          return { type: 'horizontalRule' }
        
        case 'youtube':
          return {
            type: 'youtube',
            attrs: { 
              videoId: (block as any).videoId || '', 
              title: (block as any).title || '' 
            }
          }
        
        case 'drawio':
          return {
            type: 'drawio',
            attrs: { 
              diagramData: (block as any).diagramData || '',
              width: (block as any).width,
              height: (block as any).height
            }
          }
        
        case 'citation':
          return {
            type: 'citation',
            attrs: { 
              citationKey: (block as any).citationKey || '',
              citationData: (block as any).citationData || {}
            }
          }
        
        case 'bibliography':
          return {
            type: 'bibliography',
            attrs: { citations: (block as any).citations || [] }
          }
        
        case 'subfigure':
          return {
            type: 'subfigure',
            attrs: { 
              images: (block as any).images || [],
              layout: (block as any).layout || 'horizontal'
            }
          }
        
        case 'notaTable':
          return {
            type: 'notaTable',
            attrs: { 
              tableData: (block as any).tableData || [],
              columns: (block as any).columns || []
            }
          }
        
        case 'aiGeneration':
          return {
            type: 'aiGeneration',
            attrs: { 
              prompt: (block as any).prompt || '',
              model: (block as any).model || '',
              timestamp: (block as any).timestamp
            },
            content: [{ type: 'text', text: ensureTextContent((block as any).generatedContent) }]
          }
        
        case 'executableCodeBlock':
          return {
            type: 'executableCodeBlock',
            attrs: { 
              language: (block as any).language || 'text',
              output: (block as any).output,
              sessionId: (block as any).sessionId,
              isExecuting: (block as any).isExecuting || false,
              executionTime: (block as any).executionTime,
              error: (block as any).error,
              kernelPreferences: (block as any).kernelPreferences
            },
            content: [{ type: 'text', text: ensureTextContent((block as any).content) }]
          }
        
        case 'confusionMatrix':
          return {
            type: 'confusionMatrix',
            attrs: { 
              matrixData: (block as any).matrixData,
              title: (block as any).title || 'Confusion Matrix',
              source: (block as any).source || 'upload',
              filePath: (block as any).filePath || '',
              stats: (block as any).stats
            }
          }
        
        case 'theorem':
          return {
            type: 'theorem',
            attrs: { 
              title: (block as any).title || 'Theorem',
              type: (block as any).theoremType || 'theorem',
              number: (block as any).number,
              tags: (block as any).tags || [],
              content: (block as any).content || '',
              proof: (block as any).proof || ''
            }
          }
        
        case 'pipeline':
          return {
            type: 'pipeline',
            attrs: { 
              title: (block as any).title || 'Pipeline',
              description: (block as any).description,
              nodes: (block as any).nodes || [],
              edges: (block as any).edges || [],
              config: (block as any).config
            }
          }
        
        case 'mermaid':
          return {
            type: 'mermaid',
            attrs: { 
              content: (block as any).content || '',
              title: (block as any).title,
              theme: (block as any).theme || 'default',
              config: (block as any).config
            }
          }
        case 'subNotaLink':
          const subNotaLinkBlock = block as any
          return {
            type: 'subNotaLink',
            attrs: {
              targetNotaId: subNotaLinkBlock.targetNotaId || '',
              targetNotaTitle: subNotaLinkBlock.targetNotaTitle || 'Untitled Nota',
              displayText: subNotaLinkBlock.displayText || subNotaLinkBlock.targetNotaTitle || 'Untitled Nota',
              linkStyle: subNotaLinkBlock.linkStyle || 'inline'
            }
          }
        default:
          // Fallback to text block for unknown types
          return {
            type: 'paragraph',
            content: [{ type: 'text', text: `[${(block as any).type || 'unknown'} block]` }]
          }
      }
    },

    /**
     * Import TipTap JSON content into blocks for a nota (used by .nota import)
     */
    async importTiptapContent(notaId: string, tiptapContent: any): Promise<void> {
      try {
        // Ensure structure exists
        let structure = this.blockStructures.get(notaId)
        if (!structure) {
          structure = {
            notaId,
            blockOrder: [],
            version: 1,
            lastModified: new Date(),
          }
          this.blockStructures.set(notaId, structure)
        }

        const newBlockOrder: string[] = []

        if (tiptapContent?.content && Array.isArray(tiptapContent.content)) {
          for (let i = 0; i < tiptapContent.content.length; i++) {
            const node = tiptapContent.content[i]
            const order = i

            let blockData: any = { type: 'text', order, notaId }

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
                  }
                } else {
                  // Regular paragraph
                  blockData.type = 'text'
                  blockData.content = node.content?.[0]?.text || ''
                }
                break
              case 'codeBlock':
                blockData.type = 'code'
                blockData.language = node.attrs?.language || 'text'
                blockData.content = node.content?.[0]?.text || ''
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
              case 'math':
                blockData.type = 'math'
                blockData.latex = node.attrs?.latex ?? (node.content?.[0]?.text || '')
                blockData.displayMode = node.attrs?.displayMode || false
                break
              case 'table':
                blockData.type = 'table'
                blockData.headers = node.content?.[0]?.content?.map((cell: any) => cell.content?.[0]?.text || '') || []
                blockData.rows = node.content?.slice(1)?.map((row: any) => row.content?.map((cell: any) => cell.content?.[0]?.text || '') || []) || []
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
                blockData.items = node.content?.map((item: any) => item.content?.[0]?.content?.[0]?.text || '') || []
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
                // Handle standalone subNotaLink blocks
                blockData.type = 'subNotaLink'
                blockData.targetNotaId = node.attrs?.targetNotaId || ''
                blockData.targetNotaTitle = node.attrs?.targetNotaTitle || 'Untitled Nota'
                blockData.displayText = node.attrs?.displayText || node.attrs?.targetNotaTitle || 'Untitled Nota'
                blockData.linkStyle = node.attrs?.linkStyle || 'inline'
                
                // Validate imported subNotaLink blocks
                if (!blockData.targetNotaId) {
                  logger.warn('Imported subNotaLink block missing targetNotaId')
                }
                break
              default:
                blockData.content = node.content?.[0]?.text || `[${node.type} block]`
            }

            // Create each block fresh (import should overwrite prior state)
            const newBlock = await this.createBlock(JSON.parse(JSON.stringify(blockData)))
            const compositeId = `${newBlock.type}:${String(newBlock.id)}`
            newBlockOrder.push(compositeId)
          }
        }

        // Replace structure order
        structure.blockOrder = newBlockOrder
        structure.version++
        structure.lastModified = new Date()
        await this.saveBlockStructure(structure)
      } catch (error) {
        logger.error('Failed to import TipTap content into blocks:', error)
        throw error
      }
    }
  },
})

