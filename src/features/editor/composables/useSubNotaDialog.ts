import { ref } from 'vue'

interface SubNotaDialogState {
  isOpen: boolean
  parentId: string | null
  onSuccess: ((newNotaId: string, title: string) => void) | null
  onCancel: (() => void) | null
}

const state = ref<SubNotaDialogState>({
  isOpen: false,
  parentId: null,
  onSuccess: null,
  onCancel: null
})

export function useSubNotaDialog() {
  const openSubNotaDialog = (
    parentId: string,
    onSuccess: (newNotaId: string, title: string) => void,
    onCancel: () => void
  ) => {
    state.value = {
      isOpen: true,
      parentId,
      onSuccess,
      onCancel
    }
  }

  const closeSubNotaDialog = () => {
    if (state.value.onCancel) {
      state.value.onCancel()
    }
    state.value = {
      isOpen: false,
      parentId: null,
      onSuccess: null,
      onCancel: null
    }
  }

  const handleSuccess = (newNotaId: string, title: string) => {
    if (state.value.onSuccess) {
      state.value.onSuccess(newNotaId, title)
    }
    closeSubNotaDialog()
  }

  return {
    state,
    openSubNotaDialog,
    closeSubNotaDialog,
    handleSuccess
  }
}
