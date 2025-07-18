import { defineStore } from 'pinia'
import { logger } from '@/services/logger'

// Define a type for shortcuts
interface Shortcut {
  id?: string;
  key: string;
  description: string;
  category?: string;
}

// Define default shortcuts
const defaultGeneralShortcuts: Shortcut[] = [
  { id: 'global-search', key: 'Ctrl+Shift+Alt+Space', description: 'Open global search' },
  { id: 'new-nota', key: 'Ctrl+Shift+Alt+N', description: 'Create new nota' },
  { id: 'focus-editor', key: 'Ctrl+Shift+Alt+E', description: 'Focus editor' },
  { id: 'commands-menu', key: 'Ctrl+Shift+Alt+/', description: 'Open commands menu (in editor)' },
  { id: 'bold-text', key: 'Ctrl+Shift+Alt+B', description: 'Bold text (in editor)' },
  { id: 'italic-text', key: 'Ctrl+Shift+Alt+I', description: 'Italic text (in editor)' },
  { id: 'escape', key: 'Esc', description: 'Close dialogs / Cancel editing' },
  { id: 'ai-generation', key: 'Ctrl+Shift+Alt+G', description: 'AI text generation' },
  { id: 'favorites-sidebar', key: 'Ctrl+Shift+Alt+V', description: 'Toggle favorites sidebar' },
  { id: 'favorites-search', key: 'Ctrl+Shift+Alt+P', description: 'Search in favorites' },
]

const defaultBlockShortcuts: Shortcut[] = [
  { id: 'insert-code', key: 'Ctrl+Shift+Alt+C', description: 'Insert code block' },
  { id: 'insert-table', key: 'Ctrl+Shift+Alt+T', description: 'Insert table' },
  { id: 'insert-image', key: 'Ctrl+Shift+Alt+I', description: 'Insert image' },
  { id: 'insert-math', key: 'Ctrl+Shift+Alt+M', description: 'Insert math block' },
  { id: 'insert-mermaid', key: 'Ctrl+Shift+Alt+D', description: 'Insert Mermaid diagram' },
  { id: 'insert-youtube', key: 'Ctrl+Shift+Alt+Y', description: 'Insert YouTube video' },
  { id: 'insert-subfigures', key: 'Ctrl+Shift+Alt+F', description: 'Insert subfigures' },
  { id: 'insert-hr', key: 'Ctrl+Shift+Alt+H', description: 'Insert horizontal rule' },
  { id: 'insert-blockquote', key: 'Ctrl+Shift+Alt+Q', description: 'Insert blockquote' },
  { id: 'insert-tasklist', key: 'Ctrl+Shift+Alt+K', description: 'Insert task list' },
  { id: 'insert-drawio', key: 'Ctrl+Shift+Alt+G', description: 'Insert Draw.io diagram' },
  { id: 'insert-notatable', key: 'Ctrl+Shift+Alt+B', description: 'Insert nota table' },
  { id: 'insert-ai-block', key: 'Ctrl+Shift+Alt+A', description: 'Insert inline AI generation block' },
]

export const useShortcutsStore = defineStore('shortcuts', {
  state: () => ({
    generalShortcuts: [...defaultGeneralShortcuts],
    blockShortcuts: [...defaultBlockShortcuts],
  }),
  
  getters: {
    shortcuts: (state) => {
      return [...state.generalShortcuts, ...state.blockShortcuts]
    }
  },
  
  actions: {
    updateShortcut(id: string, updatedShortcut: Shortcut) {
      // Find if the shortcut is in general or block shortcuts
      const generalIndex = this.generalShortcuts.findIndex(s => s.id === id)
      if (generalIndex !== -1) {
        this.generalShortcuts[generalIndex] = { ...this.generalShortcuts[generalIndex], ...updatedShortcut }
        this.saveShortcuts()
        return
      }
      
      const blockIndex = this.blockShortcuts.findIndex(s => s.id === id)
      if (blockIndex !== -1) {
        this.blockShortcuts[blockIndex] = { ...this.blockShortcuts[blockIndex], ...updatedShortcut }
        this.saveShortcuts()
      }
    },
    
    resetShortcut(id: string) {
      // Find the default shortcut by id
      const defaultGeneral = defaultGeneralShortcuts.find(s => s.id === id)
      if (defaultGeneral) {
        const index = this.generalShortcuts.findIndex(s => s.id === id)
        if (index !== -1) {
          this.generalShortcuts[index] = { ...defaultGeneral }
          this.saveShortcuts()
          return
        }
      }
      
      const defaultBlock = defaultBlockShortcuts.find(s => s.id === id)
      if (defaultBlock) {
        const index = this.blockShortcuts.findIndex(s => s.id === id)
        if (index !== -1) {
          this.blockShortcuts[index] = { ...defaultBlock }
          this.saveShortcuts()
        }
      }
    },

    resetToDefaults() {
      this.generalShortcuts = [...defaultGeneralShortcuts]
      this.blockShortcuts = [...defaultBlockShortcuts]
      this.saveShortcuts()
    },
    
    saveShortcuts() {
      localStorage.setItem('shortcuts', JSON.stringify({
        generalShortcuts: this.generalShortcuts,
        blockShortcuts: this.blockShortcuts
      }))
    },
    
    loadShortcuts() {
      const savedShortcuts = localStorage.getItem('shortcuts')
      if (savedShortcuts) {
        try {
          const parsed = JSON.parse(savedShortcuts)
          if (parsed.generalShortcuts) this.generalShortcuts = parsed.generalShortcuts
          if (parsed.blockShortcuts) this.blockShortcuts = parsed.blockShortcuts
        } catch (e) {
          logger.error('Failed to parse saved shortcuts', e)
        }
      }
    }
  }
})








