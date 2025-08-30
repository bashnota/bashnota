import Dexie, { type Table } from 'dexie'
import type { Nota } from '@/features/nota/types/nota'
import type { FavoriteBlock } from '@/features/nota/types/nota'
import type { AIConversation } from '@/features/ai/stores/aiConversationStore'
import type { 
  NotaBlockStructure,
  TextBlock,
  HeadingBlock,
  CodeBlock,
  MathBlock,
  TableBlock,
  ImageBlock,
  QuoteBlock,
  ListBlock,
  HorizontalRuleBlock,
  YouTubeBlock,
  DrawIoBlock,
  CitationBlock,
  BibliographyBlock,
  SubfigureBlock,
  NotaTableBlock,
  AIGenerationBlock,
  ExecutableCodeBlock,
  ConfusionMatrixBlock,
  TheoremBlock,
  PipelineBlock,
  MermaidBlock,
  SubNotaLinkBlock
} from '@/features/nota/types/blocks'

export class NotaDB extends Dexie {
  notas!: Table<Nota>
  favoriteBlocks!: Table<FavoriteBlock>
  conversations!: Table<AIConversation>
  
  // Block type-specific tables
  textBlocks!: Table<TextBlock>
  headingBlocks!: Table<HeadingBlock>
  codeBlocks!: Table<CodeBlock>
  mathBlocks!: Table<MathBlock>
  tableBlocks!: Table<TableBlock>
  imageBlocks!: Table<ImageBlock>
  quoteBlocks!: Table<QuoteBlock>
  listBlocks!: Table<ListBlock>
  horizontalRuleBlocks!: Table<HorizontalRuleBlock>
  youtubeBlocks!: Table<YouTubeBlock>
  drawIoBlocks!: Table<DrawIoBlock>
  citationBlocks!: Table<CitationBlock>
  bibliographyBlocks!: Table<BibliographyBlock>
  subfigureBlocks!: Table<SubfigureBlock>
  notaTableBlocks!: Table<NotaTableBlock>
  aiGenerationBlocks!: Table<AIGenerationBlock>
  executableCodeBlocks!: Table<ExecutableCodeBlock>
  confusionMatrixBlocks!: Table<ConfusionMatrixBlock>
  theoremBlocks!: Table<TheoremBlock>
  pipelineBlocks!: Table<PipelineBlock>
  mermaidBlocks!: Table<MermaidBlock>
  subNotaLinkBlocks!: Table<SubNotaLinkBlock>
  
  blockStructures!: Table<NotaBlockStructure>

  constructor() {
    super('notaDB')
    
    // (Do not increment this)
    this.version(1).stores({
      notas: '++id, title, parentId, tags, favorite, updatedAt',
      favoriteBlocks: '++id, name, type, tags, createdAt',
      conversations: '++id, notaId, blockId, createdAt, updatedAt',
      
      // Block type-specific tables
      textBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      headingBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      codeBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      mathBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      tableBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      imageBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      quoteBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      listBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      horizontalRuleBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      youtubeBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      drawIoBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      citationBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      bibliographyBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      subfigureBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      notaTableBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      aiGenerationBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      executableCodeBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      confusionMatrixBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      theoremBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      pipelineBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      mermaidBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      subNotaLinkBlocks: '++id, type, notaId, order, createdAt, updatedAt',
      
      blockStructures: '++id, notaId, blockOrder, version, lastModified'
    })
  }

  /**
   * Get the appropriate table for a block type
   */
  getBlockTable(blockType: string) {
    switch (blockType) {
      case 'text':
        return this.textBlocks
      case 'heading':
        return this.headingBlocks
      case 'code':
        return this.codeBlocks
      case 'math':
        return this.mathBlocks
      case 'table':
        return this.tableBlocks
      case 'image':
        return this.imageBlocks
      case 'quote':
        return this.quoteBlocks
      case 'list':
        return this.listBlocks
      case 'horizontalRule':
        return this.horizontalRuleBlocks
      case 'youtube':
        return this.youtubeBlocks
      case 'drawio':
        return this.drawIoBlocks
      case 'citation':
        return this.citationBlocks
      case 'bibliography':
        return this.bibliographyBlocks
      case 'subfigure':
        return this.subfigureBlocks
      case 'notaTable':
        return this.notaTableBlocks
      case 'aiGeneration':
        return this.aiGenerationBlocks
      case 'executableCodeBlock':
        return this.executableCodeBlocks
      case 'confusionMatrix':
        return this.confusionMatrixBlocks
      case 'theorem':
        return this.theoremBlocks
      case 'pipeline':
        return this.pipelineBlocks
      case 'mermaid':
        return this.mermaidBlocks
      case 'subNotaLink':
        return this.subNotaLinkBlocks
      default:
        throw new Error(`Unknown block type: ${blockType}`)
    }
  }

  /**
   * Save a block to the appropriate table
   */
  async saveBlock(block: any) {
    const table = this.getBlockTable(block.type)
    if (block.id) {
      return await table.put(block)
    } else {
      return await table.add(block)
    }
  }

  /**
   * Get a block by ID from the appropriate table
   */
  async getBlock(blockId: string, blockType: string) {
    const table = this.getBlockTable(blockType)
    return await table.get(blockId)
  }

