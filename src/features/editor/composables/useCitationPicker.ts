import { ref } from 'vue'
import type { CitationEntry } from '@/features/nota/types/nota'

interface CitationPickerState {
  isOpen: boolean
  notaId: string | null
  onSelect: ((citation: CitationEntry, index: number) => void) | null
  onClose: (() => void) | null
}

const state = ref<CitationPickerState>({
  isOpen: false,
  notaId: null,
  onSelect: null,
  onClose: null
})

export function useCitationPicker() {
  const openCitationPicker = (
    notaId: string,
    onSelect: (citation: CitationEntry, index: number) => void,
    onClose: () => void
  ) => {
    state.value = {
      isOpen: true,
      notaId,
      onSelect,
      onClose
    }
  }

  const closeCitationPicker = () => {
    if (state.value.onClose) {
      state.value.onClose()
    }
    state.value = {
      isOpen: false,
      notaId: null,
      onSelect: null,
      onClose: null
    }
  }

  const selectCitation = (citation: CitationEntry, index: number) => {
    if (state.value.onSelect) {
      state.value.onSelect(citation, index)
    }
    closeCitationPicker()
  }

  return {
    state,
    openCitationPicker,
    closeCitationPicker,
    selectCitation
  }
}
