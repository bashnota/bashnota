import { logger } from '@/services/logger'
import type { Block } from '@/features/nota/types/blocks'

export interface ParsedBlock {
  type: string
  content: string
  attributes: Record<string, any>
  metadata: {
    startLine: number
    endLine: number
    rawText: string
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
}

export interface ParsingResult {
  blocks: ParsedBlock[]
  metadata: {
    totalLines: number
    validBlocks: number
    invalidBlocks: number
    warnings: string[]
    errors: string[]
  }
}

export interface BlockPattern {
  name: string
  pattern: RegExp
  blockType: string
  attributes: (match: RegExpMatchArray) => Record<string, any>
  validate: (block: ParsedBlock) => { isValid: boolean; errors: string[]; warnings: string[] }
}

export class MarkdownParserService {
  private blockPatterns: BlockPattern[] = []

  constructor() {
    this.initializeBlockPatterns()
  }

  private initializeBlockPatterns() {
    // Basic markdown patterns
    this.blockPatterns = [
      // Headings
      {
        name: 'heading',
        pattern: /^(#{1,6})\s+(.+)$/gm,
        blockType: 'heading',
        attributes: (match) => ({
          level: match[1].length,
          content: match[2].trim()
        }),
        validate: (block) => {
          const errors: string[] = []
          const warnings: string[] = []
          
          if (!block.attributes.content) {
            errors.push('Heading content cannot be empty')
          }
          
          if (block.attributes.level > 6) {
            errors.push('Heading level cannot exceed 6')
          }
          
          return { isValid: errors.length === 0, errors, warnings }
        }
      },

      // Code blocks
      {
        name: 'codeBlock',
        pattern: /^```(\w+)?\n([\s\S]*?)\n```$/gm,
        blockType: 'code',
        attributes: (match) => ({
          language: match[1] || 'text',
          content: match[2]
        }),
        validate: (block) => {
          const errors: string[] = []
          const warnings: string[] = []
          
          if (!block.attributes.content) {
            errors.push('Code block content cannot be empty')
          }
          
          return { isValid: errors.length === 0, errors, warnings }
        }
      },

             // Math blocks (display mode - double dollar signs)
       {
         name: 'mathBlock',
         pattern: /^\$\$([\s\S]*?)\$\$$/gm,
         blockType: 'math',
         attributes: (match) => ({
           latex: match[1].trim(),
           displayMode: true
         }),
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.latex) {
             errors.push('Math content cannot be empty')
           }
           
           // Basic LaTeX validation
           if (block.attributes.latex.includes('\\') && !block.attributes.latex.includes('\\')) {
             warnings.push('LaTeX content may be incomplete')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       },

      // Tables
      {
        name: 'table',
        pattern: /^(\|.*\|)\n(\|[\s\-:|]+\|)\n((?:\|.*\|\n?)*)$/gm,
        blockType: 'table',
        attributes: (match) => {
          const rows = match[0].split('\n').filter(row => row.trim())
          const headers = this.parseTableRow(rows[0])
          const dataRows = rows.slice(2).map(row => this.parseTableRow(row))
          
          return {
            headers,
            rows: dataRows
          }
        },
        validate: (block) => {
          const errors: string[] = []
          const warnings: string[] = []
          
          if (!block.attributes.headers || block.attributes.headers.length === 0) {
            errors.push('Table must have headers')
          }
          
          if (!block.attributes.rows || block.attributes.rows.length === 0) {
            warnings.push('Table has no data rows')
          }
          
          return { isValid: errors.length === 0, errors, warnings }
        }
      },

      // Blockquotes
      {
        name: 'blockquote',
        pattern: /^(>\s+.+\n?)+$/gm,
        blockType: 'quote',
        attributes: (match) => ({
          content: match[0].replace(/^>\s+/gm, '').trim()
        }),
        validate: (block) => {
          const errors: string[] = []
          const warnings: string[] = []
          
          if (!block.attributes.content) {
            errors.push('Blockquote content cannot be empty')
          }
          
          return { isValid: errors.length === 0, errors, warnings }
        }
      },

      // Lists
      {
        name: 'list',
        pattern: /^((?:[\s]*[-*+]\s+.+\n?)+|(?:[\s]*\d+\.\s+.+\n?)+)$/gm,
        blockType: 'list',
        attributes: (match) => {
          const isOrdered = /^\s*\d+\./.test(match[0])
          const items = match[0].split('\n')
            .filter(item => item.trim())
            .map(item => item.replace(/^[\s]*[-*+\d\.]\s+/, '').trim())
          
          return {
            listType: isOrdered ? 'ordered' : 'unordered',
            items
          }
        },
        validate: (block) => {
          const errors: string[] = []
          const warnings: string[] = []
          
          if (!block.attributes.items || block.attributes.items.length === 0) {
            errors.push('List must have at least one item')
          }
          
          return { isValid: errors.length === 0, errors, warnings }
        }
      },

             // Horizontal rules
       {
         name: 'horizontalRule',
         pattern: /^[\s]*[-*_]{3,}[\s]*$/gm,
         blockType: 'horizontalRule',
         attributes: () => ({}),
         validate: () => ({ isValid: true, errors: [], warnings: [] })
       },



      // Links
      {
        name: 'link',
        pattern: /\[([^\]]+)\]\(([^)]+)\)/g,
        blockType: 'link',
        attributes: (match) => ({
          text: match[1],
          url: match[2]
        }),
        validate: (block) => {
          const errors: string[] = []
          const warnings: string[] = []
          
          if (!block.attributes.text) {
            errors.push('Link text cannot be empty')
          }
          
          if (!block.attributes.url) {
            errors.push('Link URL cannot be empty')
          }
          
          try {
            new URL(block.attributes.url)
          } catch {
            warnings.push('Link URL may not be valid')
          }
          
          return { isValid: errors.length === 0, errors, warnings }
        }
      },

             // Images - support both single and multiple images for subfigure
       {
         name: 'image',
         pattern: /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]+)")?\)/g,
         blockType: 'image',
         attributes: (match) => ({
           alt: match[1] || '',
           src: match[2],
           title: match[3] || ''
         }),
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.src) {
             errors.push('Image source cannot be empty')
           }
           
