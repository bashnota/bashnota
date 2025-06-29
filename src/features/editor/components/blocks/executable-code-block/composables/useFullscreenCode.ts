import { ref, computed } from 'vue'

export function useFullscreenCode() {
  const resizing = ref(false)
  const splitPosition = ref(50) // Default split at 50%
  const startX = ref(0)
  const isOutputFullscreen = ref(false)
  const originalCodeBeforeExecution = ref('')

  // Helper function to detect Mac OS
  const isMac = () => {
    return typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent, onClose: () => void, isExecuting: boolean) => {
    if (e.key === 'Escape' && !isExecuting) {
      if (isOutputFullscreen.value) {
        isOutputFullscreen.value = false
        e.preventDefault()
        return
      }
      onClose()
    }
  }

  // Start resizing panels
  const startResize = (e: MouseEvent) => {
    resizing.value = true
    startX.value = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // Handle resize movement
  const handleResize = (e: MouseEvent) => {
    if (!resizing.value) return

    const containerWidth = document.querySelector('.editor-container')?.clientWidth || 0
    const deltaX = e.clientX - startX.value
    const newPosition =
      (((splitPosition.value * containerWidth) / 100 + deltaX) / containerWidth) * 100

    // Limit the resize range (10% to 90%)
    splitPosition.value = Math.min(Math.max(newPosition, 10), 90)
    startX.value = e.clientX
  }

  // End resizing
  const endResize = () => {
    resizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  // Toggle output fullscreen mode
  const toggleOutputFullscreen = () => {
    isOutputFullscreen.value = !isOutputFullscreen.value
    if (isOutputFullscreen.value) {
      splitPosition.value = 0 // Hide editor when output is fullscreen
    } else {
      splitPosition.value = 50 // Reset to default split
    }
  }

  // Computed styles for editor and output containers
  const editorContainerStyle = computed(() => ({
    width: isOutputFullscreen.value ? '0%' : `${splitPosition.value}%`,
    display: isOutputFullscreen.value ? 'none' : 'block'
  }))

  const outputContainerStyle = computed(() => ({
    width: isOutputFullscreen.value ? '100%' : `${100 - splitPosition.value}%`
  }))

  return {
    resizing,
    splitPosition,
    isOutputFullscreen,
    originalCodeBeforeExecution,
    isMac,
    handleKeyDown,
    startResize,
    handleResize,
    endResize,
    toggleOutputFullscreen,
    editorContainerStyle,
    outputContainerStyle
  }
} 








