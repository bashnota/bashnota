import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsAdapter } from '../settingsAdapter'

const settingsWithCredentials = {
  editor: {},
  appearance: {},
  ai: {
    maxTokens: 2048,
    apiKeys: { openai: 'provider-secret' },
    providers: { gemini: { apiKey: 'nested-provider-secret' } },
  },
  keyboard: {},
  integrations: {
    jupyterToken: 'jupyter-secret',
    jupyter: { token: 'nested-jupyter-secret' },
  },
  advanced: {},
} as any

describe('SettingsAdapter credential persistence', () => {
  beforeEach(() => localStorage.clear())

  it.each([
    { consolidated: false, storageKey: 'ai-settings' },
    { consolidated: true, storageKey: 'bashnota-consolidated-settings' },
  ])(
    'scrubs credentials from $storageKey writes and exports',
    async ({ consolidated, storageKey }) => {
      const adapter = new SettingsAdapter(consolidated)
      await adapter.initialize()
      await adapter.saveSettings(settingsWithCredentials)

      const persisted = localStorage.getItem(storageKey) ?? ''
      const exported = await adapter.exportSettings()
      for (const secret of [
        'provider-secret',
        'nested-provider-secret',
        'jupyter-secret',
        'nested-jupyter-secret',
      ]) {
        expect(persisted).not.toContain(secret)
        expect(exported).not.toContain(secret)
      }
      expect(persisted).toContain('maxTokens')
    },
  )

  it('scrubs and rewrites credentials found in legacy category storage', async () => {
    localStorage.setItem('ai-settings', JSON.stringify(settingsWithCredentials.ai))
    localStorage.setItem(
      'integrations-settings',
      JSON.stringify(settingsWithCredentials.integrations),
    )

    const adapter = new SettingsAdapter(false)
    const loaded = JSON.stringify(await adapter.loadSettings())

    expect(loaded).not.toContain('provider-secret')
    expect(loaded).not.toContain('jupyter-secret')
    expect(localStorage.getItem('ai-settings')).not.toContain('provider-secret')
    expect(localStorage.getItem('integrations-settings')).not.toContain('jupyter-secret')
  })

  it('scrubs legacy compatibility keys while migrating to consolidated storage', async () => {
    localStorage.setItem('ai-settings', JSON.stringify(settingsWithCredentials.ai))
    localStorage.setItem(
      'integrations-settings',
      JSON.stringify(settingsWithCredentials.integrations),
    )

    const adapter = new SettingsAdapter(true)
    await adapter.initialize()

    const persisted = [
      localStorage.getItem('bashnota-consolidated-settings'),
      localStorage.getItem('ai-settings'),
      localStorage.getItem('integrations-settings'),
    ].join(' ')
    expect(persisted).not.toContain('provider-secret')
    expect(persisted).not.toContain('jupyter-secret')
  })

  it('removes malformed consolidated settings rather than retaining an opaque secret artifact', async () => {
    localStorage.setItem('bashnota-consolidated-settings', '{"apiKey":"malformed-provider-secret"')

    const adapter = new SettingsAdapter(true)
    await adapter.initialize()

    expect(localStorage.getItem('bashnota-consolidated-settings')).toBeNull()
  })

  it.each([
    { consolidated: false, malformedKey: 'ai-settings' },
    { consolidated: false, malformedKey: 'theme-settings' },
    { consolidated: false, malformedKey: 'interface-settings' },
    { consolidated: true, malformedKey: 'ai-settings' },
    { consolidated: true, malformedKey: 'theme-settings' },
    { consolidated: true, malformedKey: 'interface-settings' },
  ])(
    'deletes malformed $malformedKey independently in consolidated=$consolidated mode',
    async ({ consolidated, malformedKey }) => {
      localStorage.setItem(malformedKey, '{"apiKey":"malformed-legacy-secret","unterminated":')
      localStorage.setItem('editor-settings', JSON.stringify({ fontSize: [37] }))
      localStorage.setItem('advanced-settings', JSON.stringify({ requestTimeout: 91 }))

      const adapter = new SettingsAdapter(consolidated)
      await adapter.initialize()
      const loaded = await adapter.loadSettings()

      expect(localStorage.getItem(malformedKey)).toBeNull()
      expect(localStorage.getItem('editor-settings')).not.toBeNull()
      expect(localStorage.getItem('advanced-settings')).not.toBeNull()
      expect(loaded.editor.fontSize).toEqual([37])
    },
  )
})
