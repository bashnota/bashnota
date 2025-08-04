import { ref, computed } from 'vue'
import type { Nota } from '@/features/nota/types/nota'

export function useNotaSelection() {
  const selectedNotas = ref<Set<string>>(new Set())

  // Selection state computeds
  const hasSelection = computed(() => selectedNotas.value.size > 0)
  const selectionCount = computed(() => selectedNotas.value.size)
  
  const createSelectionForPage = (pageItems: Nota[]) => {
    const isAllSelected = computed(() => 
      pageItems.length > 0 && 
      pageItems.every(nota => selectedNotas.value.has(nota.id))
    )

    const isIndeterminate = computed(() => {
      const pageSelection = pageItems.filter(nota => selectedNotas.value.has(nota.id))
      return pageSelection.length > 0 && pageSelection.length < pageItems.length
    })

    const handleSelectAll = () => {
      const newSelection = new Set(selectedNotas.value)
      if (isAllSelected.value) {
        // Deselect all on current page
        pageItems.forEach(nota => {
          newSelection.delete(nota.id)
        })
      } else {
        // Select all on current page
        pageItems.forEach(nota => {
          newSelection.add(nota.id)
        })
      }
      selectedNotas.value = newSelection
    }

    return {
      isAllSelected,
      isIndeterminate,
      handleSelectAll,
    }
  }

  // Individual selection methods
  const handleSelectNota = (id: string, selected: boolean) => {
    // Create a new Set to trigger reactivity
    const newSelection = new Set(selectedNotas.value)
    if (selected) {
      newSelection.add(id)
    } else {
      newSelection.delete(id)
    }
    selectedNotas.value = newSelection
  }

  const isNotaSelected = (id: string) => selectedNotas.value.has(id)

  const toggleNotaSelection = (id: string) => {
    const newSelection = new Set(selectedNotas.value)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    selectedNotas.value = newSelection
  }

  // Bulk operations
  const clearSelection = () => {
    selectedNotas.value = new Set()
  }

  const selectAll = (notas: Nota[]) => {
    const newSelection = new Set(selectedNotas.value)
    notas.forEach(nota => {
      newSelection.add(nota.id)
    })
    selectedNotas.value = newSelection
  }

  const getSelectedIds = () => Array.from(selectedNotas.value)

  const getSelectedNotas = (allNotas: Nota[]) => 
    allNotas.filter(nota => selectedNotas.value.has(nota.id))

  return {
    // State
    selectedNotas,
    
    // Computed
    hasSelection,
    selectionCount,
    
    // Methods
    createSelectionForPage,
    handleSelectNota,
    isNotaSelected,
    toggleNotaSelection,
    clearSelection,
    selectAll,
    getSelectedIds,
    getSelectedNotas,
  }
}
