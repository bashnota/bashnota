import type { Mark } from '@tiptap/core'

/**
 * Base interface for all blocks
 */
export interface BaseBlock {
  id?: string // Optional since Dexie will auto-generate with ++id
  type: string
  order: number
  notaId: string
  createdAt: Date
  updatedAt: Date
  version: number
  metadata?: Record<string, any>
}

/**
 * Text block for paragraphs and general text content
 */
export interface TextBlock extends BaseBlock {
  type: 'text'
  content: string
  marks?: Mark[]
}

/**
 * Heading block for titles and section headers
 */
export interface HeadingBlock extends BaseBlock {
  type: 'heading'
  level: number
  content: string
  marks?: Mark[]
}

/**
 * Code block for executable code
 */
export interface CodeBlock extends BaseBlock {
  type: 'code'
  language: string
  content: string
  output?: any
  sessionId?: string
  isExecuting?: boolean
  executionTime?: number
  error?: string
}

/**
 * Math block for mathematical expressions
 */
export interface MathBlock extends BaseBlock {
  type: 'math'
  latex: string
  rendered?: string
  displayMode?: boolean
}

/**
 * Table block for data tables
 */
export interface TableBlock extends BaseBlock {
  type: 'table'
  headers: string[]
  rows: string[][]
  caption?: string
}

/**
 * Image block for images and media
 */
export interface ImageBlock extends BaseBlock {
  type: 'image'
  src: string
  alt?: string
  caption?: string
  width?: number
  height?: number
}

/**
 * Quote block for blockquotes
 */
export interface QuoteBlock extends BaseBlock {
  type: 'quote'
  content: string
  author?: string
  source?: string
}

/**
 * List block for ordered and unordered lists
 */
export interface ListBlock extends BaseBlock {
  type: 'list'
  listType: 'ordered' | 'unordered' | 'task'
  items: string[]
  marks?: Mark[]
}

/**
 * Horizontal rule block
 */
export interface HorizontalRuleBlock extends BaseBlock {
  type: 'horizontalRule'
}

/**
 * YouTube embed block
 */
export interface YouTubeBlock extends BaseBlock {
  type: 'youtube'
  videoId: string
  title?: string
}

/**
 * Draw.io diagram block
 */
export interface DrawIoBlock extends BaseBlock {
  type: 'drawio'
  diagramData: string
  width?: number
  height?: number
}

/**
 * Citation block for academic references
 */
export interface CitationBlock extends BaseBlock {
  type: 'citation'
  citationKey: string
  citationData: any
}

/**
 * Bibliography block for reference lists
 */
export interface BibliographyBlock extends BaseBlock {
  type: 'bibliography'
  citations: string[]
}

/**
 * Subfigure block for image galleries
 */
export interface SubfigureBlock extends BaseBlock {
  type: 'subfigure'
  images: Array<{
    src: string
    alt?: string
    caption?: string
  }>
  layout: 'horizontal' | 'vertical' | 'grid'
}

/**
 * Nota table block for displaying nota relationships
 */
export interface NotaTableBlock extends BaseBlock {
  type: 'notaTable'
  tableData: any[]
  columns: string[]
}

/**
 * AI generation block for AI-generated content
 */
export interface AIGenerationBlock extends BaseBlock {
  type: 'aiGeneration'
  prompt: string
  generatedContent: string
  model?: string
  timestamp: Date
}

/**
 * Executable code block (specialized code block with execution context)
 */
export interface ExecutableCodeBlock extends BaseBlock {
  type: 'executableCodeBlock'
  language: string
  content: string
  output?: any
  sessionId?: string
  isExecuting?: boolean
  executionTime?: number
  error?: string
  kernelPreferences?: any
}

/**
 * Confusion matrix block for ML model evaluation
 */
export interface ConfusionMatrixBlock extends BaseBlock {
  type: 'confusionMatrix'
  matrixData?: {
    matrix: number[][]
    labels: string[]
  }
  title?: string
  source?: 'upload' | 'jupyter'
  filePath?: string
  stats?: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
  }
}

/**
 * Theorem block for mathematical theorems
 */
export interface TheoremBlock extends BaseBlock {
  type: 'theorem'
  title: string
  content: string
  proof?: string
  theoremType?: 'theorem' | 'lemma' | 'corollary' | 'proposition'
  number?: string
  tags?: string[]
}

/**
 * Pipeline block for workflow visualization
 */
export interface PipelineBlock extends BaseBlock {
  type: 'pipeline'
  title: string
  description?: string
  nodes: Array<{
    id: string
    type: string
    label: string
    position: { x: number; y: number }
    data?: any
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    label?: string
  }>
  config?: any
}

/**
 * Mermaid diagram block
 */
export interface MermaidBlock extends BaseBlock {
  type: 'mermaid'
  content: string
  title?: string
  theme?: 'default' | 'forest' | 'dark' | 'neutral'
  config?: any
}

/**
 * Union type for all block types
 */
export type Block = 
  | TextBlock
  | HeadingBlock
  | CodeBlock
  | MathBlock
  | TableBlock
  | ImageBlock
  | QuoteBlock
  | ListBlock
  | HorizontalRuleBlock
  | YouTubeBlock
  | DrawIoBlock
  | CitationBlock
  | BibliographyBlock
  | SubfigureBlock
  | NotaTableBlock
  | AIGenerationBlock
  | ExecutableCodeBlock
  | ConfusionMatrixBlock
  | TheoremBlock
  | PipelineBlock
  | MermaidBlock

/**
 * Block order and structure for a nota
 */
export interface NotaBlockStructure {
  id?: string // Optional for new structures, will be set by database
  notaId: string
  blockOrder: string[] // Array of block IDs in order
  // blocks property removed - blocks are stored separately in the blocks table
  version: number
  lastModified: Date
}

/**
 * Block metadata for tracking changes and relationships
 */
export interface BlockMetadata {
  createdBy?: string
  lastModifiedBy?: string
  tags?: string[]
  isLocked?: boolean
  lockExpiresAt?: Date
  collaborators?: string[]
  parentBlockId?: string // For nested blocks
  childBlockIds?: string[] // For blocks with children
}
