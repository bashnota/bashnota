import { describe, it, expect, beforeEach } from 'vitest'
import { generateBibTeX, generateCitation } from '../citation'
import type { PublishedNota } from '@/features/nota/types/nota'

describe('lib/citation', () => {
  let mockNota: PublishedNota

  beforeEach(() => {
    mockNota = {
      id: 'test-nota-123',
      title: 'Understanding Machine Learning',
      authorName: 'John Smith',
      authorId: 'user-123',
      authorEmail: 'john@example.com',
      publishedAt: new Date('2023-06-15').toISOString(),
      content: {},
      tags: ['ml', 'ai'],
      description: 'A comprehensive guide to ML',
      isPublic: true,
      views: 100,
    } as PublishedNota
  })

  describe('generateBibTeX', () => {
    it('should generate valid BibTeX citation', () => {
      const result = generateBibTeX(mockNota)
      
      expect(result).toContain('@misc{smith2023')
      expect(result).toContain('author = {John Smith}')
      expect(result).toContain('title = {Understanding Machine Learning}')
      expect(result).toContain('year = {2023}')
      expect(result).toContain('publisher = {BashNota}')
    })

    it('should include URL in citation', () => {
      const result = generateBibTeX(mockNota)
      
      expect(result).toContain('howpublished = {\\url{')
      expect(result).toContain('/p/test-nota-123}}')
    })

    it('should include access date by default', () => {
      const result = generateBibTeX(mockNota)
      const currentYear = new Date().getFullYear()
      
      expect(result).toContain('note = {Online; accessed')
      expect(result).toContain(currentYear.toString())
    })

    it('should exclude access date when option is false', () => {
      const result = generateBibTeX(mockNota, { includeAccessDate: false })
      
      expect(result).not.toContain('note = {Online; accessed')
    })

    it('should use custom cite key when provided', () => {
      const result = generateBibTeX(mockNota, { customCiteKey: 'custom2023' })
      
      expect(result).toContain('@misc{custom2023')
    })

    it('should handle author with single name', () => {
      mockNota.authorName = 'Madonna'
      const result = generateBibTeX(mockNota)
      
      expect(result).toContain('author = {Madonna}')
      expect(result).toContain('@misc{madonna2023')
    })

    it('should handle author with multiple parts', () => {
      mockNota.authorName = 'John Paul Smith Jr.'
      const result = generateBibTeX(mockNota)
      
      expect(result).toContain('author = {John Paul Smith Jr.}')
      expect(result).toContain('@misc{jr.2023')
    })

    it('should return empty string for null nota', () => {
      const result = generateBibTeX(null as any)
      expect(result).toBe('')
    })

    it('should handle different years correctly', () => {
      mockNota.publishedAt = new Date('2020-01-01').toISOString()
      const result = generateBibTeX(mockNota)
      
      expect(result).toContain('year = {2020}')
      expect(result).toContain('@misc{smith2020')
    })

    it('should escape special BibTeX characters in title', () => {
      mockNota.title = 'Understanding ML & Deep Learning'
      const result = generateBibTeX(mockNota)
      
      // BibTeX can handle & in the title field without escaping
      expect(result).toContain('title = {Understanding ML & Deep Learning}')
    })

    it('should handle empty author name gracefully', () => {
      mockNota.authorName = ''
      const result = generateBibTeX(mockNota)
      
      expect(result).toContain('@misc{author2023')
    })
  })

  describe('generateCitation', () => {
    it('should generate BibTeX by default', () => {
      const result = generateCitation(mockNota)
      
      expect(result).toContain('@misc{smith2023')
      expect(result).toContain('author = {John Smith}')
    })

    it('should generate BibTeX when explicitly specified', () => {
      const result = generateCitation(mockNota, 'bibtex')
      
      expect(result).toContain('@misc{')
      expect(result).toContain('author = {John Smith}')
    })

    it('should return placeholder for APA format', () => {
      const result = generateCitation(mockNota, 'apa')
      expect(result).toBe('APA format not yet implemented')
    })

    it('should return placeholder for MLA format', () => {
      const result = generateCitation(mockNota, 'mla')
      expect(result).toBe('MLA format not yet implemented')
    })

    it('should return placeholder for Chicago format', () => {
      const result = generateCitation(mockNota, 'chicago')
      expect(result).toBe('Chicago format not yet implemented')
    })

    it('should pass options to BibTeX generator', () => {
      const result = generateCitation(mockNota, 'bibtex', { 
        customCiteKey: 'mycite2023',
        includeAccessDate: false 
      })
      
      expect(result).toContain('@misc{mycite2023')
      expect(result).not.toContain('note = {Online; accessed')
    })

    it('should return empty string for null nota', () => {
      const result = generateCitation(null as any)
      expect(result).toBe('')
    })

    it('should default to BibTeX for unknown format', () => {
      const result = generateCitation(mockNota, 'unknown' as any)
      expect(result).toContain('@misc{')
    })
  })
})
