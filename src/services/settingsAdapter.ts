import { ConsolidatedSettingsService } from './consolidatedSettingsService'
import type { AllSettings } from '@/features/settings/types'

/**
 * Settings adapter that bridges the old localStorage-based settings
 * with the new ConsolidatedSettingsService
 */
export class SettingsAdapter {
  private service: ConsolidatedSettingsService | null = null
  private useNewSettings: boolean

  constructor(useNewSettings = false) {
    this.useNewSettings = useNewSettings
  }

  /**
   * Initialize the settings adapter
   */
  async initialize(): Promise<void> {
    if (this.useNewSettings) {
      // Create a simple backend that uses localStorage as fallback
      const backend = {
        async read(): Promise<string | null> {
          return localStorage.getItem('bashnota-consolidated-settings')
        },
        async write(data: string): Promise<void> {
          localStorage.setItem('bashnota-consolidated-settings', data)
        },
        async delete(): Promise<void> {
          localStorage.removeItem('bashnota-consolidated-settings')
        }
      }

      this.service = new ConsolidatedSettingsService(backend)
      await this.service.initialize()

      // Check if migration needed
      const hasOldSettings = this.hasOldSettings()
      if (hasOldSettings) {
        await this.migrateFromOldFormat()
      }
    }
  }

  /**
   * Check if old localStorage settings exist
   */
  private hasOldSettings(): boolean {
    const oldKeys = [
      'editor-settings',
      'ai-settings',
      'keyboard-settings',
      'integration-settings',
      'advanced-settings',
      'theme-settings',
      'interface-settings'
    ]
    return oldKeys.some(key => localStorage.getItem(key) !== null)
  }

  /**
   * Migrate from old localStorage format to consolidated settings
   */
  private async migrateFromOldFormat(): Promise<void> {
    if (!this.service) return

    const oldData: Record<string, string> = {}
    
    // Collect all old settings
    const keys = [
      'editor-settings',
      'ai-settings',
      'keyboard-settings',
      'integration-settings',
      'advanced-settings',
      'theme-settings',
      'interface-settings'
    ]

    for (const key of keys) {
      const value = localStorage.getItem(key)
      if (value) {
        oldData[key] = value
      }
    }

    // Migrate using the service
    await this.service.migrateFromLocalStorage(oldData)
    
    console.log('[SettingsAdapter] Migrated settings from old localStorage format')
  }

  /**
   * Load all settings
   */
  async loadSettings(): Promise<AllSettings> {
    if (this.useNewSettings && this.service) {
      // Use new consolidated service
      const allSettings = await this.service.getAll()
      return allSettings as AllSettings
    } else {
      // Use old localStorage method
      return this.loadFromLocalStorage()
    }
  }

  /**
   * Save settings
   */
  async saveSettings(settings: AllSettings): Promise<void> {
    if (this.useNewSettings && this.service) {
      // Save using new service
      for (const [category, data] of Object.entries(settings)) {
        await this.service.setCategory(category as any, data)
      }
    } else {
      // Save using old localStorage method
      this.saveToLocalStorage(settings)
    }
  }

  /**
   * Get a specific setting by path
   */
  async getSetting(path: string): Promise<any> {
    if (this.useNewSettings && this.service) {
      return await this.service.get(path)
    } else {
      // Parse path and get from localStorage
      const [category, ...rest] = path.split('.')
      const key = `${category}-settings`
      const stored = localStorage.getItem(key)
      if (!stored) return undefined

      try {
        const data = JSON.parse(stored)
        let value = data
        for (const part of rest) {
          value = value?.[part]
        }
        return value
      } catch {
        return undefined
      }
    }
  }

