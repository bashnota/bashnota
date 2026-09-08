import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-sonner', () => ({ toast: vi.fn() }))

import { useAISettingsStore } from '../aiSettingsStore'

describe('AI settings credential persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('removes legacy persisted keys while retaining non-secret settings', () => {
    localStorage.setItem(
      'ai-settings',
      JSON.stringify({ apiKeys: { gemini: 'legacy-secret' }, maxTokens: 99 }),
    )
    const store = useAISettingsStore()

    expect(store.settings.apiKeys).toEqual({})
    expect(store.settings.maxTokens).toBe(99)
    expect(localStorage.getItem('ai-settings')).not.toContain('legacy-secret')
  })

  it('keeps newly entered provider keys in memory only', () => {
    const store = useAISettingsStore()
    store.setApiKey('gemini', 'memory-secret')

    expect(store.getApiKey('gemini')).toBe('memory-secret')
    expect(localStorage.getItem('ai-settings')).not.toContain('memory-secret')
    expect(JSON.parse(localStorage.getItem('ai-settings')!)).not.toHaveProperty('apiKeys')
  })

  it('deletes malformed legacy settings instead of retaining possible credentials', () => {
    localStorage.setItem('ai-settings', '{"apiKeys":{"gemini":"legacy-secret"}')

    const store = useAISettingsStore()

    expect(store.settings.apiKeys).toEqual({})
    expect(localStorage.getItem('ai-settings')).toBeNull()
  })
})
