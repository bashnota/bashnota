import { ref, computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Nota } from '@/features/nota/types/nota'

export function useNotaSelection() {
  const selectedNotas = ref<Set<string>>(new Set())

  // Selection state computeds
  const hasSelection = computed(() => selectedNotas.value.size > 0)
  const selectionCount = computed(() => selectedNotas.value.size)
  
  const createSelectionForPage = (pageItems: MaybeRefOrGetter<readonly Nota[]>) => {
    const currentPageItems = () => toValue(pageItems)

    const isAllSelected = computed(() =>
      currentPageItems().length > 0 &&
      currentPageItems().every(nota => selectedNotas.value.has(nota.id))
    )

    const isIndeterminate = computed(() => {
      const items = currentPageItems()
      const pageSelection = items.filter(nota => selectedNotas.value.has(nota.id))
      return pageSelection.length > 0 && pageSelection.length < items.length
    })

    const handleSelectAll = (selected = !isAllSelected.value) => {
      const items = currentPageItems()
      const newSelection = new Set(selectedNotas.value)
      items.forEach(nota => selected ? newSelection.add(nota.id) : newSelection.delete(nota.id))
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