  /**
   * Set a specific setting by path
   */
  async setSetting(path: string, value: any): Promise<void> {
    if (this.useNewSettings && this.service) {
      await this.service.set(path, value)
    } else {
      // Parse path and set in localStorage
      const [category, ...rest] = path.split('.')
      const key = `${category}-settings`
      const stored = localStorage.getItem(key)
      
      let data = {}
      if (stored) {
        try {
          data = JSON.parse(stored)
        } catch {
          data = {}
        }
      }

      // Set nested value
      let current: any = data
      for (let i = 0; i < rest.length - 1; i++) {
        if (!(rest[i] in current)) {
          current[rest[i]] = {}
        }
        current = current[rest[i]]
      }
      current[rest[rest.length - 1]] = value

      localStorage.setItem(key, JSON.stringify(data))
    }
  }

  /**
   * Reset a category to defaults
   */
  async resetCategory(category: string): Promise<void> {
    if (this.useNewSettings && this.service) {
      await this.service.resetCategory(category as any)
    } else {
      // Remove from localStorage
      localStorage.removeItem(`${category}-settings`)
    }
  }

  /**
   * Export settings as JSON
   */
  async exportSettings(): Promise<string> {
    if (this.useNewSettings && this.service) {
      return await this.service.export()
    } else {
      const settings = await this.loadSettings()
      return JSON.stringify(settings, null, 2)
    }
  }

  /**
   * Import settings from JSON
   */
  async importSettings(json: string): Promise<void> {
    if (this.useNewSettings && this.service) {
      await this.service.import(json)
    } else {
      const settings = JSON.parse(json)
      await this.saveSettings(settings)
    }
  }

  /**
   * Toggle between old and new settings
   */
  setUseNewSettings(use: boolean): void {
    this.useNewSettings = use
  }

  /**
   * Check if using new settings
   */
  isUsingNewSettings(): boolean {
    return this.useNewSettings
  }

  // Private helpers for old localStorage method
  private loadFromLocalStorage(): AllSettings {
    const settings: any = {
      editor: {},
      appearance: {},
      ai: {},
      keyboard: {},
      integrations: {},
      advanced: {}
    }

    // Load each category
    const categories = ['editor', 'ai', 'keyboard', 'integrations', 'advanced']
    for (const category of categories) {
      const stored = localStorage.getItem(`${category}-settings`)
      if (stored) {
        try {
          settings[category] = JSON.parse(stored)
        } catch {
          settings[category] = {}
        }
      }
    }

    // Handle appearance separately
    const themeSettings = localStorage.getItem('theme-settings')
    const interfaceSettings = localStorage.getItem('interface-settings')
    if (themeSettings) {
      try {
        settings.appearance = { ...settings.appearance, ...JSON.parse(themeSettings) }
      } catch {}
    }
    if (interfaceSettings) {
      try {
        settings.appearance = { ...settings.appearance, ...JSON.parse(interfaceSettings) }
      } catch {}
    }

    return settings
  }

  private saveToLocalStorage(settings: AllSettings): void {
    // Save each category
    for (const [category, data] of Object.entries(settings)) {
      if (category === 'appearance') {
        // Split appearance into theme and interface for backward compatibility
        localStorage.setItem('theme-settings', JSON.stringify(data))
        localStorage.setItem('interface-settings', JSON.stringify(data))
      } else {
        localStorage.setItem(`${category}-settings`, JSON.stringify(data))
      }
    }
  }
}

/**
 * Global settings adapter instance
 */
export let settingsAdapter: SettingsAdapter | null = null

/**
 * Initialize the settings adapter
 */
export async function initializeSettingsAdapter(
  useNewSettings = false
): Promise<SettingsAdapter> {
  settingsAdapter = new SettingsAdapter(useNewSettings)
  await settingsAdapter.initialize()
  return settingsAdapter
}

/**
 * Get the settings adapter instance
 */
export function useSettingsAdapter(): SettingsAdapter {
  if (!settingsAdapter) {
    throw new Error('SettingsAdapter not initialized. Call initializeSettingsAdapter() first.')
  }
  return settingsAdapter
}
