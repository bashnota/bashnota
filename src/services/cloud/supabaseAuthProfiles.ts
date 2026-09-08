import type { AuthError, Session, SupabaseClient, User } from '@supabase/supabase-js'
import type { CloudAuthApi, CloudProfilesApi } from './api'
import {
  CloudError, type CloudProfile, type CloudResult, type CloudSession,
  type CloudSubscription, type CloudUser,
} from './types'
import { getSupabaseBrowserClient } from './supabaseBrowser'
import type { Database } from '../../../supabase/types/database.types'

type BrowserClient = SupabaseClient<Database>

const ok = <T>(data: T): CloudResult<T> => ({ ok: true, data })
const fail = <T>(cause: unknown): CloudResult<T> => ({
  ok: false,
  error: cause instanceof CloudError ? cause : mapSupabaseError(cause),
})

export function mapSupabaseError(cause: unknown): CloudError {
  const authError = cause as Partial<AuthError> | undefined
  const code = String(authError?.code ?? '')
  const status = Number(authError?.status ?? 0)
  const postgresCode = typeof cause === 'object' && cause && 'code' in cause
    ? String((cause as { code?: unknown }).code ?? '') : ''
  const rawMessage = cause instanceof Error
    ? cause.message
    : typeof cause === 'object' && cause && 'message' in cause
      ? String((cause as { message?: unknown }).message)
      : 'Cloud request failed'

  const normalized = postgresCode === '23505' || /already registered|already exists|duplicate/i.test(rawMessage)
    ? 'conflict'
    : status === 401 || code.includes('session') || /invalid login credentials|expired.*session/i.test(rawMessage)
      ? 'unauthenticated'
      : status === 403 || postgresCode === '42501' || /permission denied|not allowed/i.test(rawMessage)
        ? 'forbidden'
        : status === 404 || postgresCode === 'P0002' || /not found/i.test(rawMessage)
          ? 'not-found'
          : status === 400 || postgresCode === '22023' || /invalid|password should/i.test(rawMessage)
            ? 'invalid'
            : status >= 500 || /network|fetch|unavailable/i.test(rawMessage)
              ? 'unavailable' : 'unknown'

  const friendly = /invalid login credentials/i.test(rawMessage)
    ? 'Incorrect email or password.'
    : /already registered/i.test(rawMessage)
      ? 'An account already exists for this email. Sign in or reset its password.'
      : /email not confirmed/i.test(rawMessage)
        ? 'Confirm your email before signing in.'
        : /password should/i.test(rawMessage)
          ? 'Use a stronger password with at least six characters.'
          : rawMessage
  return new CloudError(normalized, friendly, cause)
}

function cloudUser(user: User): CloudUser {
  const metadata = user.user_metadata ?? {}
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: typeof metadata.full_name === 'string' ? metadata.full_name
      : typeof metadata.name === 'string' ? metadata.name
        : typeof metadata.display_name === 'string' ? metadata.display_name : null,
    photoUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url
      : typeof metadata.picture === 'string' ? metadata.picture : null,
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
  }
}

function cloudSession(session: Session): CloudSession {
  return {
    user: cloudUser(session.user),
    accessToken: session.access_token,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
  }
}

function profile(value: {
  user_id: string | null
  user_tag: string | null
  display_name: string | null
  photo_url: string | null
  updated_at: string | null
}): CloudProfile {
  if (!value.user_id || !value.user_tag || value.display_name === null || value.photo_url === null || !value.updated_at) {
    throw new CloudError('unknown', 'Public profile projection returned an incomplete row.')
  }
  return {
    userId: value.user_id,
    userTag: value.user_tag,
    displayName: value.display_name || value.user_tag,
    photoUrl: value.photo_url,
    updatedAt: value.updated_at,
  }
}

