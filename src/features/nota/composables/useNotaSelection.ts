import { ref, computed } from 'vue'
import type { Nota } from '@/features/nota/types/nota'

export function useNotaSelection() {
  const selectedNotas = ref<Set<string>>(new Set())

  // Selection state computeds
  const hasSelection = computed(() => selectedNotas.value.size > 0)
  
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
      if (isAllSelected.value) {
        // Deselect all on current page
        pageItems.forEach(nota => {
          selectedNotas.value.delete(nota.id)
        })
      } else {
        // Select all on current page
        pageItems.forEach(nota => {
          selectedNotas.value.add(nota.id)
        })
      }
    }

    return {
      isAllSelected,
      isIndeterminate,
      handleSelectAll,
    }
  }

  // Individual selection methods
  const handleSelectNota = (id: string, selected: boolean) => {
    if (selected) {
      selectedNotas.value.add(id)
    } else {
      selectedNotas.value.delete(id)
    }
  }

  const isNotaSelected = (id: string) => selectedNotas.value.has(id)

  const toggleNotaSelection = (id: string) => {
    if (selectedNotas.value.has(id)) {
      selectedNotas.value.delete(id)
    } else {
      selectedNotas.value.add(id)
    }
  }

  // Bulk operations
  const clearSelection = () => {
    selectedNotas.value.clear()
  }

  const selectAll = (notas: Nota[]) => {
    notas.forEach(nota => {
      selectedNotas.value.add(nota.id)
    })
  }

  const getSelectedIds = () => Array.from(selectedNotas.value)

  const getSelectedNotas = (allNotas: Nota[]) => 
    allNotas.filter(nota => selectedNotas.value.has(nota.id))

  return {
    // State
    selectedNotas,
    
    // Computed
    hasSelection,
    
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
