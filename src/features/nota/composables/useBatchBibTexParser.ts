import { ref, computed, type Ref } from 'vue'

export interface ParsedBibTexEntry {
  id: string
  key: string
  title: string
  authors: string
  year: string
  journal: string
  volume: string
  number: string
  pages: string
  publisher: string
  url: string
  doi: string
  type: string
  isValid: boolean
  isSelected: boolean
  validationStatus: 'pending' | 'validating' | 'valid' | 'invalid' | 'not_found'
  validationSource?: 'crossref' | 'semantic_scholar'
  validationDetails?: any
}

export interface UseBatchBibTexParserReturn {
  bibtexInput: Ref<string>
  parsedEntries: Ref<ParsedBibTexEntry[]>
  isParsing: Ref<boolean>
  parseError: Ref<string>
  selectedCount: Ref<number>
  parseBatchBibTex: () => Promise<void>
  clearAll: () => void
  toggleSelection: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  removeEntry: (id: string) => void
  getSelectedEntries: () => ParsedBibTexEntry[]
}

export function useBatchBibTexParser(): UseBatchBibTexParserReturn {
  const bibtexInput = ref('')
  const parsedEntries = ref<ParsedBibTexEntry[]>([])
  const isParsing = ref(false)
  const parseError = ref('')

  // Generate unique ID for entries
  const generateId = () => `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Detect BibTeX entry type
  const detectEntryType = (entry: string): string => {
    const typeMatch = entry.match(/@(\w+){/)
    if (!typeMatch) return 'unknown'
    
    const type = typeMatch[1].toLowerCase()
    switch (type) {
      case 'article':
        return 'Journal Article'
      case 'book':
        return 'Book'
      case 'inproceedings':
      case 'incollection':
        return 'Conference Paper'
      case 'techreport':
        return 'Technical Report'
      case 'phdthesis':
        return 'PhD Thesis'
      case 'mastersthesis':
        return 'Master\'s Thesis'
      case 'misc':
        return 'Miscellaneous'
      default:
        return 'Other'
    }
  }

  // Parse a single BibTeX entry
  const parseSingleEntry = (bibTexString: string): Omit<ParsedBibTexEntry, 'id' | 'isSelected' | 'validationStatus'> => {
    // Clean the entry
    const cleanEntry = bibTexString.trim()
    
    // Extract key
    const keyMatch = cleanEntry.match(/@\w+{([^,]+),/)
    
    // Extract fields using more robust regex patterns
    const extractField = (fieldName: string): string => {
      // Handle both quoted and braced values
      const patterns = [
        new RegExp(`${fieldName}\\s*=\\s*"([^"]*)"`, 'i'),
        new RegExp(`${fieldName}\\s*=\\s*{([^}]*)}`, 'i'),
        new RegExp(`${fieldName}\\s*=\\s*([^,\\n}]+)`, 'i')
      ]
      
      for (const pattern of patterns) {
        const match = cleanEntry.match(pattern)
        if (match && match[1]) {
          return match[1].trim()
        }
      }
      return ''
    }

    // Parse authors and convert to comma-separated string
    const authorsField = extractField('author')
    const authors = authorsField
      ? authorsField.split(' and ')
          .map(author => author.trim())
          .filter(author => author.length > 0)
          .join(', ')
      : ''

    // Validate required fields
    const key = keyMatch ? keyMatch[1].trim() : ''
    const title = extractField('title')
    const year = extractField('year')
    
    const isValid = !!(key && title && authors && year && /^\d{4}$/.test(year))

    return {
      key,
      title,
      authors,
      year,
      journal: extractField('journal'),
      volume: extractField('volume'),
      number: extractField('number'),
      pages: extractField('pages'),
      publisher: extractField('publisher'),
      url: extractField('url'),
      doi: extractField('doi'),
      type: detectEntryType(cleanEntry),
      isValid
    }
  }

  // Parse multiple BibTeX entries
  const parseBatchBibTex = async () => {
    if (!bibtexInput.value.trim()) {
      parseError.value = 'Please enter BibTeX data'
      return
    }

    isParsing.value = true
    parseError.value = ''

    try {
      // Split entries by @entry_type{ pattern
      const entryPattern = /(?=@\w+\s*{)/g
      const rawEntries = bibtexInput.value
        .split(entryPattern)
        .filter(entry => entry.trim())
        .filter(entry => entry.includes('@'))

      if (rawEntries.length === 0) {
        parseError.value = 'No valid BibTeX entries found'
        return
      }

      const newEntries: ParsedBibTexEntry[] = []
      const existingKeys = new Set(parsedEntries.value.map(e => e.key))

      for (const rawEntry of rawEntries) {
        try {
          const parsed = parseSingleEntry(rawEntry)
          
          // Check for duplicate keys
          if (existingKeys.has(parsed.key) || newEntries.some(e => e.key === parsed.key)) {
            continue // Skip duplicates
          }

          const entry: ParsedBibTexEntry = {
            id: generateId(),
            ...parsed,
            isSelected: true, // Auto-select new entries
            validationStatus: 'pending'
          }

          newEntries.push(entry)
          existingKeys.add(parsed.key)
        } catch (entryError) {
          console.warn('Failed to parse entry:', entryError)
          // Continue with other entries
        }
      }

      if (newEntries.length === 0) {
        parseError.value = 'No valid entries could be parsed or all entries are duplicates'
        return
      }

      // Add new entries to existing ones
      parsedEntries.value = [...parsedEntries.value, ...newEntries]

      // Clear input after successful parsing
      bibtexInput.value = ''
      
    } catch (error) {
      console.error('Failed to parse BibTeX:', error)
      parseError.value = 'Failed to parse BibTeX. Please check the format.'
    } finally {
      isParsing.value = false
    }
  }

  // Selection management
  const toggleSelection = (id: string) => {
    const entry = parsedEntries.value.find(e => e.id === id)
    if (entry) {
      entry.isSelected = !entry.isSelected
    }
  }

  const selectAll = () => {
    parsedEntries.value.forEach(entry => {
      entry.isSelected = true
    })
  }

  const deselectAll = () => {
    parsedEntries.value.forEach(entry => {
      entry.isSelected = false
    })
  }

  const removeEntry = (id: string) => {
    parsedEntries.value = parsedEntries.value.filter(entry => entry.id !== id)
  }

  const getSelectedEntries = () => {
    return parsedEntries.value.filter(entry => entry.isSelected)
  }

  const clearAll = () => {
    bibtexInput.value = ''
    parsedEntries.value = []
    parseError.value = ''
  }

  // Computed properties
  const selectedCount = computed(() => 
    parsedEntries.value.filter(entry => entry.isSelected).length
  )

  return {
    bibtexInput,
    parsedEntries,
    isParsing,
    parseError,
    selectedCount,
    parseBatchBibTex,
    clearAll,
    toggleSelection,
    selectAll,
    deselectAll,
    removeEntry,
    getSelectedEntries
  }
}
