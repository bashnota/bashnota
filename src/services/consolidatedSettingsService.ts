/**
 * Consolidated Settings Service
 * 
 * Consolidates 15+ localStorage keys into single file-based settings
 */

import { logger } from './logger'

export interface SettingsSchema {
  editor: {
    fontSize: number
    fontFamily: string
    lineHeight: number
    tabSize: number
  }
  appearance: {
    theme: 'light' | 'dark' | 'auto'
    sidebarPosition: 'left' | 'right'
    compactMode: boolean
  }
  ai: {
    enabled: boolean
    providers: Record<string, any>
  }
  keyboard: {
    shortcuts: Record<string, string>
  }
  integrations: {
    github: { enabled: boolean }
    jupyter: { enabled: boolean }
  }
  advanced: {
    developerMode: boolean
    debugLogs: boolean
  }
}

export interface SettingsBackend {
  readSettings(): Promise<Partial<SettingsSchema> | null>
  writeSettings(settings: Partial<SettingsSchema>): Promise<void>
  deleteSettings(): Promise<void>
}

const DEFAULT_SETTINGS: SettingsSchema = {
  editor: { fontSize: 14, fontFamily: 'monospace', lineHeight: 1.6, tabSize: 2 },
  appearance: { theme: 'auto', sidebarPosition: 'left', compactMode: false },
  ai: { enabled: true, providers: {} },
  keyboard: { shortcuts: {} },
  integrations: { github: { enabled: false }, jupyter: { enabled: true } },
  advanced: { developerMode: false, debugLogs: false }
}

export class ConsolidatedSettingsService {
  private settings: SettingsSchema = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  private initialized = false

  constructor(private backend: SettingsBackend) {}

  async initialize(): Promise<void> {
    try {
      const stored = await this.backend.readSettings()
      if (stored) {
        this.settings = this.mergeWithDefaults(stored)
      }
      this.initialized = true
      logger.info('[ConsolidatedSettings] Initialized')
    } catch (error) {
      logger.error('[ConsolidatedSettings] Failed to initialize:', error)
      this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
      this.initialized = true
    }
  }

  async getAll(): Promise<SettingsSchema> {
    this.ensureInitialized()
    return JSON.parse(JSON.stringify(this.settings))
  }

  async get(path: string): Promise<any> {
    this.ensureInitialized()
    const parts = path.split('.')
    let value: any = this.settings
    for (const part of parts) {
      value = value?.[part]
    }
    return value
  }

  async set(path: string, value: any): Promise<void> {
    this.ensureInitialized()
    
    if (path === 'editor.fontSize' && (typeof value !== 'number' || value < 8 || value > 32)) {
      throw new Error('Invalid fontSize')
    }
    
    const parts = path.split('.')
    let target: any = this.settings
    
    // Create nested objects if they don't exist
    for (let i = 0; i < parts.length - 1; i++) {
      if (target[parts[i]] === undefined || typeof target[parts[i]] !== 'object') {
        target[parts[i]] = {}
      }
      target = target[parts[i]]
    }
    
    target[parts[parts.length - 1]] = value
    await this.save()
    logger.debug(`[ConsolidatedSettings] Set ${path}`)
  }

  async getCategory(category: keyof SettingsSchema): Promise<any> {
    this.ensureInitialized()
    return JSON.parse(JSON.stringify(this.settings[category]))
  }

  async updateCategory(category: keyof SettingsSchema, data: any): Promise<void> {
    this.ensureInitialized()
    this.settings[category] = { ...this.settings[category], ...data }
    await this.save()
    logger.debug(`[ConsolidatedSettings] Updated category: ${category}`)
  }

  async resetCategory(category: keyof SettingsSchema): Promise<void> {
    this.ensureInitialized()
    this.settings[category] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[category]))
    await this.save()
    logger.debug(`[ConsolidatedSettings] Reset category: ${category}`)
  }

  async export(): Promise<string> {
    this.ensureInitialized()
    return JSON.stringify(this.settings, null, 2)
  }

  async import(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data)
      this.settings = this.mergeWithDefaults(parsed)
      await this.save()
      logger.info('[ConsolidatedSettings] Imported settings')
    } catch (error) {
      logger.error('[ConsolidatedSettings] Failed to import:', error)
      throw new Error('Invalid settings format')
    }
  }

  async migrateFromLocalStorage(oldData: Record<string, string>): Promise<void> {
    // Initialize first
    if (!this.initialized) {
      await this.initialize()
    }
    
    const migrated: Partial<SettingsSchema> = {}
    
    if (oldData['editor-settings']) {
      try {
        migrated.editor = JSON.parse(oldData['editor-settings'])
      } catch (e) { /* ignore */ }
    }
    
    if (oldData['appearance-settings']) {
      try {
        migrated.appearance = JSON.parse(oldData['appearance-settings'])
      } catch (e) { /* ignore */ }
    }
    
    this.settings = this.mergeWithDefaults(migrated)
    await this.save()
    logger.info('[ConsolidatedSettings] Migrated from localStorage')
  }

  private async save(): Promise<void> {
    try {
      await this.backend.writeSettings(this.settings)
    } catch (error) {
      logger.error('[ConsolidatedSettings] Failed to save:', error)
      throw error
    }
  }

  private mergeWithDefaults(partial: Partial<SettingsSchema>): SettingsSchema {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
    return {
      editor: { ...defaults.editor, ...partial.editor },
      appearance: { ...defaults.appearance, ...partial.appearance },
      ai: { ...defaults.ai, ...partial.ai },
      keyboard: { ...defaults.keyboard, ...partial.keyboard },
      integrations: { ...defaults.integrations, ...partial.integrations },
      advanced: { ...defaults.advanced, ...partial.advanced }
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('ConsolidatedSettingsService not initialized')
    }
  }
}
