import { describe, expect, it, vi } from 'vitest'
import { createSupabaseAuthProfilesApi, mapSupabaseError } from '../supabaseAuthProfiles'

const user = {
  id: '41000000-0000-0000-0000-000000000001',
  email: 'owner@example.test',
  email_confirmed_at: '2026-08-13T00:00:00.000Z',
  created_at: '2026-08-01T00:00:00.000Z',
  last_sign_in_at: '2026-08-13T00:00:00.000Z',
  user_metadata: { display_name: 'Owner', avatar_url: 'owner.png' },
}

const session = {
  user,
  access_token: 'public-user-access-token',
  refresh_token: 'public-user-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
}

function auth(overrides: Record<string, unknown> = {}) {
  return {
    getSession: vi.fn(async () => ({ data: { session }, error: null })),
    refreshSession: vi.fn(async () => ({ data: { session }, error: null })),
    signInWithPassword: vi.fn(async () => ({ data: { session }, error: null })),
    signUp: vi.fn(async () => ({ data: { session }, error: null })),
    signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
    exchangeCodeForSession: vi.fn(async () => ({ data: { session }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    setSession: vi.fn(async () => ({ data: { session }, error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
    getUser: vi.fn(async () => ({ data: { user }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    ...overrides,
  }
}

describe('Supabase auth and profile adapter', () => {
  it('refreshes an expired persisted session and clears an unrefreshable one', async () => {
    const refreshed = { ...session, access_token: 'refreshed', expires_at: Math.floor(Date.now() / 1000) + 3600 }
    const successfulAuth = auth({
      getSession: vi.fn(async () => ({ data: { session: { ...session, expires_at: 1 } }, error: null })),
      refreshSession: vi.fn(async () => ({ data: { session: refreshed }, error: null })),
    })
    const successful = createSupabaseAuthProfilesApi({ auth: successfulAuth } as never)
    expect(await successful.auth.currentSession()).toMatchObject({ ok: true, data: { accessToken: 'refreshed' } })

    const failed = createSupabaseAuthProfilesApi({ auth: auth({
      getSession: vi.fn(async () => ({ data: { session: { ...session, expires_at: 1 } }, error: null })),
      refreshSession: vi.fn(async () => ({ data: { session: null }, error: { message: 'expired session' } })),
    }) } as never)
    expect(await failed.auth.currentSession()).toEqual({ ok: true, data: null })
  })

  it('starts Google OAuth with the exact callback and explicitly exchanges its code', async () => {
    const clientAuth = auth()
    const api = createSupabaseAuthProfilesApi({ auth: clientAuth } as never)
    await expect(api.auth.signInWithGoogle('https://app.test/auth/callback?redirect=%2Fprofile'))
      .resolves.toEqual({ ok: true, data: undefined })
    expect(clientAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://app.test/auth/callback?redirect=%2Fprofile' },
    })
    expect(await api.auth.completeOAuthCallback('https://app.test/auth/callback?code=one-time-code'))
      .toMatchObject({ ok: true, data: { user: { id: user.id } } })
    expect(clientAuth.exchangeCodeForSession).toHaveBeenCalledWith('one-time-code')
  })

  it('restores the persisted session when remote sign-out fails', async () => {
    const clientAuth = auth({
      signOut: vi.fn(async () => ({ error: { status: 503, message: 'sign-out unavailable' } })),
    })
    const api = createSupabaseAuthProfilesApi({ auth: clientAuth } as never)

    await expect(api.auth.signOut()).resolves.toMatchObject({ ok: false })

    expect(clientAuth.setSession).toHaveBeenCalledWith({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  })

  it('reads only the public profile projection by stable tag', async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        user_id: user.id,
        user_tag: 'Owner_Tag',
        display_name: 'Owner',
        photo_url: 'owner.png',
        updated_at: '2026-08-13T00:00:00Z',
      },
      error: null,
    }))
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    const api = createSupabaseAuthProfilesApi({ auth: auth(), from } as never)

    expect(await api.profiles.getProfileByTag('Owner_Tag')).toEqual({
      ok: true,
      data: {
        userId: user.id,
        userTag: 'Owner_Tag',
        displayName: 'Owner',
        photoUrl: 'owner.png',
        updatedAt: '2026-08-13T00:00:00Z',
      },
    })
    expect(from).toHaveBeenCalledWith('public_profiles')
    expect(select).toHaveBeenCalledWith('user_id,user_tag,photo_url,updated_at,display_name')
  })

  it('normalizes auth and database errors without leaking provider-specific branching', () => {
    expect(mapSupabaseError({ status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' }))
      .toMatchObject({ code: 'unauthenticated', message: 'Incorrect email or password.' })
    expect(mapSupabaseError({ code: '23505', message: 'duplicate key value' }))
      .toMatchObject({ code: 'conflict' })
    expect(mapSupabaseError({ status: 403, message: 'permission denied' }))
      .toMatchObject({ code: 'forbidden' })
  })
})
