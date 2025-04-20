import { onMounted, onBeforeUnmount } from 'vue'

interface ShortcutOptions {
  onExecute: () => void
  onToggleFullscreen: () => void
}

export function useCodeBlockShortcuts(options: ShortcutOptions) {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Run code: Ctrl+Shift+Alt+Enter
    if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'Enter') {
      e.preventDefault()
      options.onExecute()
      return
    }

    // Toggle fullscreen: Ctrl+Shift+Alt+F11
    if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'F11') {
      e.preventDefault()
      options.onToggleFullscreen()
      return
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    shortcuts: {
      execute: 'Ctrl+Shift+Alt+Enter',
      fullscreen: 'Ctrl+Shift+Alt+F11',
    },
  }
}