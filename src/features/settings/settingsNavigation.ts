import {
  FileText,
  Keyboard,
  Palette,
  Plug,
  Settings,
  SparklesIcon,
} from 'lucide-vue-next'
import type { Component } from 'vue'

export interface SettingDestination {
  id: string
  title: string
  component: string
  description: string
  keywords: string[]
}

export interface SettingsCategory {
  id: string
  title: string
  icon: Component
  destinations: SettingDestination[]
}

export const settingsCategories: SettingsCategory[] = [
  {
    id: 'editor',
    title: 'Editor',
    icon: FileText,
    destinations: [
      {
        id: 'unified-editor',
        title: 'Editor defaults',
        component: 'UnifiedEditorSettings',
        description: 'Typography, code editing, formatting, and autosave.',
        keywords: ['text', 'code', 'font', 'tab', 'spell check', 'autosave'],
      },
    ],
  },
  {
    id: 'appearance',
    title: 'Appearance',
    icon: Palette,
    destinations: [
      {
        id: 'unified-appearance',
        title: 'Theme and interface',
        component: 'UnifiedAppearanceSettings',
        description: 'Color theme, density, and interface preferences.',
        keywords: ['theme', 'dark', 'light', 'color', 'layout', 'density'],
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI assistant',
    icon: SparklesIcon,
    destinations: [
      {
        id: 'unified-ai',
        title: 'Providers and models',
        component: 'UnifiedAISettings',
        description: 'Connect providers and choose the models BashNota uses.',
        keywords: ['ai', 'provider', 'model', 'openai', 'gemini', 'webllm', 'api key'],
      },
      {
        id: 'ai-actions',
        title: 'Writing actions',
        component: 'AIActionsSettings',
        description: 'Choose the AI actions available for written notes.',
        keywords: ['rewrite', 'grammar', 'summarize', 'writing'],
      },
      {
        id: 'ai-code-actions',
        title: 'Code actions',
        component: 'AICodeActionsSettings',
        description: 'Choose AI actions for code blocks.',
        keywords: ['code', 'refactor', 'explain', 'optimize'],
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Plug,
    destinations: [
      {
        id: 'jupyter',
        title: 'Jupyter servers',
        component: 'JupyterSettings',
        description: 'Connect kernels for running notebook code.',
        keywords: ['jupyter', 'kernel', 'python', 'server', 'notebook'],
      },
      {
        id: 'external-tools',
        title: 'External tools',
        component: 'ExternalToolsSettings',
        description: 'Configure tools that work alongside BashNota.',
        keywords: ['external', 'tools', 'integration'],
      },
    ],
  },
  {
    id: 'keyboard',
    title: 'Keyboard shortcuts',
    icon: Keyboard,
    destinations: [
      {
        id: 'editor-shortcuts',
        title: 'Editor shortcuts',
        component: 'EditorShortcutsSettings',
        description: 'Shortcuts used while writing and editing.',
        keywords: ['keyboard', 'shortcut', 'hotkey', 'editor'],
      },
      {
        id: 'navigation-shortcuts',
        title: 'Navigation shortcuts',
        component: 'NavigationShortcutsSettings',
        description: 'Move through BashNota without leaving the keyboard.',
        keywords: ['keyboard', 'shortcut', 'navigation', 'move'],
      },
      {
        id: 'global-shortcuts',
        title: 'Global shortcuts',
        component: 'GlobalShortcutsSettings',
        description: 'Commands available throughout the app.',
        keywords: ['keyboard', 'shortcut', 'global', 'command'],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Data and system',
    icon: Settings,
    destinations: [
      {
        id: 'unified-advanced',
        title: 'Advanced defaults',
        component: 'UnifiedAdvancedSettings',
        description: 'Performance, privacy, backup, and recovery defaults.',
        keywords: ['advanced', 'performance', 'privacy', 'backup', 'recovery'],
      },
      {
        id: 'storage-mode',
        title: 'Storage mode',
        component: 'StorageModeSettings',
        description: 'Choose where your local notes are stored.',
        keywords: ['storage', 'filesystem', 'indexeddb', 'local'],
      },
      {
        id: 'data-management',
        title: 'Data management',
        component: 'DataManagementSettings',
        description: 'Back up, restore, export, or remove local data.',
        keywords: ['data', 'backup', 'restore', 'export', 'delete'],
      },
      {
        id: 'system-info',
        title: 'System information',
        component: 'SystemInfoSettings',
        description: 'Inspect this installation and its capabilities.',
        keywords: ['system', 'version', 'browser', 'diagnostics'],
      },
    ],
  },
]

export const allSettingDestinations = settingsCategories.flatMap(category =>
  category.destinations.map(destination => ({ ...destination, category: category.title, icon: category.icon })),
)

export function findSettingDestination(id: string) {
  return allSettingDestinations.find(destination => destination.id === id)
}
