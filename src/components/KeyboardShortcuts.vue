<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'

const router = useRouter()
const store = useNotaStore()

const handleKeydown = (event: KeyboardEvent) => {
  // Only handle if Cmd/Ctrl is pressed
  if (!(event.metaKey || event.ctrlKey)) return

  switch (event.key) {
    case 'b':
      event.preventDefault()
      // Toggle main sidebar
      emit('toggleSidebar')
      break
    case 'e':
      event.preventDefault()
      // Toggle editor sidebar
      emit('toggleEditorSidebar')
      break
    case 'k':
      event.preventDefault()
      // Focus global search
      document.querySelector('.global-search input')?.focus()
      break
    case 'n':
      event.preventDefault()
      createNewNota()
      break
    case '/':
      event.preventDefault()
      // Focus editor
      document.querySelector('.ProseMirror')?.focus()
      break
  }
}

const createNewNota = async () => {
  const nota = await store.createNota('Untitled Nota')
  router.push(`/nota/${nota.id}`)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

defineEmits(['toggleSidebar', 'toggleEditorSidebar'])
</script>

<template>
  <!-- This component doesn't render anything -->
</template>