function firstRow<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function createSupabaseAuthProfilesApi(client: BrowserClient): {
  auth: CloudAuthApi
  profiles: CloudProfilesApi
} {
  const auth: CloudAuthApi = {
    async currentSession() {
      try {
        const { data, error } = await client.auth.getSession()
        if (error) return fail(error)
        let session = data.session
        if (session?.expires_at && session.expires_at * 1000 <= Date.now()) {
          const refreshed = await client.auth.refreshSession()
          if (refreshed.error || !refreshed.data.session) return ok(null)
          session = refreshed.data.session
        }
        return ok(session ? cloudSession(session) : null)
      } catch (error) { return fail(error) }
    },
    async signInWithPassword(email, password) {
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password })
        if (error) return fail(error)
        if (!data.session) return fail(new CloudError('unauthenticated', 'Sign in did not establish a session.'))
        return ok(cloudSession(data.session))
      } catch (error) { return fail(error) }
    },
    async signUpWithPassword(email, password, displayName) {
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        })
        if (error) return fail(error)
        return ok(data.session ? cloudSession(data.session) : null)
      } catch (error) { return fail(error) }
    },
    async signInWithGoogle(redirectTo) {
      try {
        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        })
        return error ? fail(error) : ok(undefined)
      } catch (error) { return fail(error) }
    },
    async completeOAuthCallback(callbackUrl) {
      try {
        const code = new URL(callbackUrl).searchParams.get('code')
        if (!code) return fail(new CloudError('invalid', 'OAuth callback is missing its authorization code.'))
        const { data, error } = await client.auth.exchangeCodeForSession(code)
        if (error) return fail(error)
        if (!data.session) return fail(new CloudError('unauthenticated', 'OAuth callback did not establish a session.'))
        return ok(cloudSession(data.session))
      } catch (error) { return fail(error) }
    },
    async signOut() {
      try {
        const current = await client.auth.getSession()
        if (current.error) return fail(current.error)
        const { error } = await client.auth.signOut()
        if (!error) return ok(undefined)

        // Supabase clears its persisted browser session even when the remote
        // revocation request fails. Restore the captured session so the UI can
        // truthfully keep the user signed in and offer an explicit retry.
        const previous = current.data.session
        if (previous?.access_token && previous.refresh_token) {
          const restored = await client.auth.setSession({
            access_token: previous.access_token,
            refresh_token: previous.refresh_token,
          })
          if (restored.error) {
            return fail(new CloudError(
              'unavailable',
              'Sign out failed and the local session could not be restored. Reload to verify your account state.',
              restored.error,
            ))
          }
        }
        return fail(error)
      } catch (error) { return fail(error) }
    },
    async sendPasswordReset(email, redirectTo) {
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
        return error ? fail(error) : ok(undefined)
      } catch (error) { return fail(error) }
    },
    async updatePassword(password) {
      try {
        const { error } = await client.auth.updateUser({ password })
        return error ? fail(error) : ok(undefined)
      } catch (error) { return fail(error) }
    },
    onSessionChange(listener): CloudSubscription {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(session ? cloudSession(session) : null)
      })
      return { unsubscribe: () => data.subscription.unsubscribe() }
    },
  }

  const profiles: CloudProfilesApi = {
    async getProfile(userId) {
      try {
        const { data, error } = await client.from('public_profiles')
          .select('user_id,user_tag,photo_url,updated_at,display_name').eq('user_id', userId).maybeSingle()
        if (error) return fail(error)
        return ok(data ? profile(data) : null)
      } catch (error) { return fail(error) }
    },
    async getProfileByTag(tag) {
      try {
        const { data, error } = await client.from('public_profiles')
          .select('user_id,user_tag,photo_url,updated_at,display_name').eq('user_tag', tag).maybeSingle()
        if (error) return fail(error)
        return ok(data ? profile(data) : null)
      } catch (error) { return fail(error) }
    },
    async provisionProfile(value, displayName) {
      try {
        const userResult = await client.auth.getUser()
        if (userResult.error || !userResult.data.user) return fail(userResult.error ?? new CloudError('unauthenticated', 'Sign in required.'))
        if (userResult.data.user.id !== value.userId) return fail(new CloudError('forbidden', 'You may only provision your own profile.'))
        const { data, error } = await client.rpc('provision_user_profile', {
          p_user_tag: value.userTag,
          p_display_name: displayName,
          p_photo_url: value.photoUrl,
        })
        if (error) return fail(error)
        const row = firstRow(data)
        return row ? ok(profile(row)) : fail(new CloudError('unknown', 'Profile provision returned no row.'))
      } catch (error) { return fail(error) }
    },
    async upsertProfile(value) {
      try {
        const userResult = await client.auth.getUser()
        if (userResult.error || !userResult.data.user) return fail(userResult.error ?? new CloudError('unauthenticated', 'Sign in required.'))
        if (userResult.data.user.id !== value.userId) return fail(new CloudError('forbidden', 'You may only update your own profile.'))
        const { data, error } = await client.rpc('rename_user_tag', {
          p_user_tag: value.userTag,
          p_photo_url: value.photoUrl,
        })
        if (error) return fail(error)
        const row = firstRow(data)
        return row ? ok(profile(row)) : fail(new CloudError('unknown', 'Profile update returned no row.'))
      } catch (error) { return fail(error) }
    },
    async isTagAvailable(tag) {
      try {
        const { data, error } = await client.from('user_tags')
          .select('user_id').eq('user_tag', tag).maybeSingle()
        return error ? fail(error) : ok(data === null)
      } catch (error) { return fail(error) }
    },
  }

  return { auth, profiles }
}

let defaultApi: Promise<ReturnType<typeof createSupabaseAuthProfilesApi>> | undefined

export function getSupabaseAuthProfilesApi(): Promise<ReturnType<typeof createSupabaseAuthProfilesApi>> {
  defaultApi ??= getSupabaseBrowserClient().then(client => createSupabaseAuthProfilesApi(client as BrowserClient))
  return defaultApi
}

export function resetSupabaseAuthProfilesApiForTests(): void {
  defaultApi = undefined
}
