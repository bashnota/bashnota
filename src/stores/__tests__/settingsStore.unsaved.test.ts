import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '../settingsStore'

vi.mock('@/services/toast', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}))

describe('settings dirty state', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('does not mark freshly loaded settings as unsaved on the next tick', async () => {
    const store = useSettingsStore()

    await store.loadSettings()
    await Promise.resolve()

    expect(store.hasUnsavedChanges).toBe(false)
  })
})
