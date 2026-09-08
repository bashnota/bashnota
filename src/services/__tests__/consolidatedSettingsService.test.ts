import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Tests for ConsolidatedSettingsService
 *
 * Consolidates 15+ localStorage keys into single file-based settings
 */
describe('ConsolidatedSettingsService', () => {
  let ConsolidatedSettingsService: any
  let mockBackend: any

  beforeEach(async () => {
    // Mock storage backend
    let settingsData: any = null

    mockBackend = {
      readSettings: vi.fn(async () => settingsData),
      writeSettings: vi.fn(async (data: any) => {
        settingsData = data
      }),
      deleteSettings: vi.fn(async () => {
        settingsData = null
      }),
    }

    const module = await import('../consolidatedSettingsService')
    ConsolidatedSettingsService = module.ConsolidatedSettingsService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      const settings = await service.getAll()
      expect(settings).toBeDefined()
      expect(settings.editor).toBeDefined()
      expect(settings.appearance).toBeDefined()
      expect(settings.ai).toBeDefined()
    })

    it('should load existing settings from backend', async () => {
      const existing = {
        editor: { fontSize: 16 },
        appearance: { theme: 'dark' },
      }
      mockBackend.readSettings = vi.fn(async () => existing)

      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      const settings = await service.getAll()
      expect(settings.editor.fontSize).toBe(16)
      expect(settings.appearance.theme).toBe('dark')
    })

    it('scrubs legacy credentials before exposing or rewriting settings', async () => {
      const existing = {
        ai: {
          maxTokens: 4096,
          apiKeys: { openai: 'legacy-provider-key' },
          providers: { gemini: { apiKey: 'nested-provider-key', model: 'gemini-pro' } },
        },
        integrations: {
          jupyterToken: 'legacy-jupyter-token',
          jupyter: { enabled: true, token: 'nested-jupyter-token' },
        },
      }
      mockBackend.readSettings = vi.fn(async () => existing)

      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      const serialized = JSON.stringify(await service.getAll())
      expect(serialized).not.toContain('legacy-provider-key')
      expect(serialized).not.toContain('nested-provider-key')
      expect(serialized).not.toContain('legacy-jupyter-token')
      expect(serialized).not.toContain('nested-jupyter-token')
      expect(serialized).toContain('maxTokens')
      expect(mockBackend.writeSettings).toHaveBeenCalled()
    })
  })

  describe('get and set settings', () => {
    it('should get setting by path', async () => {
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      const value = await service.get('editor.fontSize')
      expect(value).toBeDefined()
    })

    it('should set setting by path', async () => {
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      await service.set('editor.fontSize', 18)
      const value = await service.get('editor.fontSize')
      expect(value).toBe(18)
    })

    it('should handle nested paths', async () => {
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      await service.set('ai.providers.openai.model', 'gpt-4')
      const value = await service.get('ai.providers.openai.model')
      expect(value).toBe('gpt-4')
    })
  })

  describe('category operations', () => {
    it('should get entire category', async () => {
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      const editor = await service.getCategory('editor')
      expect(editor).toBeDefined()
      expect(editor.fontSize).toBeDefined()
    })

    it('should reset category to defaults', async () => {
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      await service.set('editor.fontSize', 24)
      await service.resetCategory('editor')

      const fontSize = await service.get('editor.fontSize')
      expect(fontSize).not.toBe(24) // Should be default
    })
  })

  describe('import and export', () => {
    it('should export settings as JSON', async () => {
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      await service.set('editor.fontSize', 20)
      const exported = await service.export()

      expect(exported).toBeDefined()
      const parsed = JSON.parse(exported)
      expect(parsed.editor.fontSize).toBe(20)
    })

    it('should import settings from JSON', async () => {
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      const data = JSON.stringify({
        editor: { fontSize: 22 },
        appearance: { theme: 'light' },
      })

      await service.import(data)

      const fontSize = await service.get('editor.fontSize')
      expect(fontSize).toBe(22)
    })

    it('keeps credentials in memory only and excludes them from persistence and export', async () => {
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      await service.updateCategory('ai', {
        maxTokens: 2048,
        apiKeys: { anthropic: 'memory-provider-key' },
        providers: { openai: { apiKey: 'nested-memory-key' } },
      })
      await service.updateCategory('integrations', {
        jupyterToken: 'memory-jupyter-token',
      })

      expect(await service.get('ai.apiKeys.anthropic')).toBe('memory-provider-key')
      const persisted = JSON.stringify(mockBackend.writeSettings.mock.calls.at(-1)?.[0])
      const exported = await service.export()
      for (const secret of ['memory-provider-key', 'nested-memory-key', 'memory-jupyter-token']) {
        expect(persisted).not.toContain(secret)
        expect(exported).not.toContain(secret)
      }
      expect(exported).toContain('maxTokens')
    })
  })

  describe('migration from localStorage', () => {
    it('should migrate from old localStorage format', async () => {
      const oldData = {
        'editor-settings': JSON.stringify({ fontSize: 16 }),
        'appearance-settings': JSON.stringify({ theme: 'dark' }),
        'ai-settings': JSON.stringify({
          maxTokens: 4096,
          apiKeys: { openai: 'legacy-provider-key' },
        }),
        'integrations-settings': JSON.stringify({
          jupyterToken: 'legacy-jupyter-token',
          autoStartKernel: true,
        }),
      }

      const service = new ConsolidatedSettingsService(mockBackend)
      await service.migrateFromLocalStorage(oldData)

      const fontSize = await service.get('editor.fontSize')
      expect(fontSize).toBe(16)
      expect(await service.get('ai.maxTokens')).toBe(4096)
      expect(await service.get('integrations.autoStartKernel')).toBe(true)
      expect(JSON.stringify(mockBackend.writeSettings.mock.calls.at(-1)?.[0])).not.toContain(
        'legacy-provider-key',
      )
      expect(JSON.stringify(mockBackend.writeSettings.mock.calls.at(-1)?.[0])).not.toContain(
        'legacy-jupyter-token',
      )
    })
  })

  describe('validation', () => {
    it('should validate settings on set', async () => {
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()

      // Invalid value should throw
      await expect(service.set('editor.fontSize', 'invalid')).rejects.toThrow()
    })
  })
})
