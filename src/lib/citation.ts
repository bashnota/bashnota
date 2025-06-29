/**
 * Citation utilities for formatting and generating citations for Nota objects
 */

import type { PublishedNota } from '@/features/nota/types/nota'

/**
 * Formats for citation output
 */
export type CitationFormat = 'bibtex' | 'apa' | 'mla' | 'chicago'

/**
 * Interface for citation generator options
 */
export interface CitationOptions {
  includeAccessDate?: boolean
  customCiteKey?: string
}

/**
 * Generate BibTeX citation for a published nota
 * 
 * @param nota The published nota to cite
 * @param options Additional options for citation generation
 * @returns Formatted BibTeX citation string
 */
export function generateBibTeX(nota: PublishedNota, options: CitationOptions = {}): string {
  if (!nota) return ''

  // Create a citekey based on author's last name and year (e.g., smith2023)
  const authorLastName = nota.authorName.split(' ').pop()?.toLowerCase() || 'author'
  const year = new Date(nota.publishedAt).getFullYear()
  const citeKey = options.customCiteKey || `${authorLastName}${year}`
  
  // Get the URL for the nota
  const url = typeof window !== 'undefined' 
    ? `${window.location.origin}/p/${nota.id}`
    : `https://bashnota.com/p/${nota.id}`
  
  // Current date for the 'accessed' field
  const currentDate = new Date().toISOString().split('T')[0]
  
  // Format the BibTeX citation
  let bibtex = `@misc{${citeKey},
  author = {${nota.authorName}},
  title = {${nota.title}},
  year = {${year}},
  howpublished = {\\url{${url}}},
  publisher = {BashNota}`

  // Add access date if requested
  if (options.includeAccessDate !== false) {
    bibtex += `,
  note = {Online; accessed ${currentDate}}`
  }
  
  // Close the citation
  bibtex += `
}`

  return bibtex
}

/**
 * Generate citation in specified format
 * 
 * @param nota The published nota to cite
 * @param format The citation format to use
 * @param options Additional options for citation generation
 * @returns Formatted citation string
 */
export function generateCitation(
  nota: PublishedNota, 
  format: CitationFormat = 'bibtex',
  options: CitationOptions = {}
): string {
  if (!nota) return ''

  switch (format) {
    case 'bibtex':
      return generateBibTeX(nota, options)
    case 'apa':
      // Future implementation
      return 'APA format not yet implemented'
    case 'mla':
      // Future implementation
      return 'MLA format not yet implemented'
    case 'chicago':
      // Future implementation
      return 'Chicago format not yet implemented'
    default:
      return generateBibTeX(nota, options)
  }
} 