           if (!block.attributes.alt) {
             warnings.push('Image should have alt text for accessibility')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       },

       // Multiple images for subfigure (consecutive image lines)
       {
         name: 'multipleImages',
         pattern: /(?:!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]+)")?\)\s*\n?)+/g,
         blockType: 'multipleImages',
         attributes: (match) => {
           const imageMatches = match[0].matchAll(/!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]+)")?\)/g)
           const images: Array<{alt: string; src: string; title: string}> = []
           for (const imgMatch of imageMatches) {
             images.push({
               alt: imgMatch[1] || '',
               src: imgMatch[2],
               title: imgMatch[3] || ''
             })
           }
           return { images }
         },
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.images || block.attributes.images.length === 0) {
             errors.push('Multiple images block must contain at least one image')
           }
           
           if (block.attributes.images.length === 1) {
             warnings.push('Consider using single image pattern for single images')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       },

      // Executable code blocks
      {
        name: 'executableCode',
        pattern: /^```\{(\w+)(?:\s*,\s*([^}]+))?\}\n([\s\S]*?)\n```$/gm,
        blockType: 'executableCodeBlock',
        attributes: (match) => ({
          language: match[1],
          options: match[2] ? this.parseOptions(match[2]) : {},
          content: match[3]
        }),
        validate: (block) => {
          const errors: string[] = []
          const warnings: string[] = []
          
          if (!block.attributes.language) {
            errors.push('Executable code block must specify a language')
          }
          
          if (!block.attributes.content) {
            errors.push('Executable code block content cannot be empty')
          }
          
          return { isValid: errors.length === 0, errors, warnings }
        }
      },

      // Mermaid diagrams
      {
        name: 'mermaid',
        pattern: /^```mermaid\s*\n([\s\S]*?)\n```$/gm,
        blockType: 'mermaid',
        attributes: (match) => ({
          content: match[1].trim()
        }),
        validate: (block) => {
          const errors: string[] = []
          const warnings: string[] = []
          
          if (!block.attributes.content) {
            errors.push('Mermaid diagram content cannot be empty')
          }
          
          // Basic mermaid syntax validation
          if (!block.attributes.content.includes('graph') && 
              !block.attributes.content.includes('flowchart') &&
              !block.attributes.content.includes('sequenceDiagram')) {
            warnings.push('Mermaid content may not be valid diagram syntax')
          }
          
          return { isValid: errors.length === 0, errors, warnings }
        }
      },

             // Citations
       {
         name: 'citation',
         pattern: /@([a-zA-Z0-9_-]+)/g,
         blockType: 'citation',
         attributes: (match) => ({
           citationKey: match[1]
         }),
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.citationKey) {
             errors.push('Citation key cannot be empty')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       },

       // Bibliography (multiple citations together)
       {
         name: 'bibliography',
         pattern: /(?:@([a-zA-Z0-9_-]+)\s*)+/g,
         blockType: 'bibliography',
         attributes: (match) => {
           const citationMatches = match[0].matchAll(/@([a-zA-Z0-9_-]+)/g)
           const citations: string[] = []
           for (const citationMatch of citationMatches) {
             citations.push(citationMatch[1])
           }
           return { citations }
         },
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.citations || block.attributes.citations.length === 0) {
             errors.push('Bibliography must contain at least one citation')
           }
           
           if (block.attributes.citations.length === 1) {
             warnings.push('Consider using single citation pattern for single citations')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       },

             // YouTube videos
       {
         name: 'youtube',
         pattern: /^!\[youtube\]\(([^)]+)\)$/gm,
         blockType: 'youtube',
         attributes: (match) => ({
           videoId: this.extractYouTubeId(match[1])
         }),
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.videoId) {
             errors.push('YouTube video ID could not be extracted')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       },

       // Theorem blocks
       {
         name: 'theorem',
         pattern: /^\\begin\{theorem\}(?:\[([^\]]+)\])?\s*\n([\s\S]*?)\n\\end\{theorem\}$/gm,
         blockType: 'theorem',
         attributes: (match) => ({
           title: match[1] || 'Theorem',
           content: match[2].trim()
         }),
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.content) {
             errors.push('Theorem content cannot be empty')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       },

       // AI Generation blocks
       {
         name: 'aiGeneration',
         pattern: /^```ai\s*\n([\s\S]*?)\n```$/gm,
         blockType: 'aiGeneration',
         attributes: (match) => ({
           prompt: match[1].trim(),
           model: 'gpt-4',
           timestamp: new Date()
         }),
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.prompt) {
             errors.push('AI generation prompt cannot be empty')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       },

       // Confusion Matrix blocks
       {
         name: 'confusionMatrix',
         pattern: /^```confusion-matrix\s*\n([\s\S]*?)\n```$/gm,
         blockType: 'confusionMatrix',
         attributes: (match) => ({
           matrixData: match[1].trim(),
           title: 'Confusion Matrix',
           source: 'markdown'
         }),
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.matrixData) {
             errors.push('Confusion matrix data cannot be empty')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       },

       // Pipeline blocks
       {
         name: 'pipeline',
         pattern: /^```pipeline\s*\n([\s\S]*?)\n```$/gm,
         blockType: 'pipeline',
         attributes: (match) => ({
           description: match[1].trim(),
           title: 'Pipeline',
           nodes: [],
           edges: []
         }),
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.description) {
             errors.push('Pipeline description cannot be empty')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       },

       // DrawIO blocks
       {
         name: 'drawio',
         pattern: /^```drawio\s*\n([\s\S]*?)\n```$/gm,
         blockType: 'drawio',
         attributes: (match) => ({
           diagramData: match[1].trim(),
           width: 800,
           height: 600
         }),
         validate: (block) => {
           const errors: string[] = []
           const warnings: string[] = []
           
           if (!block.attributes.diagramData) {
             errors.push('DrawIO diagram data cannot be empty')
           }
           
           return { isValid: errors.length === 0, errors, warnings }
         }
       }
    ]
  }

  private parseTableRow(row: string): string[] {
    return row
      .split('|')
      .slice(1, -1) // Remove first and last empty cells
      .map(cell => cell.trim())
  }

  private parseOptions(optionsString: string): Record<string, any> {
    const options: Record<string, any> = {}
    const pairs = optionsString.split(',').map(pair => pair.trim())
    
    pairs.forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim())
      if (key && value) {
        options[key] = value
      }
    })
    
    return options
  }

  private extractYouTubeId(url: string): string {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }
    
    return ''
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  /**
   * Extract text blocks from content between other blocks
   */
  private extractTextBlocks(content: string, existingBlocks: ParsedBlock[]): ParsedBlock[] {
    const textBlocks: ParsedBlock[] = []
    
    logger.info('Extracting text blocks from content:', { contentLength: content.length, existingBlocks: existingBlocks.length })
    
    if (existingBlocks.length === 0) {
      // If no other blocks, treat entire content as text
      const trimmedContent = content.trim()
      logger.info('No existing blocks, treating entire content as text:', { trimmedContent, length: trimmedContent.length })
      
      if (trimmedContent && trimmedContent.length > 0) {
        const textBlock = {
          type: 'text',
          content: trimmedContent,
          attributes: { content: trimmedContent },
          metadata: {
            startLine: 1,
            endLine: content.split('\n').length,
            rawText: trimmedContent,
            isValid: true,
            errors: [],
            warnings: []
          }
        }
        textBlocks.push(textBlock)
        logger.info('Created text block:', textBlock)
      }
      return textBlocks
    }

    // Sort blocks by start line
    const sortedBlocks = [...existingBlocks].sort((a, b) => a.metadata.startLine - b.metadata.startLine)
    
    // Check for text before first block
    if (sortedBlocks[0].metadata.startLine > 1) {
      const textBefore = content.split('\n').slice(0, sortedBlocks[0].metadata.startLine - 1).join('\n').trim()
      if (textBefore && textBefore.length > 0) {
        textBlocks.push({
          type: 'text',
          content: textBefore,
          attributes: { content: textBefore },
          metadata: {
            startLine: 1,
            endLine: sortedBlocks[0].metadata.startLine - 1,
            rawText: textBefore,
            isValid: true,
            errors: [],
            warnings: []
          }
        })
      }
    }

    // Check for text between blocks
    for (let i = 0; i < sortedBlocks.length - 1; i++) {
      const currentBlock = sortedBlocks[i]
      const nextBlock = sortedBlocks[i + 1]
      
      if (nextBlock.metadata.startLine > currentBlock.metadata.endLine + 1) {
        const textBetween = content.split('\n').slice(currentBlock.metadata.endLine, nextBlock.metadata.startLine - 1).join('\n').trim()
        if (textBetween && textBetween.length > 0) {
          textBlocks.push({
            type: 'text',
            content: textBetween,
            attributes: { content: textBetween },
            metadata: {
              startLine: currentBlock.metadata.endLine + 1,
              endLine: nextBlock.metadata.startLine - 1,
              rawText: textBetween,
              isValid: true,
              errors: [],
              warnings: []
            }
          })
        }
      }
    }

    // Check for text after last block
    const lastBlock = sortedBlocks[sortedBlocks.length - 1]
    if (lastBlock.metadata.endLine < content.split('\n').length) {
      const textAfter = content.split('\n').slice(lastBlock.metadata.endLine).join('\n').trim()
      if (textAfter && textAfter.length > 0) {
        textBlocks.push({
          type: 'text',
          content: textAfter,
          attributes: { content: textAfter },
          metadata: {
            startLine: lastBlock.metadata.endLine + 1,
            endLine: content.split('\n').length,
            rawText: textAfter,
            isValid: true,
            errors: [],
            warnings: []
          }
        })
      }
    }

    logger.info('Extracted text blocks:', textBlocks.length, textBlocks.map(b => ({ type: b.type, contentLength: b.content.length })))
    return textBlocks
  }

  /**
   * Parse markdown content and extract all blocks
   */
  parseMarkdown(content: string): ParsingResult {
    const lines = content.split('\n')
    const blocks: ParsedBlock[] = []
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Process each block pattern
      for (const pattern of this.blockPatterns) {
        const matches = content.matchAll(pattern.pattern)
        
        for (const match of matches) {
          try {
            const startLine = this.getLineNumber(content, match.index || 0)
            const endLine = this.getLineNumber(content, (match.index || 0) + match[0].length)
            
            const block: ParsedBlock = {
              type: pattern.blockType,
              content: match[0],
              attributes: pattern.attributes(match),
              metadata: {
                startLine,
                endLine,
                rawText: match[0],
                isValid: true,
                errors: [],
                warnings: []
              }
            }

            // Validate the block
            const validation = pattern.validate(block)
            block.metadata.isValid = validation.isValid
            block.metadata.errors = validation.errors
            block.metadata.warnings = validation.warnings

            blocks.push(block)

            // Collect errors and warnings
            errors.push(...validation.errors)
            warnings.push(...validation.warnings)
          } catch (error) {
            logger.error(`Error parsing ${pattern.name} block:`, error)
            errors.push(`Failed to parse ${pattern.name} block`)
          }
        }
      }

      // Add text blocks for content between other blocks
      const textBlocks = this.extractTextBlocks(content, blocks)
      blocks.push(...textBlocks)

      // Sort blocks by line number
      blocks.sort((a, b) => a.metadata.startLine - b.metadata.startLine)

      // Remove duplicates and overlapping blocks
      const uniqueBlocks = this.removeOverlappingBlocks(blocks)

      return {
        blocks: uniqueBlocks,
        metadata: {
          totalLines: lines.length,
          validBlocks: uniqueBlocks.filter(b => b.metadata.isValid).length,
          invalidBlocks: uniqueBlocks.filter(b => !b.metadata.isValid).length,
          warnings,
          errors
        }
      }
    } catch (error) {
      logger.error('Error parsing markdown:', error)
      return {
        blocks: [],
        metadata: {
          totalLines: lines.length,
          validBlocks: 0,
          invalidBlocks: 0,
          warnings: [],
          errors: ['Failed to parse markdown content']
        }
      }
    }
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length
  }

  private removeOverlappingBlocks(blocks: ParsedBlock[]): ParsedBlock[] {
    const sorted = blocks.sort((a, b) => a.metadata.startLine - b.metadata.startLine)
    const result: ParsedBlock[] = []
    
    for (const block of sorted) {
      const overlaps = result.some(existing => 
        (block.metadata.startLine >= existing.metadata.startLine && 
         block.metadata.startLine <= existing.metadata.endLine) ||
        (block.metadata.endLine >= existing.metadata.startLine && 
         block.metadata.endLine <= existing.metadata.endLine)
      )
      
      if (!overlaps) {
        result.push(block)
      }
    }
    
    return result
  }

  /**
   * Convert text content that may contain inline math to Tiptap format
   */
  private convertTextWithInlineMath(content: string): any {
    // Ensure content is a valid string and not empty
    const sanitizedContent = content && typeof content === 'string' ? content.trim() : ''
    
    logger.info('Converting text with inline math:', { original: content, sanitized: sanitizedContent })
    
    if (!sanitizedContent) {
      // Return empty paragraph if no content
      logger.info('Empty content, returning empty paragraph')
      return {
        type: 'paragraph',
        content: [{ type: 'text', text: ' ' }]
      }
    }
    
    // For now, just return a simple paragraph with the text content
    // Tiptap will handle inline math rendering naturally when the content is inserted
    const result = {
      type: 'paragraph',
      content: [{ type: 'text', text: sanitizedContent }]
    }
    
    logger.info('Generated paragraph:', result)
    return result
  }

  /**
   * Convert parsed blocks to Tiptap-compatible format
   */
  convertToTiptap(blocks: ParsedBlock[]): any[] {
    logger.info('Converting blocks to Tiptap format:', blocks.length)
    return blocks.map(block => {
      logger.info('Converting block:', block.type, block.attributes)
      switch (block.type) {
                          case 'heading':
           return {
             type: 'heading',
             attrs: { level: block.attributes.level },
             content: [{ type: 'text', text: block.attributes.content }]
           }
        
         case 'text':
           // Handle text blocks that may contain inline math
           return this.convertTextWithInlineMath(block.attributes.content)
        
         case 'code':
          return {
            type: 'executableCodeBlock',
            attrs: { 
              language: block.attributes.language
            },
            content: [{ type: 'text', text: block.attributes.content }]
          }
        
        case 'math':
          return {
            type: 'math',
            attrs: { 
              latex: block.attributes.latex
            }
          }
        
        case 'table':
          // Use the custom notaTable extension
          return {
            type: 'notaTable',
            attrs: {
              tableData: {
                id: this.generateId(),
                name: 'Markdown Table',
                columns: block.attributes.headers.map((header: string) => ({
                  id: this.generateId(),
                  title: header,
                  type: 'text'
                })),
                rows: block.attributes.rows.map((row: string[]) => ({
                  id: this.generateId(),
                  cells: Object.fromEntries(
                    block.attributes.headers.map((header: string, index: number) => [
                      header,
                      row[index] || ''
                    ])
                  )
                }))
              }
            }
          }
        
        case 'quote':
          return {
            type: 'blockquote',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: block.attributes.content }] }]
          }
        
        case 'list':
          return {
            type: block.attributes.listType === 'ordered' ? 'orderedList' : 'bulletList',
            content: block.attributes.items.map((item: string) => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }]
            }))
          }
        
        case 'horizontalRule':
          return { type: 'horizontalRule' }
        
        case 'link':
          return {
            type: 'paragraph',
            content: [{
              type: 'text',
              text: block.attributes.text,
              marks: [{ type: 'link', attrs: { href: block.attributes.url } }]
            }]
          }
        
        case 'image':
          // Use subfigure extension for single images
          return {
            type: 'subfigure',
            attrs: { 
              images: [{
                src: block.attributes.src,
                alt: block.attributes.alt,
                title: block.attributes.title
              }],
              layout: 'horizontal'
            }
          }
        
        case 'multipleImages':
          // Use subfigure extension for multiple images
          return {
            type: 'subfigure',
            attrs: { 
              images: block.attributes.images,
              layout: 'horizontal'
            }
          }
        
        case 'executableCodeBlock':
          return {
            type: 'executableCodeBlock',
            attrs: {
              language: block.attributes.language,
              ...block.attributes.options
            },
            content: [{ type: 'text', text: block.attributes.content }]
          }
        
        case 'mermaid':
          // Use mermaid extension
          return {
            type: 'mermaid',
            attrs: { 
              content: block.attributes.content,
              theme: 'default'
            }
          }
        
        case 'citation':
          return {
            type: 'citation',
            attrs: { 
              citationKey: block.attributes.citationKey,
              citationData: {}
            }
          }
        
        case 'bibliography':
          return {
            type: 'bibliography',
            attrs: { 
              citations: block.attributes.citations
            }
          }
        
        case 'youtube':
          return {
            type: 'youtube',
            attrs: { 
              videoId: block.attributes.videoId,
              title: ''
            }
          }
        
        case 'theorem':
          return {
            type: 'theorem',
            attrs: { 
              title: block.attributes.title,
              content: block.attributes.content,
              theoremType: 'theorem',
              tags: []
            }
          }
        
        case 'aiGeneration':
          return {
            type: 'aiGeneration',
            attrs: { 
              prompt: block.attributes.prompt,
              model: block.attributes.model,
              timestamp: block.attributes.timestamp
            },
            content: [{ type: 'text', text: '' }]
          }
        
        case 'confusionMatrix':
          return {
            type: 'confusionMatrix',
            attrs: { 
              matrixData: block.attributes.matrixData,
              title: block.attributes.title,
              source: block.attributes.source
            }
          }
        
        case 'pipeline':
          return {
            type: 'pipeline',
            attrs: { 
              title: block.attributes.title,
              description: block.attributes.description,
              nodes: block.attributes.nodes,
              edges: block.attributes.edges
            }
          }
        
        case 'drawio':
          return {
            type: 'drawio',
            attrs: { 
              diagramData: block.attributes.diagramData,
              width: block.attributes.width,
              height: block.attributes.height
            }
          }
        
        default:
          // Fallback to paragraph for unknown types
          return {
            type: 'paragraph',
            content: [{ type: 'text', text: block.content }]
          }
      }
    })
  }

  /**
   * Validate a single block
   */
  validateBlock(block: ParsedBlock): { isValid: boolean; errors: string[]; warnings: string[] } {
    const pattern = this.blockPatterns.find(p => p.blockType === block.type)
    if (pattern) {
      return pattern.validate(block)
    }
    return { isValid: false, errors: ['Unknown block type'], warnings: [] }
  }

  /**
   * Get suggestions for fixing validation errors
   */
  getFixSuggestions(block: ParsedBlock): string[] {
    const suggestions: string[] = []
    
    if (block.metadata.errors.length > 0) {
      suggestions.push('Review and fix validation errors before inserting')
    }
    
    if (block.metadata.warnings.length > 0) {
      suggestions.push('Consider addressing warnings for better content quality')
    }
    
    return suggestions
  }
}

export const markdownParserService = new MarkdownParserService()
