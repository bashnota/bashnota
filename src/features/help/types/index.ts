export interface HelpTopic {
  id: string
  title: string
  description: string
  icon?: string
  category: HelpCategory
  content: string
  keywords?: string[]
}

export enum HelpCategory {
  GettingStarted = 'getting-started',
  Editor = 'editor',
  CodeExecution = 'code-execution',
  AI = 'ai',
  Notes = 'notes',
  Settings = 'settings',
  Shortcuts = 'shortcuts',
  Advanced = 'advanced'
}

export interface HelpSection {
  category: HelpCategory
  title: string
  description: string
  topics: HelpTopic[]
}
