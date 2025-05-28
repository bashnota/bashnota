import { ref, type Ref } from 'vue'
import type { CitationEntry } from '@/types/nota'

export interface UseReferenceDialogReturn {
  showAddDialog: Ref<boolean>
  isEditing: Ref<boolean>
  currentCitation: Ref<CitationEntry | null>
  openAddDialog: () => void
  editCitation: (citation: CitationEntry) => void
  closeDialog: () => void
}

export function useReferenceDialog(): UseReferenceDialogReturn {
  const showAddDialog = ref(false)
  const isEditing = ref(false)
  const currentCitation = ref<CitationEntry | null>(null)

  const openAddDialog = () => {
    isEditing.value = false
    currentCitation.value = null
    showAddDialog.value = true
  }

  const editCitation = (citation: CitationEntry) => {
    isEditing.value = true
    currentCitation.value = citation
    showAddDialog.value = true
  }

  const closeDialog = () => {
    showAddDialog.value = false
    isEditing.value = false
    currentCitation.value = null
  }

  return {
    showAddDialog,
    isEditing,
    currentCitation,
    openAddDialog,
    editCitation,
    closeDialog
  }
} 