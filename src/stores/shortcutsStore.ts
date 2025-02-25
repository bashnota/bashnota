import { defineStore } from 'pinia'

export const useShortcutsStore = defineStore('shortcuts', {
  state: () => ({
    generalShortcuts: [
      { key: '⌘ K', description: 'Open global search' },
      { key: '⌘ N', description: 'Create new nota' },
      { key: '⌘ /', description: 'Focus editor' },
      { key: '/', description: 'Open commands menu (in editor)' },
      { key: '⌘ B', description: 'Bold text (in editor)' },
      { key: '⌘ I', description: 'Italic text (in editor)' },
      { key: 'Esc', description: 'Close dialogs / Cancel editing' },
    ],
    blockShortcuts: [
      { key: 'Ctrl+Shift+Alt+C', description: 'Insert code block' },
      { key: 'Ctrl+Shift+Alt+T', description: 'Insert table' },
      { key: 'Ctrl+Shift+Alt+I', description: 'Insert image' },
      { key: 'Ctrl+Shift+Alt+M', description: 'Insert math block' },
      { key: 'Ctrl+Shift+Alt+D', description: 'Insert Mermaid diagram' },
      { key: 'Ctrl+Shift+Alt+Y', description: 'Insert YouTube video' },
      { key: 'Ctrl+Shift+Alt+S', description: 'Insert scatter plot' },
      { key: 'Ctrl+Shift+Alt+F', description: 'Insert subfigures' },
      { key: 'Ctrl+Shift+Alt+H', description: 'Insert horizontal rule' },
      { key: 'Ctrl+Shift+Alt+Q', description: 'Insert blockquote' },
      { key: 'Ctrl+Shift+Alt+K', description: 'Insert task list' },
      { key: 'Ctrl+Shift+Alt+G', description: 'Insert Draw.io diagram' },
      { key: 'Ctrl+Shift+Alt+B', description: 'Insert data table' },
    ],
  }),
}) 