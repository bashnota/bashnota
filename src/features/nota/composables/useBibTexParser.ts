import { ref, type Ref } from 'vue'

export interface ParsedBibTexData {
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
}

export interface UseBibTexParserReturn {
  bibtexInput: Ref<string>
  isParsing: Ref<boolean>
  parseError: Ref<string>
  parseBibTex: () => Promise<void>
  clearBibTex: () => void
}

export function useBibTexParser(onParsed: (data: ParsedBibTexData) => void): UseBibTexParserReturn {
  const bibtexInput = ref('')
  const isParsing = ref(false)
  const parseError = ref('')

  // Parse a single BibTeX entry and return structured data
  const parseSingleBibTexEntry = (bibTexString: string): ParsedBibTexData => {
    const keyMatch = bibTexString.match(/@\w+{([^,]+),/)
    const titleMatch = bibTexString.match(/title\s*=\s*{([^}]+)}/)
    const authorMatch = bibTexString.match(/author\s*=\s*{([^}]+)}/)
    const yearMatch = bibTexString.match(/year\s*=\s*{(\d{4})}/)
    const journalMatch = bibTexString.match(/journal\s*=\s*{([^}]+)}/)
    const volumeMatch = bibTexString.match(/volume\s*=\s*{([^}]+)}/)
    const numberMatch = bibTexString.match(/number\s*=\s*{([^}]+)}/)
    const pagesMatch = bibTexString.match(/pages\s*=\s*{([^}]+)}/)
    const publisherMatch = bibTexString.match(/publisher\s*=\s*{([^}]+)}/)
    const urlMatch = bibTexString.match(/url\s*=\s*{([^}]+)}/)
    const doiMatch = bibTexString.match(/doi\s*=\s*{([^}]+)}/)
      
    // Create parsed data object
    return {
      key: keyMatch ? keyMatch[1].trim() : '',
      title: titleMatch ? titleMatch[1].trim() : '',
      authors: authorMatch ? authorMatch[1].split(' and ')
        .map((author: string) => author.trim())
        .join(', ') : '',
      year: yearMatch ? yearMatch[1].trim() : '',
      journal: journalMatch ? journalMatch[1].trim() : '',
      volume: volumeMatch ? volumeMatch[1].trim() : '',
      number: numberMatch ? numberMatch[1].trim() : '',
      pages: pagesMatch ? pagesMatch[1].trim() : '',
      publisher: publisherMatch ? publisherMatch[1].trim() : '',
      url: urlMatch ? urlMatch[1].trim() : '',
      doi: doiMatch ? doiMatch[1].trim() : ''
    }
  }

  const parseBibTex = async () => {
    if (!bibtexInput.value.trim()) {
      parseError.value = 'Please enter BibTeX data'
      return
    }

    isParsing.value = true
    parseError.value = ''

    try {
      // Check if we have multiple entries by looking for multiple @article, @book, etc.
      const entries = bibtexInput.value.split(/(?=@\w+{)/g).filter(entry => entry.trim())
      
      if (entries.length > 1) {
        parseError.value = 'Multiple entries detected. Please paste one entry at a time.'
        return
      }
      
      // Process single entry
      const parsedEntry = parseSingleBibTexEntry(bibtexInput.value.trim())
      
      if (!parsedEntry.key || !parsedEntry.title) {
        parseError.value = 'Invalid BibTeX format. Please check your entry.'
        return
      }
      
      onParsed(parsedEntry)
    } catch (error) {
      console.error('Failed to parse BibTeX:', error)
      parseError.value = 'Failed to parse BibTeX format. Please check your input.'
    } finally {
      isParsing.value = false
    }
  }

  const clearBibTex = () => {
    bibtexInput.value = ''
    parseError.value = ''
  }

  return {
    bibtexInput,
    isParsing,
    parseError,
    parseBibTex,
    clearBibTex
  }
} 