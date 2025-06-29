import { ref, computed, watch, nextTick } from 'vue'
import { logger } from '@/services/logger'
import { useNotaStore } from '@/features/nota/stores/nota'

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export function useMentions() {
  const notaStore = useNotaStore()
  
  // State for mention search
  const showMentionSearch = ref(false)
  const mentionSearchResults = ref<any[]>([])
  const mentionsInPrompt = ref<any[]>([])
  const searchQuery = ref('')
  const currentMentionRange = ref<{ start: number; end: number } | null>(null)
  
  // Maximum number of results to show in mention search
  const MAX_SEARCH_RESULTS = 10
  
  // Cache for nota content to avoid excessive database queries
  const notaContentCache = new Map<string, string>()
  
  // Debounced search function to prevent too many searches when typing quickly
  const debouncedSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      mentionSearchResults.value = []
      return
    }
    
    try {
      // Search for notas by title
      const results = await notaStore.searchNotasByTitle(query)
      
      // Limit results and add query for reference
      mentionSearchResults.value = results
        .slice(0, MAX_SEARCH_RESULTS)
        .map(nota => ({
          ...nota,
          searchQuery: query
        }))
    } catch (error) {
      logger.error('Error searching for notas:', error)
      mentionSearchResults.value = []
    }
  }, 300) // 300ms debounce
  
  /**
   * Check for mention triggers in text (e.g., @ or #[)
   */
  const checkForMentions = (event: any, textareaRef: any) => {
    // Handle different input formats
    let value: string;
    let cursorPos: number;

    // Skip if required data is not available
    if (!event) return;

    // Case 1: event is a DOM event with target property
    if (event.target && typeof event.target.value === 'string') {
      value = event.target.value;
      cursorPos = event.target.selectionStart || 0;
    } 
    // Case 2: event is an object with explicit value and cursor position
    else if (typeof event.value === 'string') {
      value = event.value;
      cursorPos = event.selectionStart || 0;
    }
    // Case 3: no valid input format
    else {
      // Fallback to try getting value from textareaRef
      if (!textareaRef || !textareaRef.value || typeof textareaRef.value.value !== 'string') {
        return;
      }
      
      value = textareaRef.value.value;
      cursorPos = textareaRef.value.selectionStart || 0;
    }
    
    // Look for '#[' before the cursor
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/#\[([^\]]+)?$/);
    
    if (mentionMatch) {
      // Found a potential mention
      const query = mentionMatch[1] || '';
      searchQuery.value = query;
      
      // Record the mention range for later replacement
      const startPos = mentionMatch.index as number;
      const endPos = cursorPos;
      currentMentionRange.value = { start: startPos, end: endPos };
      
      // Show search and perform search
      showMentionSearch.value = true;
      debouncedSearch(query);
    } else {
      // No mention found, close search
      showMentionSearch.value = false;
      currentMentionRange.value = null;
    }
    
    // Also parse existing mentions in the prompt
    parseExistingMentions(value);
  }
  
  /**
   * Select a nota from search results and insert it into the text
   */
  const selectNotaFromSearch = (nota: any, textareaRef: any, isContinuing: boolean, promptInput: any, followUpPrompt: any) => {
    if (!currentMentionRange.value) return
    
    const range = currentMentionRange.value
    
    // Create the mention text
    const mentionText = `#[${nota.title}](${nota.id})`
    
    // Get the current prompt value
    const currentValue = isContinuing ? followUpPrompt.value : promptInput.value
    
    // Replace the mention placeholder with the actual mention
    const newValue = 
      currentValue.substring(0, range.start) + 
      mentionText + 
      currentValue.substring(range.end)
    
    // Update the appropriate input
    if (isContinuing) {
      followUpPrompt.value = newValue
    } else {
      promptInput.value = newValue
    }
    
    // Close search
    showMentionSearch.value = false
    currentMentionRange.value = null
    
    // Update existing mentions
    parseExistingMentions(newValue)
    
    // Focus back on textarea and set cursor position after the mention if possible
    nextTick(() => {
      try {
        // Only attempt to focus if textareaRef exists, is valid, and has a focus method
        if (textareaRef && textareaRef.value && typeof textareaRef.value.focus === 'function') {
          textareaRef.value.focus()
          
          // Only set cursor position if the selection methods exist
          if (typeof textareaRef.value.selectionStart !== 'undefined') {
            const newCursorPos = range.start + mentionText.length
            textareaRef.value.selectionStart = newCursorPos
            textareaRef.value.selectionEnd = newCursorPos
          }
        }
      } catch (error) {
        // Silently handle any focus errors
        logger.debug('Could not focus textarea after mention insertion:', error)
      }
    })
  }
  
  /**
   * Parse existing mentions from text
   */
  const parseExistingMentions = (text: string) => {
    // Clear previous mentions
    mentionsInPrompt.value = []
    
    // Find all mentions in the format #[Title](id)
    const mentionRegex = /#\[(.*?)\]\((.*?)\)/g
    let match
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const title = match[1]
      const id = match[2]
      
      if (title && id) {
        mentionsInPrompt.value.push({ title, id })
      }
    }
  }
  
  /**
   * Load content from mentioned notas
   */
  const loadMentionedNotaContents = async (promptText: string): Promise<string> => {
    if (mentionsInPrompt.value.length === 0) {
      return promptText
    }
    
    try {
      // Create a deep copy of the prompt text
      let enhancedPrompt = promptText
      
      // Process each mention
      for (const mention of mentionsInPrompt.value) {
        // Check cache first
        let content = notaContentCache.get(mention.id)
        
        // If not in cache, fetch from store
        if (!content) {
          const nota = await notaStore.getCurrentNota(mention.id)
          if (nota && nota.content) {
            content = nota.content
            
            // Add to cache (with a maximum size check)
            if (notaContentCache.size > 50) {
              // If cache is too large, clear oldest entries
              const keys = Array.from(notaContentCache.keys())
              for (let i = 0; i < 10; i++) {
                notaContentCache.delete(keys[i])
              }
            }
            notaContentCache.set(mention.id, content)
          }
        }
        
        // If content was found, replace the mention with the content
        if (content) {
          const mentionRegex = new RegExp(`#\\[${mention.title}\\]\\(${mention.id}\\)`, 'g')
          enhancedPrompt = enhancedPrompt.replace(
            mentionRegex,
            `Content from nota "${mention.title}":\n${content}\n`
          )
        }
      }
      
      return enhancedPrompt
    } catch (error) {
      logger.error('Error loading mentioned nota contents:', error)
      return promptText // Return original prompt on error
    }
  }
  
  /**
   * Handle clicks outside the mention search to close it
   */
  const handleOutsideClick = (event: MouseEvent) => {
    // Check if click was outside mention search
    if (showMentionSearch.value) {
      // Check if the click target is inside mention search
      const target = event.target as HTMLElement
      const mentionSearchElement = document.querySelector('.mention-search-popup')
      
      if (mentionSearchElement && !mentionSearchElement.contains(target)) {
        showMentionSearch.value = false
        currentMentionRange.value = null
      }
    }
  }
  
  /**
   * Clear all mentions state
   */
  const clearMentions = () => {
    showMentionSearch.value = false
    mentionSearchResults.value = []
    currentMentionRange.value = null
    searchQuery.value = ''
  }
  
  /**
   * Update search query from external components
   */
  const updateMentionQuery = (query: string) => {
    searchQuery.value = query
    debouncedSearch(query)
  }
  
  /**
   * Close mention search
   */
  const closeMentionSearch = () => {
    showMentionSearch.value = false
    currentMentionRange.value = null
  }
  
  // Provide memory management function
  const clearCache = () => {
    notaContentCache.clear()
  }
  
  return {
    showMentionSearch,
    mentionSearchResults,
    mentionsInPrompt,
    checkForMentions,
    selectNotaFromSearch,
    loadMentionedNotaContents,
    handleOutsideClick,
    clearMentions,
    updateMentionQuery,
    closeMentionSearch,
    clearCache
  }
}







