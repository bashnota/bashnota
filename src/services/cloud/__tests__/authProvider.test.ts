import { beforeEach, describe, expect, it, vi } from 'vitest'

const doubles = vi.hoisted(() => ({
  supabase: { auth: { provider: 'supabase' }, profiles: { provider: 'supabase' } },
}))

vi.mock('../supabaseAuthProfiles', () => ({ getSupabaseAuthProfilesApi: async () => doubles.supabase }))

import { getIdentityCloudApi, resetIdentityCloudApiForTests } from '../authProvider'

describe('actual identity provider middleware', () => {
  beforeEach(() => {
    resetIdentityCloudApiForTests()
  })

  it('always selects Supabase without a rollout or compatibility branch', async () => {
    expect(await getIdentityCloudApi()).toBe(doubles.supabase)
  })
})
