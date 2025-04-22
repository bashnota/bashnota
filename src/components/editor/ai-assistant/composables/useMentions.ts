import { ref, nextTick } from 'vue'
import type { Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useNotaStore } from '@/stores/nota'
import { logger } from '@/services/logger'

export interface MentionedNota {
  id: string
  title: string
  content?: string
  isBlock?: boolean
}

export interface MentionMatchInfo {
  startPos: number
  endPos: number
  query: string
}

export function useMentions() {
  const notaStore = useNotaStore()
  const mentionSearch = ref('')
  const showMentionSearch = ref(false)
  const mentionSearchResults = ref<any[]>([])
  const mentionsInPrompt = ref<MentionedNota[]>([])
  const mentionMatchInfo = ref<MentionMatchInfo | null>(null)
  const mentionCursorPosition = ref<{ top: number, left: number } | null>(null)

  // Debounced search for notas
  const debouncedSearch = useDebounceFn(() => {
    searchNotas()
  }, 300)

  // Search notas based on query
  const searchNotas = async () => {
    // Skip search if query is empty or search is not visible
    if (!showMentionSearch.value) return
    
    const query = mentionSearch.value.toLowerCase()
    if (!query.trim() && query.length < 2) {
      mentionSearchResults.value = notaStore.items.slice(0, 5)
      return
    }
    
    // Filter notas by title and content
    mentionSearchResults.value = notaStore.items
      .filter(nota => 
        nota.title.toLowerCase().includes(query) || 
        (nota.content && nota.content.toLowerCase().includes(query))
      )
      .slice(0, 10) // Limit to 10 results
  }

  // Detect @ mentions
  const checkForMentions = (e: Event, textareaRef: Ref<HTMLTextAreaElement | null>) => {
    const textarea = e.target as HTMLTextAreaElement
    const value = textarea.value
    const cursorPos = textarea.selectionStart
    
    // Look for @ symbol preceded by space or at the beginning of text
    const beforeCursor = value.substring(0, cursorPos)
    const match = beforeCursor.match(/(?:^|\s)@(\w*)$/)
    
    if (match) {
      showMentionSearch.value = true
      mentionSearch.value = match[1] || ''
      
      // Store match information for insertion
      mentionMatchInfo.value = {
        startPos: match.index || 0,
        endPos: cursorPos,
        query: match[0]
      }
      
      searchNotas()
    } else {
      showMentionSearch.value = false
      mentionMatchInfo.value = null
    }
  }

  // Calculate position for mention search popup
  const calculateMentionPopupPosition = (textarea: HTMLTextAreaElement, matchIndex: number) => {
    const text = textarea.value.substring(0, matchIndex)
    const lines = text.split('\n')
    const lineCount = lines.length
    const lastLine = lines[lineCount - 1] || ''
    
    // Create a temporary div to measure text dimensions
    const div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.top = '-9999px'
    div.style.left = '-9999px'
    div.style.width = `${textarea.clientWidth}px`
    div.style.font = window.getComputedStyle(textarea).font
    div.style.lineHeight = window.getComputedStyle(textarea).lineHeight
    div.style.whiteSpace = 'pre-wrap'
    div.style.wordWrap = 'break-word'
    
    // Calculate position by measuring text
    div.textContent = lastLine
    document.body.appendChild(div)
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20
    const rect = textarea.getBoundingClientRect()
    
    mentionCursorPosition.value = {
      top: rect.top + (lineCount * lineHeight) + 8,
      left: rect.left + div.clientWidth
    }
    
    document.body.removeChild(div)
  }

  // Select a nota from search - fixed to handle all edge cases
  const selectNotaFromSearch = (nota: any, textareaRef: Ref<HTMLTextAreaElement | null>, isContinuing: boolean, promptInput: Ref<string>, followUpPrompt: Ref<string>, isBlock = false) => {
    if (!textareaRef.value) return
    
    try {
      // Get the target textarea and its current value
      const textarea = textareaRef.value;
      let targetValue = isContinuing ? followUpPrompt.value : promptInput.value;
      
      // Default cursor position if we can't determine it from the textarea
      let cursorPos = textarea.selectionStart || 0;
      
      // If we have valid match info, use that for precise replacement
      if (mentionMatchInfo.value) {
        const { startPos, endPos } = mentionMatchInfo.value;
        
        // Replace the @mention with the full reference syntax: #[nota title](id)
        const replacement = targetValue.substring(0, startPos) + 
                           `#[${nota.title}](${nota.id})` + 
                           targetValue.substring(endPos);
        
        // Update the appropriate textarea value
        if (isContinuing) {
          followUpPrompt.value = replacement;
        } else {
          promptInput.value = replacement;
        }
        
        // Set cursor position after the replacement
        nextTick(() => {
          if (textareaRef.value) {
            const newCursorPos = startPos + `#[${nota.title}](${nota.id})`.length;
            textareaRef.value.selectionStart = newCursorPos;
            textareaRef.value.selectionEnd = newCursorPos;
            textareaRef.value.focus();
          }
        });
      } else {
        // Fallback to inserting at current cursor position
        const replacement = targetValue.substring(0, cursorPos) + 
                       `#[${nota.title}](${nota.id})` + 
                       targetValue.substring(cursorPos);
        
        // Update the appropriate textarea value
        if (isContinuing) {
          followUpPrompt.value = replacement;
        } else {
          promptInput.value = replacement;
        }
        
        // Set cursor position after the replacement
        nextTick(() => {
          if (textareaRef.value) {
            const newCursorPos = cursorPos + `#[${nota.title}](${nota.id})`.length;
            textareaRef.value.selectionStart = newCursorPos;
            textareaRef.value.selectionEnd = newCursorPos;
            textareaRef.value.focus();
          }
        });
      }
      
      // Add the mentioned nota to the list
      mentionsInPrompt.value.push({
        id: nota.id,
        title: nota.title,
        isBlock: isBlock
      });
      
      // Close the mention search
      showMentionSearch.value = false;
      
    } catch (error) {
      // Handle any errors in selection process
      logger.error('Error selecting nota from search:', error);
      showMentionSearch.value = false;
      
      // Fallback: just append the reference to the end if all else fails
      const reference = `#[${nota.title}](${nota.id})`;
      if (isContinuing) {
        followUpPrompt.value += reference;
      } else {
        promptInput.value += reference;
      }
      
      // Add the mentioned nota to the list
      mentionsInPrompt.value.push({
        id: nota.id,
        title: nota.title,
        isBlock: isBlock
      });
    }
  }

  // Load nota content for mentioned notas when sending prompt
  const loadMentionedNotaContents = async (promptText: string) => {
    // Process mentions in prompt
    for (const mention of mentionsInPrompt.value) {
      if (!mention.content) {
        const nota = await notaStore.loadNota(mention.id)
        if (nota && nota.content) {
          mention.content = nota.content
        }
      }
    }
    
    // Update prompt with content from mentioned notas
    let updatedPrompt = promptText
    
    // Append mentioned nota content
    if (mentionsInPrompt.value.length > 0) {
      updatedPrompt += '\n\n### Referenced Content:\n\n'
      mentionsInPrompt.value.forEach(mention => {
        if (mention.content) {
          const contentToAdd = mention.isBlock 
            ? mention.content  // Just the selected block
            : `Content from "${mention.title}":\n${mention.content}` // Full nota content
          
          updatedPrompt += `${contentToAdd}\n\n---\n\n`
        }
      })
    }
    
    return updatedPrompt
  }

  // Close mention search when clicking outside
  const handleOutsideClick = (event: MouseEvent) => {
    const searchElement = document.querySelector('.mention-search')
    if (!searchElement) return
    
    if (!searchElement.contains(event.target as Node)) {
      showMentionSearch.value = false
    }
  }

  // Clear mentions
  const clearMentions = () => {
    mentionsInPrompt.value = []
    mentionSearch.value = ''
    showMentionSearch.value = false
    mentionMatchInfo.value = null
  }

  return {
    mentionSearch,
    showMentionSearch,
    mentionSearchResults,
    mentionsInPrompt,
    mentionMatchInfo,
    mentionCursorPosition,
    debouncedSearch,
    searchNotas,
    checkForMentions,
    calculateMentionPopupPosition,
    selectNotaFromSearch,
    loadMentionedNotaContents,
    handleOutsideClick,
    clearMentions
  }
}