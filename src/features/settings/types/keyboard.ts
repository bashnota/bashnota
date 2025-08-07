export interface KeyboardShortcut {
  id: string
  key: string
  description: string
  category: 'editor' | 'navigation' | 'global'
  enabled: boolean
}

export interface KeyboardSettings {
  shortcuts: KeyboardShortcut[]
  enableVimMode: boolean
  enableEmacs: boolean
  customKeymap: Record<string, string>
}

export const keyboardSettingsDefaults: KeyboardSettings = {
  shortcuts: [
    { id: 'bold-text', key: 'Ctrl+B', description: 'Bold Text', category: 'editor', enabled: true },
    { id: 'italic-text', key: 'Ctrl+I', description: 'Italic Text', category: 'editor', enabled: true },
    { id: 'commands-menu', key: 'Ctrl+Shift+P', description: 'Commands Menu', category: 'global', enabled: true },
    { id: 'focus-editor', key: 'Ctrl+E', description: 'Focus Editor', category: 'editor', enabled: true }
  ],
  enableVimMode: false,
  enableEmacs: false,
  customKeymap: {}
}
