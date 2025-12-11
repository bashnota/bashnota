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
      writeSettings: vi.fn(async (data: any) => { settingsData = data }),
      deleteSettings: vi.fn(async () => { settingsData = null })
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
        appearance: { theme: 'dark' }
      }
      mockBackend.readSettings = vi.fn(async () => existing)
      
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.initialize()
      
      const settings = await service.getAll()
      expect(settings.editor.fontSize).toBe(16)
      expect(settings.appearance.theme).toBe('dark')
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
      expect(fontSize).not.toBe(24)  // Should be default
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
        appearance: { theme: 'light' }
      })
      
      await service.import(data)
      
      const fontSize = await service.get('editor.fontSize')
      expect(fontSize).toBe(22)
    })
  })

  describe('migration from localStorage', () => {
    it('should migrate from old localStorage format', async () => {
      const oldData = {
        'editor-settings': JSON.stringify({ fontSize: 16 }),
        'appearance-settings': JSON.stringify({ theme: 'dark' })
      }
      
      const service = new ConsolidatedSettingsService(mockBackend)
      await service.migrateFromLocalStorage(oldData)
      
      const fontSize = await service.get('editor.fontSize')
      expect(fontSize).toBe(16)
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