  /**
   * Get all blocks of a specific type for a nota
   */
  async getBlocksByType(notaId: string, blockType: string) {
    const table = this.getBlockTable(blockType)
    return await table.where('notaId').equals(notaId).toArray()
  }

  /**
   * Delete a block from the appropriate table
   */
  async deleteBlock(blockId: string, blockType: string) {
    const table = this.getBlockTable(blockType)
    return await table.delete(blockId)
  }

  /**
   * Get all blocks for a nota (from all tables)
   */
  async getAllBlocksForNota(notaId: string) {
    const allBlocks: any[] = []
    
    // Query each block type table
    const textBlocks = await this.textBlocks.where('notaId').equals(notaId).toArray()
    const headingBlocks = await this.headingBlocks.where('notaId').equals(notaId).toArray()
    const codeBlocks = await this.codeBlocks.where('notaId').equals(notaId).toArray()
    const mathBlocks = await this.mathBlocks.where('notaId').equals(notaId).toArray()
    const tableBlocks = await this.tableBlocks.where('notaId').equals(notaId).toArray()
    const imageBlocks = await this.imageBlocks.where('notaId').equals(notaId).toArray()
    const quoteBlocks = await this.quoteBlocks.where('notaId').equals(notaId).toArray()
    const listBlocks = await this.listBlocks.where('notaId').equals(notaId).toArray()
    const horizontalRuleBlocks = await this.horizontalRuleBlocks.where('notaId').equals(notaId).toArray()
    const youtubeBlocks = await this.youtubeBlocks.where('notaId').equals(notaId).toArray()
    const drawIoBlocks = await this.drawIoBlocks.where('notaId').equals(notaId).toArray()
    const citationBlocks = await this.citationBlocks.where('notaId').equals(notaId).toArray()
    const bibliographyBlocks = await this.bibliographyBlocks.where('notaId').equals(notaId).toArray()
    const subfigureBlocks = await this.subfigureBlocks.where('notaId').equals(notaId).toArray()
    const notaTableBlocks = await this.notaTableBlocks.where('notaId').equals(notaId).toArray()
    const aiGenerationBlocks = await this.aiGenerationBlocks.where('notaId').equals(notaId).toArray()
    const executableCodeBlocks = await this.executableCodeBlocks.where('notaId').equals(notaId).toArray()
    const confusionMatrixBlocks = await this.confusionMatrixBlocks.where('notaId').equals(notaId).toArray()
    const theoremBlocks = await this.theoremBlocks.where('notaId').equals(notaId).toArray()
    const pipelineBlocks = await this.pipelineBlocks.where('notaId').equals(notaId).toArray()
    const mermaidBlocks = await this.mermaidBlocks.where('notaId').equals(notaId).toArray()
    const subNotaLinkBlocks = await this.subNotaLinkBlocks.where('notaId').equals(notaId).toArray()
    
    // Combine all blocks
    allBlocks.push(
      ...textBlocks,
      ...headingBlocks,
      ...codeBlocks,
      ...mathBlocks,
      ...tableBlocks,
      ...imageBlocks,
      ...quoteBlocks,
      ...listBlocks,
      ...horizontalRuleBlocks,
      ...youtubeBlocks,
      ...drawIoBlocks,
      ...citationBlocks,
      ...bibliographyBlocks,
      ...subfigureBlocks,
      ...notaTableBlocks,
      ...aiGenerationBlocks,
      ...executableCodeBlocks,
      ...confusionMatrixBlocks,
      ...theoremBlocks,
      ...pipelineBlocks,
      ...mermaidBlocks,
      ...subNotaLinkBlocks
    )
    
    return allBlocks
  }

  /**
   * Delete all blocks for a nota (from all tables)
   */
  async deleteAllBlocksForNota(notaId: string) {
    await this.textBlocks.where('notaId').equals(notaId).delete()
    await this.headingBlocks.where('notaId').equals(notaId).delete()
    await this.codeBlocks.where('notaId').equals(notaId).delete()
    await this.mathBlocks.where('notaId').equals(notaId).delete()
    await this.tableBlocks.where('notaId').equals(notaId).delete()
    await this.imageBlocks.where('notaId').equals(notaId).delete()
    await this.quoteBlocks.where('notaId').equals(notaId).delete()
    await this.listBlocks.where('notaId').equals(notaId).delete()
    await this.horizontalRuleBlocks.where('notaId').equals(notaId).delete()
    await this.youtubeBlocks.where('notaId').equals(notaId).delete()
    await this.drawIoBlocks.where('notaId').equals(notaId).delete()
    await this.citationBlocks.where('notaId').equals(notaId).delete()
    await this.bibliographyBlocks.where('notaId').equals(notaId).delete()
    await this.subfigureBlocks.where('notaId').equals(notaId).delete()
    await this.notaTableBlocks.where('notaId').equals(notaId).delete()
    await this.aiGenerationBlocks.where('notaId').equals(notaId).delete()
    await this.executableCodeBlocks.where('notaId').equals(notaId).delete()
    await this.confusionMatrixBlocks.where('notaId').equals(notaId).delete()
    await this.theoremBlocks.where('notaId').equals(notaId).delete()
    await this.pipelineBlocks.where('notaId').equals(notaId).delete()
    await this.mermaidBlocks.where('notaId').equals(notaId).delete()
    await this.subNotaLinkBlocks.where('notaId').equals(notaId).delete()
  }
}

export const db = new NotaDB()








