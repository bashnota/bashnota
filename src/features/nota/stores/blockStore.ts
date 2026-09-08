import { defineStore } from 'pinia'
import { db } from '@/db'
import { toast } from '@/services/toast'
import { logger } from '@/services/logger'
import type { Block, NotaBlockStructure } from '@/features/nota/types/blocks'
import { ERROR_MESSAGES } from '@/constants/app';
import { restoredProseMirrorEnvelope } from '@/features/nota/services/persistedProseMirrorEnvelope'

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
     * Capture/replace only one nota's in-memory canonical state. Version-history
     * transactions use these to mirror a committed restore, or to undo Pinia
     * mutations when an enclosing Dexie transaction aborts.
     */
    captureNotaMemoryState(notaId: string): { blocks: Block[]; structure?: NotaBlockStructure } {
      const blocks = Array.from(this.blocks.values())
        .filter((block) => block.notaId === notaId)
        .map((block) => {
          const clone = {
            ...JSON.parse(JSON.stringify(block)),
            createdAt: new Date(block.createdAt),
            updatedAt: new Date(block.updatedAt),
          } as Block
          if (clone.type === 'aiGeneration') clone.timestamp = new Date(clone.timestamp)
          return clone
        })
      const current = this.blockStructures.get(notaId)
      const structure = current
        ? {
            ...current,
            blockOrder: [...current.blockOrder],
            lastModified: new Date(current.lastModified),
          }
        : undefined
      return { blocks, structure }
    },

    replaceNotaMemoryState(
      notaId: string,
      state: { blocks: Block[]; structure?: NotaBlockStructure },
    ): void {
      for (const [id, block] of this.blocks.entries()) {
        if (block.notaId === notaId) this.blocks.delete(id)
      }
      for (const block of state.blocks) {
        if (block.id != null) this.blocks.set(toCompositeId(block as Block & { id: string | number }), block)
      }
      if (state.structure) {
        this.blockStructures.set(notaId, state.structure)
      } else {
        this.blockStructures.delete(notaId)
      }
    },

    /**
     * Atomically replace the complete canonical content for one nota. Converted
     * rows are prepared before entry; the transaction removes every displaced
     * or trailing typed row and writes one matching structure. Pinia is swapped
     * only after commit and restored to its exact prior state on any failure.
     */
    async replaceNotaContent(
      notaId: string,
      convertedBlocks: Array<Omit<Block, 'id' | 'createdAt' | 'updatedAt' | 'version'>>,
      alreadyValidated = false,
    ): Promise<void> {
      if (!alreadyValidated) {
        const { restoredProseMirrorNode } = await import('@/features/editor/pm/persistedBlockConversion')
        // Keep schema validation entirely outside the transaction so no delete or
        // insert can precede discovery of a corrupt versioned payload.
        for (const block of convertedBlocks) {
          if (block.proseMirrorNode) {
            restoredProseMirrorNode({
              ...block,
              createdAt: new Date(0),
              updatedAt: new Date(0),
              version: 1,
            } as Block)
          }
        }
      }
      const memoryBefore = this.captureNotaMemoryState(notaId)
      const currentStructure = memoryBefore.structure
      const orderedBefore = (currentStructure?.blockOrder ?? [])
        .map((compositeId) => this.blocks.get(compositeId))
        .filter((block): block is Block => block !== undefined)
      const now = new Date()

      try {
        const committed = await db.transaction('rw', db.tables, async () => {
          await db.deleteAllBlocksForNota(notaId)

          const blocks: Block[] = []
          const blockOrder: string[] = []
          for (const [index, blockData] of convertedBlocks.entries()) {
            const previous = orderedBefore[index]
            const mayReuseKey = previous?.type === blockData.type && previous.id != null
            const block = {
              ...(mayReuseKey ? previous : {}),
              ...blockData,
              ...(mayReuseKey ? { id: previous.id } : {}),
              createdAt: mayReuseKey ? previous.createdAt : now,
              updatedAt: now,
              version: mayReuseKey ? previous.version + 1 : 1,
            } as Block
            const savedId = await db.saveBlock(block)
            const saved = { ...block, id: savedId } as Block
            blocks.push(saved)
            blockOrder.push(toCompositeId(saved as Block & { id: string | number }))
          }

          // Defensive cleanup also removes duplicate legacy structures for the
          // same nota. Reusing the canonical key retains external references.
          await db.blockStructures.where('notaId').equals(notaId).delete()
          const structure: NotaBlockStructure = {
            ...(currentStructure?.id != null ? { id: currentStructure.id } : {}),
            notaId,
            blockOrder,
            version: (currentStructure?.version ?? 0) + 1,
            lastModified: now,
          }
          await this.saveBlockStructure(structure)
          return { blocks, structure }
        })

        this.replaceNotaMemoryState(notaId, committed)
      } catch (error) {
        this.replaceNotaMemoryState(notaId, memoryBefore)
        throw error
      }
    },

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

      if (structure.id != null) {
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

      // notaId is an index, not the primary key. Replace every legacy duplicate
      // together with the canonical row so a stale structure can never be
      // selected by a later reload. Dexie nests this transaction in an existing
      // compatible mutation transaction when the caller already owns one.
      await db.transaction('rw', [db.blockStructures], async () => {
        await db.blockStructures.where('notaId').equals(structure.notaId).delete()
        if (structure.id != null) {
          await db.blockStructures.put(sanitizedSerialized)
          logger.info('Updated existing block structure:', structure.id)
        } else {
          const savedStructure = await db.blockStructures.add(sanitizedSerialized)
          structure.id = savedStructure
          logger.info('Created new block structure:', savedStructure)
        }
      })
    },

    /**
     * Create a new block
     */
    async createBlock(blockData: Omit<Block, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Block> {
      try {
        const { restoredProseMirrorNode } = await import('@/features/editor/pm/persistedBlockConversion')
        if (blockData.proseMirrorNode) {
          restoredProseMirrorNode({
            ...blockData,
            createdAt: new Date(0),
            updatedAt: new Date(0),
            version: 1,
          } as Block)
        }
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

        const currentStructure = this.blockStructures.get(blockData.notaId)
        const nextStructure: NotaBlockStructure = currentStructure
          ? {
              ...currentStructure,
              blockOrder: [...currentStructure.blockOrder],
              version: currentStructure.version + 1,
              lastModified: new Date(),
            }
          : {
              notaId: blockData.notaId,
              blockOrder: [],
              version: 1,
              lastModified: new Date(),
            }
        const block = {
          ...blockData,
          order: nextStructure.blockOrder.length,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        } as Block

        const blockTable = db.getBlockTable(block.type)
        const savedBlock = await db.transaction('rw', [blockTable, db.blockStructures], async () => {
          const savedBlockId = await db.saveBlock(block)
          const saved = { ...block, id: savedBlockId } as Block
          nextStructure.blockOrder.push(toCompositeId(saved as Block & { id: string | number }))
          await this.saveBlockStructure(nextStructure)
          return saved
        })
        const compositeId = toCompositeId(savedBlock as Block & { id: string | number })

        // Pinia mirrors only committed rows.
        this.blocks.set(compositeId, savedBlock)
        this.blockStructures.set(block.notaId, nextStructure)

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
        const { restoredProseMirrorNode } = await import('@/features/editor/pm/persistedBlockConversion')
        const block = this.blocks.get(compositeId)
        if (!block) {
          throw new Error('Block not found')
        }

        const structure = this.blockStructures.get(block.notaId)
        if (!structure) throw new Error('Block structure not found')

        const updatedBlock = {
          ...block,
          ...updates,
          // Identity and canonical position are changed only by their dedicated
          // create/delete/reorder operations.
          id: block.id,
          type: block.type,
          notaId: block.notaId,
          order: block.order,
          updatedAt: new Date(),
          version: block.version + 1,
        } as Block
        if (updatedBlock.proseMirrorNode) restoredProseMirrorNode(updatedBlock)

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

        const nextStructure: NotaBlockStructure = {
          ...structure,
          blockOrder: [...structure.blockOrder],
          version: structure.version + 1,
          lastModified: new Date(),
        }
        const blockTable = db.getBlockTable(block.type)

        await db.transaction('rw', [blockTable, db.blockStructures], async () => {
          await db.saveBlock(updatedBlock)
          await this.saveBlockStructure(nextStructure)
        })

        // Pinia mirrors only committed rows.
        this.blocks.set(compositeId, updatedBlock)
        this.blockStructures.set(block.notaId, nextStructure)

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
        if (block.id == null) {
          throw new Error('Cannot delete a block without a database key')
        }
        const blockId = block.id

        const structure = this.blockStructures.get(block.notaId)
        const nextStructure = structure
          ? {
              ...structure,
              blockOrder: structure.blockOrder.filter(id => id !== compositeId),
              version: structure.version + 1,
              lastModified: new Date(),
            }
          : undefined
        const blockTable = db.getBlockTable(block.type)

        // The typed row and its canonical order are one persistence change.
        // Keep Pinia untouched until Dexie confirms that both writes committed.
        await db.transaction('rw', [blockTable, db.blockStructures], async () => {
          await db.deleteBlock(blockId, block.type)
          if (nextStructure) await this.saveBlockStructure(nextStructure)
        })

        this.blocks.delete(compositeId)
        if (nextStructure) {
          this.blockStructures.set(block.notaId, nextStructure)
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
        if (
          newOrder.length !== structure.blockOrder.length
          || new Set(newOrder).size !== newOrder.length
          || structure.blockOrder.some(compositeId => !newOrder.includes(compositeId))
        ) {
          throw new Error('New block order must contain every existing block exactly once')
        }

        const nextBlocks = newOrder.map((compositeId, index) => {
          const block = this.blocks.get(compositeId)
          if (!block || block.notaId !== notaId) throw new Error(`Block ${compositeId} was not found`)
          return [compositeId, {
            ...block,
            order: index,
            updatedAt: new Date(),
            version: block.version + 1,
          }] as const
        })
        const nextStructure: NotaBlockStructure = {
          ...structure,
          blockOrder: [...newOrder],
          version: structure.version + 1,
          lastModified: new Date(),
        }

        await db.transaction('rw', db.tables, async () => {
          for (const [, block] of nextBlocks) await db.saveBlock(block)
          await this.saveBlockStructure(nextStructure)
        })

        for (const [compositeId, block] of nextBlocks) this.blocks.set(compositeId, block)
        this.blockStructures.set(notaId, nextStructure)

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

        const structures = await db.blockStructures.where('notaId').equals(notaId).toArray()
        const requestedId = nota?.blockStructureId
        structures.sort((left, right) => {
          const versionDifference = Number(right.version ?? 0) - Number(left.version ?? 0)
          if (versionDifference !== 0) return versionDifference
          const modifiedDifference = new Date(right.lastModified).getTime() - new Date(left.lastModified).getTime()
          if (modifiedDifference !== 0) return modifiedDifference
          if (requestedId != null) {
            if (left.id === requestedId) return -1
            if (right.id === requestedId) return 1
          }
          return String(right.id ?? '').localeCompare(String(left.id ?? ''))
        })
        structureFromDb = structures[0] ?? null
        logger.info('Loaded canonical block structure from DB by notaId:', structureFromDb)

        let structure: NotaBlockStructure
        if (structureFromDb) {
          structure = this.deserializeBlockStructure(structureFromDb)
          if (structures.length > 1) await this.saveBlockStructure(structure)
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

        // Replace only this nota's cached rows. Clearing the entire map here
        // made a fresh multi-nota reload discard every nota loaded earlier.
        for (const [compositeId, cachedBlock] of this.blocks.entries()) {
          if (cachedBlock.notaId === notaId) this.blocks.delete(compositeId)
        }
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
            .filter((block) => block.notaId === notaId)
            .sort((a, b) => a.order - b.order)
          structure.blockOrder = sortedBlocks.map(b => toCompositeId(b as any))
          structure.version++
          structure.lastModified = new Date()
          await this.saveBlockStructure(structure)
        }

        // Ensure blockOrder is populated even if migration wasn't needed
        const notaBlocks = Array.from(this.blocks.values()).filter((block) => block.notaId === notaId)
        if (structure.blockOrder.length === 0 && notaBlocks.length > 0) {
          logger.info('BlockOrder is empty but blocks exist, rebuilding order for nota:', notaId)
          const sortedBlocks = notaBlocks.sort((a, b) => a.order - b.order)
          structure.blockOrder = sortedBlocks.map(b => toCompositeId(b as any))
          structure.version++
          structure.lastModified = new Date()
          await this.saveBlockStructure(structure)
        }

        // Log the final structure for debugging
        logger.info('Final block structure for nota:', notaId, {
          blockOrderLength: structure.blockOrder.length,
          blocksCount: this.blocks.size,
          blockOrder: structure.blockOrder.slice(0, 5) // Show first 5 for debugging
        })

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
     * Note: We don't create a title heading block since the title is displayed separately in the UI
     */
    async initializeNotaBlocks(notaId: string, title: string): Promise<void> {
      try {
        // Create an empty structure without a title heading block
        // The title is displayed separately in the NotaEditor UI above the editor content
        const structure: NotaBlockStructure = {
          notaId,
          blockOrder: [], // Start with empty content
          version: 1,
          lastModified: new Date(),
        }

        await this.saveBlockStructure(structure)

        // Add to memory
        this.blockStructures.set(notaId, structure)

        logger.info('Initialized empty block structure for new nota:', notaId)
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
        await db.transaction('rw', db.tables, async () => {
          await db.deleteAllBlocksForNota(notaId)
          await db.blockStructures.where('notaId').equals(notaId).delete()
        })

        for (const [compositeId, block] of this.blocks.entries()) {
          if (block.notaId === notaId) this.blocks.delete(compositeId)
        }
        this.blockStructures.delete(notaId)

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
      logger.info('getTiptapContent called for nota:', notaId, {
        hasStructure: !!structure,
        blockOrderLength: structure?.blockOrder?.length || 0,
        blocksSize: this.blocks.size
      })

      // Fallback: if blockOrder is empty but blocks exist, try to rebuild the order
      if (structure && structure.blockOrder.length === 0 && this.blocks.size > 0) {
        logger.info('BlockOrder is empty but blocks exist, attempting to rebuild order for nota:', notaId)
        try {
          // Get all blocks for this nota and sort them by order
          const allBlocks = Array.from(this.blocks.values())
            .filter(block => block.notaId === notaId)
            .sort((a, b) => a.order - b.order)

          if (allBlocks.length > 0) {
            // Rebuild the blockOrder
            structure.blockOrder = allBlocks.map(block => toCompositeId(block as any))
            structure.version++
            structure.lastModified = new Date()

            // Save the updated structure
            this.saveBlockStructure(structure)

            logger.info('Successfully rebuilt blockOrder for nota:', notaId, {
              newBlockOrderLength: structure.blockOrder.length,
              blockTypes: allBlocks.map(b => b.type)
            })
          }
        } catch (error) {
          logger.error('Failed to rebuild blockOrder for nota:', notaId, error)
        }
      }

      if (!structure || structure.blockOrder.length === 0) {
        logger.info('Using a canonical empty document for nota without blocks:', notaId)
        return { type: 'doc', content: [] }
      }

      const blocks = structure.blockOrder
        .map(cid => this.blocks.get(cid))
        .filter((block): block is Block => block !== undefined)
        .sort((a, b) => a.order - b.order)

      logger.info('Converted blocks for Tiptap:', {
        requestedBlocks: structure.blockOrder.length,
        foundBlocks: blocks.length,
        blockTypes: blocks.map(b => b.type)
      })

      if (blocks.length === 0) {
        logger.warn('No blocks found after conversion for nota:', notaId)
        return { type: 'doc', content: [] }
      }

      const content = {
        type: 'doc',
        content: blocks.map(block => this.convertBlockToTiptap(block))
      }

      logger.info('Generated Tiptap content for nota:', notaId, {
        contentLength: content.content.length,
        firstBlockType: content.content[0]?.type
      })

      return content
    },

    /**
     * Convert a single block to Tiptap format
     */
    convertBlockToTiptap(block: Block): any {
      const restoredNode = restoredProseMirrorEnvelope(block)
      if (restoredNode) return restoredNode

      // Helper function to ensure text content is never empty
      const ensureTextContent = (content: string | undefined | null): string => {
        return typeof content === 'string' && content.length > 0 ? content : ' '
      }

      switch (block.type) {
        case 'heading':
          return {
            type: 'heading',
            attrs: { level: (block as any).level || 1 },
            content: [{ type: 'text', text: ensureTextContent((block as any).content) }]
          }

        case 'text':
          const content = (block as any).content
          if (Array.isArray(content)) {
            return {
              type: 'paragraph',
              content: content
            }
          }
          return {
            type: 'paragraph',
            content: [{ type: 'text', text: ensureTextContent(content) }]
          }

        case 'code':
          return {
            type: 'codeBlock',
            attrs: {
              language: (block as any).language || 'text',
              output: (block as any).output ?? null,
              sessionId: (block as any).sessionId ?? null,
              isExecuting: (block as any).isExecuting || false,
              executionTime: (block as any).executionTime ?? null,
              error: (block as any).error ?? null,
            },
            content: [{ type: 'text', text: ensureTextContent((block as any).content) }]
          }

        case 'math':
          return {
            type: 'math',
            attrs: {
              displayMode: (block as any).displayMode || false,
              latex: (block as any).latex || ''
            }
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
                  content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: ensureTextContent(header) }]
                  }]
                })) || []
              },
              // Data rows
              ...((block as any).rows?.map((row: string[]) => ({
                type: 'tableRow',
                content: row.map((cell: string) => ({
                  type: 'tableCell',
                  content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: ensureTextContent(cell) }]
                  }]
                }))
              })) || [])
            ]
          }

        case 'image':
          return {
            type: 'paragraph',
            content: [{
              type: 'image',
              attrs: {
                src: (block as any).src || '',
                alt: (block as any).alt || '',
                title: (block as any).caption || ''
              }
            }]
          }

        case 'quote':
          return {
            type: 'blockquote',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: ensureTextContent((block as any).content) }] }]
          }

        case 'list':
          const isTaskList = (block as any).listType === 'task'
          const listType = (block as any).listType === 'ordered'
            ? 'orderedList'
            : isTaskList ? 'taskList' : 'bulletList'
          return {
            type: listType,
            content: ((block as any).items || []).map((item: string, index: number) => ({
              type: isTaskList ? 'taskItem' : 'listItem',
              ...(isTaskList ? { attrs: { checked: (block as any).checked?.[index] === true } } : {}),
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
            type: 'paragraph',
            content: [{
              type: 'citation',
              attrs: {
                citationKey: (block as any).citationKey || '',
                citationData: (block as any).citationData || {}
              }
            }]
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
              subfigures: (block as any).images || [],
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
          throw new Error(`Cannot convert unsupported persisted block type: ${(block as any).type || 'unknown'}`)
      }
    },

    /**
     * Import TipTap JSON content into blocks for a nota (used by .nota import)
     */
    async importTiptapContent(notaId: string, tiptapContent: any): Promise<void> {
      try {
        const { persistedBlockDataFromDocument } = await import('@/features/editor/pm/persistedBlockConversion')
        // Conversion is intentionally complete before structure creation or any
        // block insert. Unsupported input therefore leaves prior state intact.
        const convertedBlocks = persistedBlockDataFromDocument(tiptapContent, notaId)

        await this.replaceNotaContent(notaId, convertedBlocks)
      } catch (error) {
        logger.error('Failed to import TipTap content into blocks:', error)
        throw error
      }
    }
  },
})
