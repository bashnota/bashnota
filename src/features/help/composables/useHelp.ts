import { ref } from 'vue'

const isHelpOpen = ref(false)
const currentTopicId = ref<string | undefined>()
let isListenerAttached = false

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

  // Setup keyboard shortcut (F1) for help - only once globally
  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'F1') {
      event.preventDefault()
      toggleHelp()
    }
  }

  // Attach listener only once globally
  if (!isListenerAttached) {
    window.addEventListener('keydown', handleKeyPress)
    isListenerAttached = true
  }

  return {
    isHelpOpen,
    currentTopicId,
    openHelp,
    closeHelp,
    toggleHelp
  }
}
