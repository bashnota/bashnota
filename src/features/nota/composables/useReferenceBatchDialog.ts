import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import type { CitationEntry } from '@/features/nota/types/nota'
import type { ParsedBibTexEntry } from './useBatchBibTexParser'
import { useBatchBibTexParser } from './useBatchBibTexParser'
import { useCitationStore } from '@/features/editor/stores/citationStore'
import { toast } from 'vue-sonner'

export interface UseReferenceBatchDialogReturn {
  // State
  isOpen: Ref<boolean>
  isSaving: Ref<boolean>
  
  // BibTeX Parser
  bibtexInput: Ref<string>
  parsedEntries: Ref<ParsedBibTexEntry[]>
  isParsing: Ref<boolean>
  parseError: Ref<string>
  
  // Selection
  selectedCount: Ref<number>
  selectedEntries: ComputedRef<ParsedBibTexEntry[]>
  
  // Actions
  parseBatchBibTex: () => Promise<void>
  toggleSelection: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  removeEntry: (id: string) => void
  clearAll: () => void
  saveBatch: () => Promise<void>
  closeDialog: () => void
  
  // Validation
  validateEntry: (id: string) => void
  validateAll: () => Promise<void>
  
  // Utils
  canSave: ComputedRef<boolean>
  hasValidEntries: ComputedRef<boolean>
}

export function useReferenceBatchDialog(
  notaId: string,
  existingCitations: CitationEntry[]
) {
  const citationStore = useCitationStore()
  
  // Dialog state
  const isOpen = ref(false)
  const isSaving = ref(false)
  
  // Use batch parser
  const {
    bibtexInput,
    parsedEntries,
    isParsing,
    parseError,
    selectedCount: parserSelectedCount,
    parseBatchBibTex: parserParseBatch,
    clearAll: parserClearAll,
    toggleSelection: parserToggleSelection,
    selectAll: parserSelectAll,
    deselectAll: parserDeselectAll,
    removeEntry: parserRemoveEntry,
    getSelectedEntries
  } = useBatchBibTexParser()
  
  // Enhanced computed properties
  const selectedEntries = computed(() => getSelectedEntries())
  const selectedCount = computed(() => selectedEntries.value.length)
  
  const hasValidEntries = computed(() => 
    parsedEntries.value.some(entry => entry.isValid && entry.isSelected)
  )
  
  const canSave = computed(() => 
    selectedEntries.value.length > 0 && 
    !isSaving.value
  )
  
  // Enhanced parsing with duplicate checking
  const parseBatchBibTex = async () => {
    if (!bibtexInput.value.trim()) {
      parseError.value = 'Please enter BibTeX data'
      return
    }
    
    await parserParseBatch()
    
    // Check for duplicates against existing citations
    if (parsedEntries.value.length > 0) {
      const existingKeys = new Set(existingCitations.map(c => c.key))
      let duplicateCount = 0
      
      parsedEntries.value.forEach(entry => {
        if (existingKeys.has(entry.key)) {
          entry.isSelected = false
          duplicateCount++
        }
      })
      
      if (duplicateCount > 0) {
        toast(`${duplicateCount} duplicate entries found and deselected`)
      }
    }
  }
  
  // Selection management
  const toggleSelection = (id: string) => {
    parserToggleSelection(id)
  }
  
  const selectAll = () => {
    // Only select valid entries that are not duplicates
    const existingKeys = new Set(existingCitations.map(c => c.key))
    parsedEntries.value.forEach(entry => {
      if (entry.isValid && !existingKeys.has(entry.key)) {
        entry.isSelected = true
      }
    })
  }
  
  const deselectAll = () => {
    parserDeselectAll()
  }
  
  const removeEntry = (id: string) => {
    parserRemoveEntry(id)
  }
  
  const clearAll = () => {
    parserClearAll()
  }
  
  // Validation
  const validateEntry = (id: string) => {
    const entry = parsedEntries.value.find(e => e.id === id)
    if (entry) {
      entry.validationStatus = 'validating'
    }
  }
  
  const validateAll = async () => {
    const pendingEntries = parsedEntries.value.filter(
      entry => entry.validationStatus === 'pending'
    )
    
    for (const entry of pendingEntries) {
      validateEntry(entry.id)
      // Add small delay to prevent API rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  // Save operations
  const saveBatch = async () => {
    const entries = selectedEntries.value
    if (entries.length === 0) {
      toast('No entries selected')
      return
    }
    
    // Filter out entries that don't have required fields
    const validEntries = entries.filter(entry => 
      entry.key && entry.title && entry.authors && entry.year
    )
    
    if (validEntries.length === 0) {
      toast('No valid entries selected (missing required fields)')
      return
    }
    
    if (validEntries.length < entries.length) {
      const skipped = entries.length - validEntries.length
      toast(`Skipping ${skipped} entries with missing required fields`)
    }
    
    isSaving.value = true
    
    try {
      const savedCount = await saveBatchEntries(validEntries)
      toast(`Successfully added ${savedCount} references`)
      
      // Clear the form and close dialog
      clearAll()
      closeDialog()
      
    } catch (error) {
      console.error('Failed to save batch:', error)
      toast('Failed to save references')
    } finally {
      isSaving.value = false
    }
  }
  
  // Save individual entries
  const saveBatchEntries = async (entries: ParsedBibTexEntry[]): Promise<number> => {
    let savedCount = 0
    
    for (const entry of entries) {
      try {
        const citationData = {
          notaId,
          key: entry.key.trim(),
          title: entry.title.trim(),
          authors: entry.authors.trim().split(',').map(author => author.trim()),
          year: entry.year.trim(),
          journal: entry.journal.trim(),
          volume: entry.volume.trim(),
          number: entry.number.trim(),
          pages: entry.pages.trim(),
          publisher: entry.publisher.trim(),
          url: entry.url.trim(),
          doi: entry.doi.trim()
        }
        
        await citationStore.addCitation(
          notaId, 
          citationData as Omit<CitationEntry, 'id' | 'createdAt'>
        )
        
        savedCount++
      } catch (error) {
        console.error(`Failed to save entry ${entry.key}:`, error)
        // Continue with other entries
      }
    }
    
    return savedCount
  }
  
  // Dialog management
  const closeDialog = () => {
    isOpen.value = false
  }
  
  // Watch for dialog open/close to reset state
  watch(isOpen, (newIsOpen) => {
    if (!newIsOpen) {
      // Reset form when dialog closes
      setTimeout(() => {
        clearAll()
      }, 200) // Small delay to allow animation
    }
  })
  
  return {
    // State
    isOpen,
    isSaving,
    
    // BibTeX Parser
    bibtexInput,
    parsedEntries,
    isParsing,
    parseError,
    
    // Selection
    selectedCount,
    selectedEntries,
    
    // Actions
    parseBatchBibTex,
    toggleSelection,
    selectAll,
    deselectAll,
    removeEntry,
    clearAll,
    saveBatch,
    closeDialog,
    
    // Validation
    validateEntry,
    validateAll,
    
    // Utils
    canSave,
    hasValidEntries
  }
}
