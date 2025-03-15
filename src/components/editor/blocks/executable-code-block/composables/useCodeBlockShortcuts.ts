import { onMounted, onBeforeUnmount } from 'vue'

interface ShortcutOptions {
  onExecute: () => void
  onSave: () => void
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

    // Save changes: Ctrl+S
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      options.onSave()
      return
    }

    // Toggle fullscreen: Ctrl+M
    if (e.ctrlKey && e.key === 'm') {
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
      save: 'Ctrl+S',
      fullscreen: 'Ctrl+M',
    },
  }
} 