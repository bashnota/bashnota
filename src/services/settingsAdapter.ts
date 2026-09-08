import { ConsolidatedSettingsService } from './consolidatedSettingsService'
import type { AllSettings } from '@/features/settings/types'
import { credentialFreeValue } from '@/utils/credentialPersistence'
import { logger } from '@/services/logger'

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
        type: 'localStorage' as const,
        async read(): Promise<string | null> {
          const data = localStorage.getItem('bashnota-consolidated-settings')
          if (!data) return null
          try {
            const credentialFree = JSON.stringify(credentialFreeValue(JSON.parse(data)))
            if (credentialFree !== data) {
              localStorage.setItem('bashnota-consolidated-settings', credentialFree)
            }
            return credentialFree
          } catch {
            localStorage.removeItem('bashnota-consolidated-settings')
            return null
          }
        },
        async write(data: string): Promise<void> {
          localStorage.setItem(
            'bashnota-consolidated-settings',
            JSON.stringify(credentialFreeValue(JSON.parse(data))),
          )
        },
        async delete(): Promise<void> {
          localStorage.removeItem('bashnota-consolidated-settings')
        },
        async readSettings(): Promise<any> {
          const data = localStorage.getItem('bashnota-consolidated-settings')
          if (!data) return null
          try {
            const parsed = JSON.parse(data)
            const credentialFree = credentialFreeValue(parsed)
            if (JSON.stringify(parsed) !== JSON.stringify(credentialFree)) {
              localStorage.setItem('bashnota-consolidated-settings', JSON.stringify(credentialFree))
            }
            return credentialFree
          } catch {
            localStorage.removeItem('bashnota-consolidated-settings')
            return null
          }
        },
        async writeSettings(settings: any): Promise<void> {
          localStorage.setItem(
            'bashnota-consolidated-settings',
            JSON.stringify(credentialFreeValue(settings)),
          )
        },
        async deleteSettings(): Promise<void> {
          localStorage.removeItem('bashnota-consolidated-settings')
        },
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
      'integrations-settings',
      'advanced-settings',
      'theme-settings',
      'interface-settings',
    ]
    return oldKeys.some((key) => localStorage.getItem(key) !== null)
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
      'integrations-settings',
      'advanced-settings',
      'theme-settings',
      'interface-settings',
    ]

    for (const key of keys) {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          JSON.parse(value)
          oldData[key] = value
        } catch {
          localStorage.removeItem(key)
        }
      }
    }

    // Migrate using the service
    await this.service.migrateFromLocalStorage(oldData)

    // The compatibility keys can remain while the feature flag is toggled, but
    // they must no longer retain credentials collected by older releases.
    for (const [key, value] of Object.entries(oldData)) {
      try {
        localStorage.setItem(key, JSON.stringify(credentialFreeValue(JSON.parse(value))))
      } catch {
        localStorage.removeItem(key)
      }
    }

    logger.info('[SettingsAdapter] Migrated settings from old localStorage format')
  }

  /**
   * Load all settings
   */
  async loadSettings(): Promise<AllSettings> {
    if (this.useNewSettings && this.service) {
      // Use new consolidated service and map to AllSettings format
      const schema = await this.service.getAll()
      // Map SettingsSchema to AllSettings - the schemas should be compatible
      // but AllSettings has more specific types for editor settings
      return schema as unknown as AllSettings
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
      const validCategories = [
        'editor',
        'appearance',
        'ai',
        'keyboard',
        'integrations',
        'advanced',
      ] as const
      for (const [category, data] of Object.entries(settings)) {
        if (validCategories.includes(category as any)) {
          await this.service.updateCategory(category as (typeof validCategories)[number], data)
        }
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
        localStorage.removeItem(key)
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
          localStorage.removeItem(key)
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

      localStorage.setItem(key, JSON.stringify(credentialFreeValue(data)))
    }
  }

  /**
   * Reset a category to defaults
   */
  async resetCategory(
    category: 'editor' | 'appearance' | 'ai' | 'keyboard' | 'integrations' | 'advanced',
  ): Promise<void> {
    if (this.useNewSettings && this.service) {
      await this.service.resetCategory(category)
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
      advanced: {},
    }

    // Load each category
    const categories = ['editor', 'ai', 'keyboard', 'integrations', 'advanced']
    for (const category of categories) {
      const key = `${category}-settings`
      const stored = localStorage.getItem(key)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          settings[category] = credentialFreeValue(parsed)
          if (JSON.stringify(parsed) !== JSON.stringify(settings[category])) {
            localStorage.setItem(`${category}-settings`, JSON.stringify(settings[category]))
          }
        } catch {
          localStorage.removeItem(key)
          settings[category] = {}
        }
      }
    }

    // Handle appearance separately
    const themeSettings = localStorage.getItem('theme-settings')
    const interfaceSettings = localStorage.getItem('interface-settings')
    if (themeSettings) {
      try {
        const parsed = JSON.parse(themeSettings)
        const credentialFree = credentialFreeValue(parsed)
        settings.appearance = {
          ...settings.appearance,
          ...credentialFree,
        }
        if (JSON.stringify(parsed) !== JSON.stringify(credentialFree)) {
          localStorage.setItem('theme-settings', JSON.stringify(credentialFree))
        }
      } catch {
        localStorage.removeItem('theme-settings')
      }
    }
    if (interfaceSettings) {
      try {
        const parsed = JSON.parse(interfaceSettings)
        const credentialFree = credentialFreeValue(parsed)
        settings.appearance = {
          ...settings.appearance,
          ...credentialFree,
        }
        if (JSON.stringify(parsed) !== JSON.stringify(credentialFree)) {
          localStorage.setItem('interface-settings', JSON.stringify(credentialFree))
        }
      } catch {
        localStorage.removeItem('interface-settings')
      }
    }

    return settings
  }

  private saveToLocalStorage(settings: AllSettings): void {
    const credentialFree = credentialFreeValue(settings)
    // Save each category
    for (const [category, data] of Object.entries(credentialFree)) {
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
export async function initializeSettingsAdapter(useNewSettings = false): Promise<SettingsAdapter> {
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
