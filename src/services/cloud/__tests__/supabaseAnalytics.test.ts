import { describe, expect, it } from 'vitest'
import { disabledBrowserAnalytics } from '../supabaseCloudApi'

describe('browser analytics removal decision', () => {
  it('accepts product event calls without collecting or transmitting data', () => {
    expect(() => disabledBrowserAnalytics.track('page_view', { page_path: '/private' })).not.toThrow()
    expect(Object.keys(disabledBrowserAnalytics)).toEqual(['track'])
  })
})
