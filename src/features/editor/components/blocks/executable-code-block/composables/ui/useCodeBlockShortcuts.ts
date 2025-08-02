import { onMounted, onBeforeUnmount } from 'vue'

interface ShortcutOptions {
  onExecute: () => void
  onToggleFullscreen: () => void
  onFormatCode?: () => void
  isEnabled?: () => boolean
}

export function useCodeBlockShortcuts(options: ShortcutOptions) {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Check if shortcuts are enabled
    if (options.isEnabled && !options.isEnabled()) {
      return
    }

    // Check if we're in an input field or textarea (but allow CodeMirror)
    const target = e.target as HTMLElement
    const isInInput = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.contentEditable === 'true'
    
    // Allow shortcuts in CodeMirror editor
    const isInCodeMirror = target.closest('.cm-editor') !== null

    // Run code: Ctrl+Alt+Shift+Enter (or Cmd+Alt+Shift+Enter on Mac)
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.shiftKey && e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      options.onExecute()
      return
    }

    // Run code alternative: Ctrl+Alt+Shift+R (or Cmd+Alt+Shift+R on Mac)
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.shiftKey && e.key === 'R') {
      e.preventDefault()
      e.stopPropagation()
      options.onExecute()
      return
    }

    // Toggle fullscreen: Ctrl+Alt+Shift+F (or Cmd+Alt+Shift+F on Mac)
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.shiftKey && e.key === 'F') {
      e.preventDefault()
      e.stopPropagation()
      options.onToggleFullscreen()
      return
    }

    // Format code: Ctrl+Alt+Shift+I (or Cmd+Alt+Shift+I on Mac)
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.shiftKey && e.key === 'I' && options.onFormatCode) {
      e.preventDefault()
      e.stopPropagation()
      options.onFormatCode()
      return
    }
  }

  onMounted(() => {
    // Use capture phase to ensure we catch events before other handlers
    document.addEventListener('keydown', handleKeyDown, true)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeyDown, true)
  })

  return {
    shortcuts: {
      execute: 'Ctrl+Alt+Shift+Enter',
      executeAlt: 'Ctrl+Alt+Shift+R',
      fullscreen: 'Ctrl+Alt+Shift+F',
      format: 'Ctrl+Alt+Shift+I',
    },
    
    // Helper to get platform-specific shortcut text
    getShortcutText: (shortcut: string) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      return shortcut.replace(/Ctrl/g, isMac ? 'Cmd' : 'Ctrl')
    }
  }
}








