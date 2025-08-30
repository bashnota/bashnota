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
  private notaStore: ReturnType<typeof useNotaStore>

  private constructor() {
    this.notaStore = useNotaStore()
  }

  public static getInstance(): SubNotaLinkService {
    if (!SubNotaLinkService.instance) {
      SubNotaLinkService.instance = new SubNotaLinkService()
    }
    return SubNotaLinkService.instance
  }

  /**
   * Get filtered notas based on search query
   */
  public getFilteredNotas(query: string): SubNotaLinkItem[] {
    try {
      const allNotas = this.notaStore.items || []
      
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

// Export singleton instance
export const subNotaLinkService = SubNotaLinkService.getInstance()
