import type { ParsedBibTexEntry } from '@/features/nota/composables/useBatchBibTexParser'

export interface ValidationResult {
  isValid: boolean
  source: 'crossref' | 'semantic_scholar'
  confidence: number // 0-1 score
  matchedData?: {
    title?: string
    authors?: string[]
    year?: string
    journal?: string
    doi?: string
    url?: string
    abstract?: string
  }
  suggestion?: string
  error?: string
}

export interface CrossRefWork {
  DOI: string
  title: string[]
  author?: Array<{
    given?: string
    family?: string
  }>
  'published-print'?: {
    'date-parts': number[][]
  }
  'published-online'?: {
    'date-parts': number[][]
  }
  'container-title'?: string[]
  volume?: string
  issue?: string
  page?: string
  URL?: string
  abstract?: string
}

export interface SemanticScholarPaper {
  paperId: string
  title: string
  authors: Array<{
    name: string
    authorId?: string
  }>
  year: number
  venue?: string
  doi?: string
  url?: string
  abstract?: string
  citationCount?: number
}

class ReferenceValidationService {
  private readonly crossrefBaseUrl = 'https://api.crossref.org/works'
  private readonly semanticScholarBaseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search'
  private readonly requestDelay = 1000 // 1 second delay between requests to be respectful

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Normalize strings for comparison
  private normalizeString(str: string): string {
    return str.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Calculate similarity between two strings using Levenshtein distance
  private calculateSimilarity(str1: string, str2: string): number {
    const norm1 = this.normalizeString(str1)
    const norm2 = this.normalizeString(str2)
    
    if (norm1 === norm2) return 1.0
    
    const maxLength = Math.max(norm1.length, norm2.length)
    if (maxLength === 0) return 1.0
    
    const distance = this.levenshteinDistance(norm1, norm2)
    return 1 - distance / maxLength
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // Validate against CrossRef API
  async validateWithCrossRef(entry: ParsedBibTexEntry): Promise<ValidationResult> {
    try {
      await this.delay(this.requestDelay)

      let searchQuery = ''
      
      // Build search query prioritizing DOI, then title
      if (entry.doi) {
        searchQuery = `doi:${entry.doi}`
      } else if (entry.title) {
        searchQuery = `title:"${entry.title}"`
        if (entry.authors) {
          // Add first author to search
          const firstAuthor = entry.authors.split(',')[0].trim()
          searchQuery += ` author:"${firstAuthor}"`
        }
      } else {
        return {
          isValid: false,
          source: 'crossref',
          confidence: 0,
          error: 'Insufficient data for CrossRef validation'
        }
      }

      const response = await fetch(
        `${this.crossrefBaseUrl}?query=${encodeURIComponent(searchQuery)}&rows=5`,
        {
          headers: {
            'User-Agent': 'Bashnota Reference Manager (mailto:support@bashnota.com)'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`CrossRef API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.message?.items?.length) {
        return {
          isValid: false,
          source: 'crossref',
          confidence: 0,
          suggestion: 'No matches found in CrossRef database'
        }
      }

      // Find the best match
      let bestMatch: CrossRefWork | null = null
      let bestScore = 0

      for (const work of data.message.items) {
        const score = this.calculateCrossRefMatchScore(entry, work)
        if (score > bestScore) {
          bestScore = score
          bestMatch = work
        }
      }

      if (!bestMatch || bestScore < 0.7) {
        return {
          isValid: false,
          source: 'crossref',
          confidence: bestScore,
          suggestion: bestScore > 0.4 ? 'Partial match found, please verify manually' : 'No strong matches found'
        }
      }

      // Extract matched data
      const matchedData = this.extractCrossRefData(bestMatch)

      return {
        isValid: true,
        source: 'crossref',
        confidence: bestScore,
        matchedData
      }

    } catch (error) {
      console.error('CrossRef validation error:', error)
      return {
        isValid: false,
        source: 'crossref',
        confidence: 0,
        error: `CrossRef validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Validate against Semantic Scholar API
  async validateWithSemanticScholar(entry: ParsedBibTexEntry): Promise<ValidationResult> {
    try {
      await this.delay(this.requestDelay)

      if (!entry.title || entry.title.length < 5) {
        return {
          isValid: false,
          source: 'semantic_scholar',
          confidence: 0,
          error: 'Title too short for Semantic Scholar validation'
        }
      }

      // Simplify the query - just use the title as-is with basic encoding
      const query = encodeURIComponent(entry.title.trim())
      
      const url = `${this.semanticScholarBaseUrl}?query=${query}&limit=5&fields=paperId,title,authors,year,venue,doi,url`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      // Handle different response statuses
      if (response.status === 429) {
        return {
          isValid: false,
          source: 'semantic_scholar',
          confidence: 0,
          error: 'Rate limit exceeded, please try again later'
        }
      }

      if (response.status === 400) {
        return {
          isValid: false,
          source: 'semantic_scholar',
          confidence: 0,
          error: 'Invalid search query format'
        }
      }

      if (!response.ok) {
        throw new Error(`Semantic Scholar API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.data || data.data.length === 0) {
        return {
          isValid: false,
          source: 'semantic_scholar',
          confidence: 0,
          suggestion: 'No matches found in Semantic Scholar database'
        }
      }

      // Find the best match
      let bestMatch: SemanticScholarPaper | null = null
      let bestScore = 0

      for (const paper of data.data) {
        const score = this.calculateSemanticScholarMatchScore(entry, paper)
        if (score > bestScore) {
          bestScore = score
          bestMatch = paper
        }
      }

      if (!bestMatch || bestScore < 0.6) {
        return {
          isValid: false,
          source: 'semantic_scholar',
          confidence: bestScore,
          suggestion: bestScore > 0.3 ? 'Partial match found, please verify manually' : 'No strong matches found'
        }
      }

      // Extract matched data
      const matchedData = this.extractSemanticScholarData(bestMatch)

      return {
        isValid: true,
        source: 'semantic_scholar',
        confidence: bestScore,
        matchedData
      }

    } catch (error) {
      console.error('Semantic Scholar validation error:', error)
      return {
        isValid: false,
        source: 'semantic_scholar',
        confidence: 0,
        error: `Semantic Scholar validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Calculate match score for CrossRef work
  private calculateCrossRefMatchScore(entry: ParsedBibTexEntry, work: CrossRefWork): number {
    let score = 0
    let factors = 0

    // Title matching (most important)
    if (entry.title && work.title?.[0]) {
      const titleSimilarity = this.calculateSimilarity(entry.title, work.title[0])
      score += titleSimilarity * 0.6
      factors += 0.6
    }

    // DOI matching (exact match)
    if (entry.doi && work.DOI) {
      const doiMatch = entry.doi.toLowerCase() === work.DOI.toLowerCase() ? 1 : 0
      score += doiMatch * 0.3
      factors += 0.3
    }

    // Year matching
    if (entry.year && (work['published-print'] || work['published-online'])) {
      const publishedYear = (work['published-print'] || work['published-online'])?.['date-parts']?.[0]?.[0]
      if (publishedYear && parseInt(entry.year) === publishedYear) {
        score += 0.1
      }
      factors += 0.1
    }

    return factors > 0 ? score / factors : 0
  }

  // Calculate match score for Semantic Scholar paper
  private calculateSemanticScholarMatchScore(entry: ParsedBibTexEntry, paper: SemanticScholarPaper): number {
    let score = 0
    let factors = 0

    // Title matching (most important)
    if (entry.title && paper.title) {
      const titleSimilarity = this.calculateSimilarity(entry.title, paper.title)
      score += titleSimilarity * 0.7
      factors += 0.7
    }

    // Year matching
    if (entry.year && paper.year) {
      const yearMatch = parseInt(entry.year) === paper.year ? 1 : 0
      score += yearMatch * 0.2
      factors += 0.2
    }

    // Author matching (basic)
    if (entry.authors && paper.authors?.length) {
      const entryAuthors = entry.authors.toLowerCase().split(',').map(a => a.trim())
      const paperAuthors = paper.authors.map(a => a.name.toLowerCase())
      
      let authorMatches = 0
      for (const entryAuthor of entryAuthors) {
        for (const paperAuthor of paperAuthors) {
          if (this.calculateSimilarity(entryAuthor, paperAuthor) > 0.8) {
            authorMatches++
            break
          }
        }
      }
      
      const authorScore = authorMatches / Math.max(entryAuthors.length, paperAuthors.length)
      score += authorScore * 0.1
      factors += 0.1
    }

    return factors > 0 ? score / factors : 0
  }

  // Extract data from CrossRef work
  private extractCrossRefData(work: CrossRefWork) {
    const authors = work.author?.map(author => 
      `${author.given || ''} ${author.family || ''}`.trim()
    ) || []

    const year = (work['published-print'] || work['published-online'])?.['date-parts']?.[0]?.[0]?.toString()

    return {
      title: work.title?.[0],
      authors,
      year,
      journal: work['container-title']?.[0],
      doi: work.DOI,
      url: work.URL,
      abstract: work.abstract
    }
  }

  // Extract data from Semantic Scholar paper
  private extractSemanticScholarData(paper: SemanticScholarPaper) {
    return {
      title: paper.title,
      authors: paper.authors?.map(author => author.name) || [],
      year: paper.year?.toString(),
      journal: paper.venue,
      doi: paper.doi,
      url: paper.url,
      abstract: paper.abstract
    }
  }

  // Main validation method that tries both services
  async validateReference(entry: ParsedBibTexEntry): Promise<ValidationResult> {
    let crossrefResult: ValidationResult | null = null
    let semanticResult: ValidationResult | null = null

    // Try CrossRef first if we have a DOI
    if (entry.doi) {
      try {
        crossrefResult = await this.validateWithCrossRef(entry)
        if (crossrefResult.isValid) {
          return crossrefResult
        }
      } catch (error) {
        console.warn('CrossRef validation failed:', error)
      }
    }

    // Try Semantic Scholar
    try {
      semanticResult = await this.validateWithSemanticScholar(entry)
      if (semanticResult.isValid) {
        return semanticResult
      }
    } catch (error) {
      console.warn('Semantic Scholar validation failed:', error)
    }

    // Try CrossRef if we haven't already
    if (!entry.doi) {
      try {
        crossrefResult = await this.validateWithCrossRef(entry)
        if (crossrefResult.isValid) {
          return crossrefResult
        }
      } catch (error) {
        console.warn('CrossRef validation failed:', error)
      }
    }

    // Return the result with higher confidence if both failed
    if (semanticResult && crossrefResult) {
      return semanticResult.confidence >= crossrefResult.confidence 
        ? semanticResult 
        : crossrefResult
    }

    // Return whichever result we have
    return semanticResult || crossrefResult || {
      isValid: false,
      source: 'crossref',
      confidence: 0,
      error: 'All validation services failed'
    }
  }
}

export const referenceValidationService = new ReferenceValidationService()
