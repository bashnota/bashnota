import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { useSettingsStore } from '../settingsStore'

describe('unified settings credential boundaries', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('scrubs legacy provider and Jupyter credentials from every durable settings key', async () => {
    localStorage.setItem(
      'bashnota-settings',
      JSON.stringify({
        ai: { apiKeys: { gemini: 'provider-secret' } },
        integrations: { jupyterToken: 'jupyter-secret' },
      }),
    )
    localStorage.setItem('ai-settings', JSON.stringify({ apiKeys: { gemini: 'provider-secret' } }))
    localStorage.setItem('integration-settings', JSON.stringify({ jupyterToken: 'jupyter-secret' }))
    const store = useSettingsStore()

    await store.loadSettings()

    expect(store.settings.ai.apiKeys).toEqual({})
    expect(store.settings.integrations.jupyterToken).toBe('')
    for (const key of ['bashnota-settings', 'ai-settings', 'integration-settings']) {
      expect(localStorage.getItem(key)).not.toContain('provider-secret')
      expect(localStorage.getItem(key)).not.toContain('jupyter-secret')
    }
  })

  it('keeps credentials in memory while saving credential-free settings', async () => {
    const store = useSettingsStore()
    store.updateCategory('ai', { apiKeys: { gemini: 'memory-provider-key' } })
    store.updateCategory('integrations', { jupyterToken: 'memory-jupyter-token' })
    await store.saveSettings()

    expect(store.settings.ai.apiKeys.gemini).toBe('memory-provider-key')
    expect(store.settings.integrations.jupyterToken).toBe('memory-jupyter-token')
    expect(localStorage.getItem('bashnota-settings')).not.toContain('memory-provider-key')
    expect(localStorage.getItem('bashnota-settings')).not.toContain('memory-jupyter-token')
  })
})
