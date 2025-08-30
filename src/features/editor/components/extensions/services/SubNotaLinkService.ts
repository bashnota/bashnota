import { useNotaStore } from '@/features/nota/stores/nota'

// Types
export interface SubNotaLinkItem {
  title: string
  id: string
  description?: string
}

export interface SubNotaLinkAttributes {
  targetNotaId: string
  targetNotaTitle: string
  displayText?: string
  linkStyle?: 'inline' | 'button' | 'card'
}

export class SubNotaLinkService {
  private static instance: SubNotaLinkService

  private constructor() {
    // Don't initialize store in constructor to avoid Pinia initialization issues
  }

  public static getInstance(): SubNotaLinkService {
    if (!SubNotaLinkService.instance) {
      SubNotaLinkService.instance = new SubNotaLinkService()
    }
    return SubNotaLinkService.instance
  }

  /**
   * Get the nota store safely, initializing it only when needed
   */
  private getNotaStore() {
    try {
      return useNotaStore()
    } catch (error) {
      console.warn('Pinia store not available yet:', error)
      return null
    }
  }

  /**
   * Get filtered notas based on search query
   */
  public getFilteredNotas(query: string): SubNotaLinkItem[] {
    try {
      const notaStore = this.getNotaStore()
      if (!notaStore) {
        console.warn('Nota store not available, returning empty results')
        return []
      }

      const allNotas = notaStore.items || []
      
      if (!query || query.trim() === '') {
        return this.formatNotas(allNotas.slice(0, 10))
      }

      const filteredNotas = allNotas
        .filter(nota => 
          nota && 
          nota.title && 
          nota.id && 
          this.matchesQuery(nota, query)
        )
        .slice(0, 10)

      return this.formatNotas(filteredNotas)
    } catch (error) {
      console.error('Error getting filtered notas:', error)
      return []
    }
  }

  /**
   * Check if a nota matches the search query
   */
  private matchesQuery(nota: any, query: string): boolean {
    const searchQuery = query.toLowerCase().trim()
    
    return (
      nota.title.toLowerCase().includes(searchQuery) ||
      nota.id.toLowerCase().includes(searchQuery)
    )
  }

  /**
   * Format notas for display
   */
  private formatNotas(notas: any[]): SubNotaLinkItem[] {
    return notas.map(nota => ({
      title: nota.title || 'Untitled',
      id: nota.id || '',
      description: `ID: ${nota.id || 'unknown'}`
    }))
  }

  /**
   * Validate nota attributes
   */
  public validateAttributes(attributes: SubNotaLinkAttributes): boolean {
    return !!(attributes.targetNotaId && attributes.targetNotaTitle)
  }

  /**
   * Get default attributes for a new subNotaLink
   */
  public getDefaultAttributes(): Partial<SubNotaLinkAttributes> {
    return {
      linkStyle: 'inline'
    }
  }
}

// Export the class for lazy instantiation
// Use SubNotaLinkService.getInstance() when you need the service
