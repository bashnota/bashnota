import { defineStore } from 'pinia'
import { db } from '@/db'
import type { FavoriteBlock } from '@/features/nota/types/nota'
import { nanoid } from 'nanoid'

export const useFavoriteBlocksStore = defineStore('favoriteBlocks', {
  state: () => ({
    blocks: [] as FavoriteBlock[]
  }),

  actions: {
    async addBlock(block: Omit<FavoriteBlock, 'id' | 'createdAt'>) {
      const newBlock: FavoriteBlock = {
        ...block,
        id: nanoid(),
        createdAt: new Date(),
        type: block.type,
        
      }
      await db.favoriteBlocks.add(newBlock)
      this.blocks.push(newBlock)
    },

    async removeBlock(id: string) {
      await db.favoriteBlocks.delete(id)
      this.blocks = this.blocks.filter(block => block.id !== id)
    },

    async loadBlocks() {
      this.blocks = await db.favoriteBlocks.toArray()
    },

    async updateBlock(id: string, updates: Partial<FavoriteBlock>) {
      await db.favoriteBlocks.update(id, updates)
      const index = this.blocks.findIndex(block => block.id === id)
      if (index !== -1) {
        this.blocks[index] = { ...this.blocks[index], ...updates }
      }
    }
  }
})







