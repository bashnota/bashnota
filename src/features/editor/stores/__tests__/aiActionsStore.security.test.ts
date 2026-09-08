import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorAIActionsStore } from '../aiActionsStore'

describe('editor AI credential persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('scrubs legacy keys and keeps updates in memory only', () => {
    localStorage.setItem(
      'ai-code-preferences',
      JSON.stringify({
        provider: 'gemini',
        apiKeys: { gemini: 'legacy-secret' },
      }),
    )
    const store = useEditorAIActionsStore()
    expect(store.state.providerSettings.apiKeys).toEqual({})
    expect(localStorage.getItem('ai-code-preferences')).not.toContain('legacy-secret')

    store.updateProviderSettings({ apiKeys: { gemini: 'memory-secret' } })
    expect(store.state.providerSettings.apiKeys.gemini).toBe('memory-secret')
    expect(localStorage.getItem('ai-code-preferences')).not.toContain('memory-secret')
  })

  it('deletes malformed provider preferences and continues loading sibling keys', () => {
    localStorage.setItem('ai-code-preferences', '{"apiKeys":{"gemini":"malformed-legacy-secret"}')
    localStorage.setItem(
      'ai-custom-actions',
      JSON.stringify([
        {
          id: 'sentinel-action',
          name: 'Sentinel',
          description: 'Proves sibling loading continues',
          icon: 'Check',
          prompt: 'sentinel',
          category: 'analysis',
          isBuiltIn: false,
          isEnabled: true,
          outputType: 'text',
          createdAt: '2026-08-27T00:00:00.000Z',
          updatedAt: '2026-08-27T00:00:00.000Z',
        },
      ]),
    )
    localStorage.setItem(
      'ai-error-trigger-config',
      JSON.stringify({ autoTrigger: false, suggestedActions: ['sentinel-action'] }),
    )

    const store = useEditorAIActionsStore()

    expect(localStorage.getItem('ai-code-preferences')).toBeNull()
    expect(store.state.providerSettings.apiKeys).toEqual({})
    expect(store.state.customActions.some((action) => action.id === 'sentinel-action')).toBe(true)
    expect(store.state.errorTriggerConfig.autoTrigger).toBe(false)
    expect(store.state.errorTriggerConfig.suggestedActions).toEqual(['sentinel-action'])
  })
})
