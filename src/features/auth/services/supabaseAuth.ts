import type { CloudProfile, CloudResult, CloudSession } from '@/services/cloud'
import { CloudError } from '@/services/cloud'
import { getIdentityCloudApi } from '@/services/cloud/authProvider'
import type { UserProfile } from '@/features/auth/types/user'

const TAG_PATTERN = /^[a-zA-Z0-9_]{3,30}$/

function unwrap<T>(result: CloudResult<T>): T {
  if (!result.ok) throw result.error
  return result.data
}

function tagBase(displayName: string | null, userId: string): string {
  const normalized = (displayName ?? '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
  const fallback = `user_${userId.replace(/-/g, '').slice(0, 8)}`
  const base = normalized.length >= 3 ? normalized : fallback
  return TAG_PATTERN.test(base) ? base : fallback
}

export class SupabaseAuthService {
  private session: CloudSession | null = null

  async currentSession(): Promise<CloudSession | null> {
    const api = await getIdentityCloudApi()
    const result = await api.auth.currentSession()
    this.session = unwrap(result)
    return this.session
  }

  async loginWithEmail(email: string, password: string): Promise<CloudSession> {
    const api = await getIdentityCloudApi()
    const session = unwrap(await api.auth.signInWithPassword(email, password))
    this.session = session
    await this.ensureProfile(session)
    return session
  }

  async loginWithGoogle(redirectTo: string): Promise<CloudSession | null> {
    const api = await getIdentityCloudApi()
    unwrap(await api.auth.signInWithGoogle(redirectTo))
    const current = unwrap(await api.auth.currentSession())
    this.session = current
    if (current) await this.ensureProfile(current)
    return current
  }

  async completeOAuthCallback(callbackUrl: string): Promise<CloudSession> {
    const api = await getIdentityCloudApi()
    const session = unwrap(await api.auth.completeOAuthCallback(callbackUrl))
    this.session = session
    await this.ensureProfile(session)
    return session
  }

  async register(email: string, password: string, displayName: string): Promise<CloudSession | null> {
    const api = await getIdentityCloudApi()
    const session = unwrap(await api.auth.signUpWithPassword(email, password, displayName))
    this.session = session
    if (session) await this.ensureProfile(session, displayName)
    return session
  }

  async logout(): Promise<void> {
    const api = await getIdentityCloudApi()
    unwrap(await api.auth.signOut())
    this.session = null
  }

  async resetPassword(email: string, redirectTo: string): Promise<void> {
    const api = await getIdentityCloudApi()
    unwrap(await api.auth.sendPasswordReset(email, redirectTo))
  }

  async updatePassword(password: string): Promise<void> {
    const api = await getIdentityCloudApi()
    unwrap(await api.auth.updatePassword(password))
  }

  async updateUserTag(userId: string, nextTag: string): Promise<CloudProfile> {
    if (!TAG_PATTERN.test(nextTag)) throw new CloudError('invalid', 'Tag must be 3–30 letters, numbers, or underscores.')
    const api = await getIdentityCloudApi()
    const current = unwrap(await api.profiles.getProfile(userId))
    if (!current) throw new CloudError('not-found', 'Profile not found.')
    return unwrap(await api.profiles.upsertProfile({ ...current, userTag: nextTag, updatedAt: new Date().toISOString() }))
  }

  async isTagAvailable(tag: string): Promise<boolean> {
    if (!TAG_PATTERN.test(tag)) return false
    const api = await getIdentityCloudApi()
    return unwrap(await api.profiles.isTagAvailable(tag))
  }

  async getPublicProfileByTag(tag: string): Promise<CloudProfile | null> {
    const api = await getIdentityCloudApi()
    return unwrap(await api.profiles.getProfileByTag(tag))
  }

  async getPublicProfile(userId: string): Promise<CloudProfile | null> {
    const api = await getIdentityCloudApi()
    return unwrap(await api.profiles.getProfile(userId))
  }

  onAuthStateChange(callback: (session: CloudSession | null) => void): () => void {
    let active = true
    let unsubscribe: () => void = () => {}
    void getIdentityCloudApi().then(api => {
      if (!active) return
      const subscription = api.auth.onSessionChange(session => {
        this.session = session
        callback(session)
      })
      unsubscribe = () => subscription.unsubscribe()
    })
    return () => {
      active = false
      unsubscribe()
    }
  }

  async mapSessionToProfile(session: CloudSession | null): Promise<UserProfile | null> {
    if (!session) return null
    const api = await getIdentityCloudApi()
    let publicProfile = unwrap(await api.profiles.getProfile(session.user.id))
    if (!publicProfile) publicProfile = await this.ensureProfile(session)
    return {
      uid: session.user.id,
      email: session.user.email ?? '',
      displayName: session.user.displayName ?? '',
      photoURL: publicProfile.photoUrl || session.user.photoUrl || '',
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt ?? '',
      lastLoginAt: session.user.lastSignInAt ?? '',
      userTag: publicProfile.userTag,
    }
  }

  private async ensureProfile(session: CloudSession, displayName = session.user.displayName ?? ''): Promise<CloudProfile> {
    const api = await getIdentityCloudApi()
    const existing = unwrap(await api.profiles.getProfile(session.user.id))
    if (existing) return existing

    const base = tagBase(displayName, session.user.id)
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const suffix = attempt === 0 ? '' : `_${attempt}`
      const candidate = `${base.slice(0, 30 - suffix.length)}${suffix}`
      const result = await api.profiles.provisionProfile({
        userId: session.user.id,
        userTag: candidate,
        displayName: displayName || candidate,
        photoUrl: session.user.photoUrl ?? '',
        updatedAt: new Date().toISOString(),
      }, displayName)
      if (result.ok) return result.data
      if (result.error.code !== 'conflict') throw result.error
    }
    throw new CloudError('conflict', 'Could not reserve a unique public tag. Choose one in your profile.')
  }
}

export const supabaseAuthService = new SupabaseAuthService()
