import { defineStore } from 'pinia'
import { supabaseAuthService as authService } from '@/features/auth/services/supabaseAuth'
import type { AuthState, LoginCredentials, RegisterCredentials } from '@/features/auth/types/user'
import { toast } from '@/services/toast'

const TAG_PATTERN = /^[a-zA-Z0-9_]{3,30}$/
const authRedirect = (path: string) => new URL(`${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`, window.location.origin).toString()
const authStateGenerations = new WeakMap<object, number>()
const pendingLogoutProfiles = new WeakMap<object, AuthState['user']>()

function beginAuthStateTransition(store: object): number {
  const generation = (authStateGenerations.get(store) ?? 0) + 1
  authStateGenerations.set(store, generation)
  return generation
}

function isCurrentAuthStateTransition(store: object, generation: number): boolean {
  return authStateGenerations.get(store) === generation
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isLoading: (state) => state.loading,
    currentUser: (state) => state.user,
    hasError: (state) => !!state.error,
    errorMessage: (state) => state.error,
    isInitialized: (state) => state.initialized,
    // Add isAdmin getter based on a predefined list of admin user IDs
    isAdmin: (state) => {
      if (!state.user) return false;
      
      // This should move to a restricted Supabase role table before admin-only
      // product behavior is added.
      const adminUserIds = [
        'YQBcqDhwkKMtNbh1WmdFp2bFBXk1', // Replace with actual admin UIDs
      ];
      
      return adminUserIds.includes(state.user.uid);
    },
  },

  actions: {
    // Initialize auth state listener
    async init() {
      if (this.initialized) return
      const initialGeneration = beginAuthStateTransition(this)
      try {
        authService.onAuthStateChange(session => {
          // Supabase emits SIGNED_OUT before a failed remote revocation can be
          // compensated. Keep the visible profile stable until logout() knows
          // whether the operation committed or must be retried.
          if (session === null && pendingLogoutProfiles.has(this)) return
          const generation = beginAuthStateTransition(this)
          void authService.mapSessionToProfile(session).then(profile => {
            if (!isCurrentAuthStateTransition(this, generation)) return
            this.user = profile
            this.error = null
          }).catch(error => {
            if (!isCurrentAuthStateTransition(this, generation)) return
            this.user = null
            this.error = error instanceof Error ? error.message : 'Authentication state could not be restored'
          })
        })
        const initialSession = await authService.currentSession()
        const profile = await authService.mapSessionToProfile(initialSession)
        if (isCurrentAuthStateTransition(this, initialGeneration)) this.user = profile
      } catch (error) {
        if (isCurrentAuthStateTransition(this, initialGeneration)) {
          this.user = null
          this.error = error instanceof Error ? error.message : 'Authentication state could not be restored'
        }
      } finally {
        this.initialized = true
      }
    },

    // Login with email and password
    async loginWithEmail(credentials: LoginCredentials) {
      this.loading = true
      this.error = null

      try {
        const session = await authService.loginWithEmail(credentials.email, credentials.password)
        const generation = beginAuthStateTransition(this)
        const profile = await authService.mapSessionToProfile(session)
        if (!isCurrentAuthStateTransition(this, generation)) return null
        this.user = profile
        return profile
      } catch (error: any) {
        this.error = error.message || 'Login failed'
        return null
      } finally {
        this.loading = false
      }
    },

    // Login with Google
    async loginWithGoogle(redirect = '/') {
      this.loading = true
      this.error = null

      try {
        const callback = new URL(authRedirect('/auth/callback'))
        callback.searchParams.set('redirect', redirect)
        const session = await authService.loginWithGoogle(callback.toString())
        if (session) {
          const generation = beginAuthStateTransition(this)
          const profile = await authService.mapSessionToProfile(session)
          if (!isCurrentAuthStateTransition(this, generation)) return false
          this.user = profile
        }
        return true
      } catch (error: any) {
        this.error = error.message || 'Google login failed'
        return false
      } finally {
        this.loading = false
      }
    },

    // Register with email and password
    async register(credentials: RegisterCredentials) {
      this.loading = true
      this.error = null

      try {
        const session = await authService.register(
          credentials.email,
          credentials.password,
          credentials.displayName,
        )
        const generation = beginAuthStateTransition(this)
        const profile = await authService.mapSessionToProfile(session)
        if (!isCurrentAuthStateTransition(this, generation)) return false
        this.user = profile
        return true
      } catch (error: any) {
        this.error = error.message || 'Registration failed'
        return false
      } finally {
        this.loading = false
      }
    },

    // Generate a user tag for the current user
    async isUserTagAvailable(tag: string) {
      if (!TAG_PATTERN.test(tag)) return false
      if (tag === this.user?.userTag) return true
      return authService.isTagAvailable(tag)
    },

    // Update the user's tag
    async updateUserTag(newTag: string) {
      if (!this.user) return false

      this.loading = true
      this.error = null

      try {
        // Validate the tag first
        if (!TAG_PATTERN.test(newTag)) {
          this.error = 'Tag must be 3–30 letters, numbers, or underscores'
          toast(this.error, {
            description: 'User Tag Error'
          })
          return false
        }
        if (newTag !== this.user.userTag && !(await authService.isTagAvailable(newTag))) {
          this.error = 'This user tag is already taken'
          return false
        }
        await authService.updateUserTag(this.user.uid, newTag)
        
        // Update local user object
        this.user = {
          ...this.user,
          userTag: newTag,
        }
        
        return true
      } catch (error: any) {
        this.error = error.message || 'Failed to update user tag'
        return false
      } finally {
        this.loading = false
      }
    },

    // Logout
    async logout() {
      this.loading = true
      this.error = null
      const previousUser = this.user
      pendingLogoutProfiles.set(this, previousUser)
      beginAuthStateTransition(this)

      try {
        await authService.logout()
        pendingLogoutProfiles.delete(this)
        beginAuthStateTransition(this)
        this.user = null
        // Clear any in-memory user data if needed
        return true
      } catch (error: any) {
        pendingLogoutProfiles.delete(this)
        beginAuthStateTransition(this)
        this.user = previousUser
        this.error = error.message || 'Logout failed'
        return false
      } finally {
        this.loading = false
      }
    },

    // Reset password
    async resetPassword(email: string) {
      this.loading = true
      this.error = null

      try {
        await authService.resetPassword(email, authRedirect('/auth/reset-password'))
        return true
      } catch (error: any) {
        this.error = error.message || 'Password reset failed'
        return false
      } finally {
        this.loading = false
      }
    },

    async completeOAuthCallback(callbackUrl: string) {
      this.loading = true
      this.error = null
      try {
        const session = await authService.completeOAuthCallback(callbackUrl)
        const generation = beginAuthStateTransition(this)
        const profile = await authService.mapSessionToProfile(session)
        if (!isCurrentAuthStateTransition(this, generation)) return false
        this.user = profile
        return true
      } catch (error: any) {
        this.error = error.message || 'OAuth sign-in failed'
        return false
      } finally {
        this.loading = false
      }
    },

    async updatePassword(password: string) {
      this.loading = true
      this.error = null
      try {
        await authService.updatePassword(password)
        return true
      } catch (error: any) {
        this.error = error.message || 'Password update failed'
        return false
      } finally {
        this.loading = false
      }
    },

    // Clear any auth errors
    clearError() {
      this.error = null
    },
  },
})
