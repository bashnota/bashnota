import { markdownParserService, type ParsingResult } from './MarkdownParserService'
import { logger } from '@/services/logger'

export interface PasteResult {
  success: boolean
  blocks: any[]
  metadata: {
    totalBlocks: number
    validBlocks: number
    invalidBlocks: number
    errors: string[]
    warnings: string[]
  }
  message: string
}

export class EnhancedMarkdownPasteHandler {
  /**
   * Handle markdown paste with enhanced parsing and validation
   */
  static async handlePaste(content: string): Promise<PasteResult> {
    try {
      // Parse the markdown content
      const parsingResult = markdownParserService.parseMarkdown(content)
      
      // Check if we have any blocks
      if (parsingResult.blocks.length === 0) {
        return {
          success: false,
          blocks: [],
          metadata: {
            totalBlocks: 0,
            validBlocks: 0,
            invalidBlocks: 0,
            errors: ['No valid blocks found in the pasted content'],
            warnings: []
          },
          message: 'No valid markdown blocks detected. The content may not be in markdown format.'
        }
      }

      // Filter valid blocks
      const validBlocks = parsingResult.blocks.filter(block => block.metadata.isValid)
      const invalidBlocks = parsingResult.blocks.filter(block => !block.metadata.isValid)

      // Convert valid blocks to Tiptap format
      const tiptapBlocks = markdownParserService.convertToTiptap(validBlocks)

      // Prepare result
      const result: PasteResult = {
        success: validBlocks.length > 0,
        blocks: tiptapBlocks,
        metadata: {
          totalBlocks: parsingResult.blocks.length,
          validBlocks: validBlocks.length,
          invalidBlocks: invalidBlocks.length,
          errors: parsingResult.metadata.errors,
          warnings: parsingResult.metadata.warnings
        },
        message: this.generateMessage(validBlocks.length, invalidBlocks.length, parsingResult.metadata.errors, parsingResult.metadata.warnings)
      }

      logger.info('Enhanced markdown paste result:', result)
      return result

    } catch (error) {
      logger.error('Error in enhanced markdown paste handler:', error)
      return {
        success: false,
        blocks: [],
        metadata: {
          totalBlocks: 0,
          validBlocks: 0,
          invalidBlocks: 0,
          errors: ['Failed to parse markdown content'],
          warnings: []
        },
        message: 'An error occurred while parsing the markdown content. Please check the format and try again.'
      }
    }
  }

  /**
   * Check if content looks like markdown
   */
  static isMarkdownContent(content: string): boolean {
    if (!content || content.trim().length === 0) return false

    // Enhanced markdown detection patterns
    const markdownPatterns = [
      // Headings
      /^#{1,6}\s+.+/m,
      // Bold/Italic
      /\*\*[^*]+\*\*|\*[^*]+\*/,
      // Code blocks
      /```[\s\S]*?```/,
      // Inline code
      /`[^`]+`/,
      // Links
      /\[[^\]]+\]\([^)]+\)/,
      // Images
      /!\[[^\]]*\]\([^)]+\)/,
      // Lists
      /^[\s]*[-*+]\s+.+|^[\s]*\d+\.\s+.+/m,
      // Blockquotes
      /^>\s+.+/m,
      // Tables
      /^\|.*\|$/m,
      // Math
      /\$[^$\n]+\$|\$\$[\s\S]*?\$\$/,
      // Horizontal rules
      /^[\s]*[-*_]{3,}[\s]*$/m,
      // Executable code blocks
      /```\{[^}]+\}[\s\S]*?```/,
      // Mermaid diagrams
      /```mermaid[\s\S]*?```/,
      // Citations
      /@[a-zA-Z0-9_-]+/
    ]

    return markdownPatterns.some(pattern => pattern.test(content))
  }

  /**
   * Get a quick preview of what blocks would be created
   */
  static getQuickPreview(content: string): { blockTypes: string[]; totalBlocks: number } {
    try {
      const parsingResult = markdownParserService.parseMarkdown(content)
      const blockTypes = [...new Set(parsingResult.blocks.map(block => block.type))]
      
      return {
        blockTypes,
        totalBlocks: parsingResult.blocks.length
      }
    } catch {
      return {
        blockTypes: [],
        totalBlocks: 0
      }
    }
  }

  /**
   * Validate specific block types in content
   */
  static validateBlockTypes(content: string, allowedTypes: string[]): { isValid: boolean; invalidTypes: string[] } {
    try {
      const parsingResult = markdownParserService.parseMarkdown(content)
      const foundTypes = [...new Set(parsingResult.blocks.map(block => block.type))]
      const invalidTypes = foundTypes.filter(type => !allowedTypes.includes(type))
      
      return {
        isValid: invalidTypes.length === 0,
        invalidTypes
      }
    } catch {
      return {
        isValid: false,
        invalidTypes: []
      }
    }
  }

  /**
   * Generate user-friendly message based on parsing results
   */
  private static generateMessage(validCount: number, invalidCount: number, errors: string[], warnings: string[]): string {
    if (validCount === 0) {
      return 'No valid blocks could be parsed from the content.'
    }

    let message = `Successfully parsed ${validCount} block${validCount !== 1 ? 's' : ''}`
    
    if (invalidCount > 0) {
      message += ` (${invalidCount} invalid block${invalidCount !== 1 ? 's' : ''} skipped)`
    }

    if (warnings.length > 0) {
      message += `. ${warnings.length} warning${warnings.length !== 1 ? 's' : ''} found.`
    }

    if (errors.length > 0) {
      message += `. ${errors.length} error${errors.length !== 1 ? 's' : ''} encountered.`
    }

    return message
  }

  /**
   * Get suggestions for improving markdown content
   */
  static getImprovementSuggestions(content: string): string[] {
    const suggestions: string[] = []
    
    try {
      const parsingResult = markdownParserService.parseMarkdown(content)
      
      // Check for common issues
      if (parsingResult.metadata.errors.length > 0) {
        suggestions.push('Fix validation errors before inserting blocks')
      }
      
      if (parsingResult.metadata.warnings.length > 0) {
        suggestions.push('Address warnings for better content quality')
      }
      
      // Check for specific block type suggestions
      const blockTypes = parsingResult.blocks.map(block => block.type)
      
      if (blockTypes.includes('image') && !blockTypes.includes('image')) {
        suggestions.push('Consider adding alt text to images for accessibility')
      }
      
      if (blockTypes.includes('table') && parsingResult.blocks.some(block => block.type === 'table' && block.attributes.rows?.length === 0)) {
        suggestions.push('Tables should have data rows for better readability')
      }
      
      if (blockTypes.includes('code') && !blockTypes.includes('code')) {
        suggestions.push('Specify language for code blocks to enable syntax highlighting')
      }
      
    } catch (error) {
      suggestions.push('Check markdown syntax and formatting')
    }
    
    return suggestions
  }

  /**
   * Clean and normalize markdown content
   */
  static cleanMarkdownContent(content: string): string {
    return content
      // Remove excessive blank lines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove trailing whitespace
      .replace(/[ \t]+$/gm, '')
      // Ensure proper spacing around block elements
      .replace(/(\n#{1,6}\s+)/g, '\n$1')
      .replace(/(\n```)/g, '\n$1')
      .replace(/(```\n)/g, '$1\n')
      .trim()
  }
}
