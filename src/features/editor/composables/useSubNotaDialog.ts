import { ref } from 'vue'

interface SubNotaDialogState {
  isOpen: boolean
  parentId: string | null
  onSubmit: ((title: string) => Promise<{ id: string; title: string }>) | null
  onCancel: (() => void) | null
}

const state = ref<SubNotaDialogState>({
  isOpen: false,
  parentId: null,
  onSubmit: null,
  onCancel: null
})

export function useSubNotaDialog() {
  const openSubNotaDialog = (
    parentId: string,
    onSubmit: (title: string) => Promise<{ id: string; title: string }>,
    onCancel: () => void
  ) => {
    state.value = {
      isOpen: true,
      parentId,
      onSubmit,
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
      onSubmit: null,
      onCancel: null
    }
  }

  const submitSubNota = async (title: string) => {
    const submit = state.value.onSubmit
    if (!submit) throw new Error('Sub-nota creation is unavailable.')
    const created = await submit(title)
    state.value = {
      isOpen: false,
      parentId: null,
      onSubmit: null,
      onCancel: null,
    }
    return created
  }

  return {
    state,
    openSubNotaDialog,
    closeSubNotaDialog,
    submitSubNota
  }
}
