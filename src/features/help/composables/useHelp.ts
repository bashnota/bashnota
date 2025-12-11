import { ref, onMounted, onUnmounted } from 'vue'

const isHelpOpen = ref(false)
const currentTopicId = ref<string | undefined>()

export function useHelp() {
  function openHelp(topicId?: string) {
    currentTopicId.value = topicId
    isHelpOpen.value = true
  }

  function closeHelp() {
    isHelpOpen.value = false
    currentTopicId.value = undefined
  }

  function toggleHelp() {
    isHelpOpen.value = !isHelpOpen.value
  }

  // Setup keyboard shortcut (F1) for help
  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'F1') {
      event.preventDefault()
      toggleHelp()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyPress)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyPress)
  })

  return {
    isHelpOpen,
    currentTopicId,
    openHelp,
    closeHelp,
    toggleHelp
  }
}
