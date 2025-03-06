import { defineStore } from 'pinia'
import { authService } from '@/services/auth'
import type { AuthState, LoginCredentials, RegisterCredentials } from '@/types/user'
import { logAnalyticsEvent } from '@/services/firebase'
import { toast } from '@/lib/utils'

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
  },

  actions: {
    // Initialize auth state listener
    init() {
      return new Promise<void>((resolve) => {
        // Set up auth state listener
        authService.onAuthStateChange((user) => {
          this.user = authService.mapUserToProfile(user)
          this.initialized = true
          resolve()
        })
      })
    },

    // Login with email and password
    async loginWithEmail(credentials: LoginCredentials) {
      this.loading = true
      this.error = null

      try {
        const user = await authService.loginWithEmail(credentials.email, credentials.password)
        this.user = authService.mapUserToProfile(user)
        toast('You have successfully logged in!', 'Welcome back!')

        // Log analytics event
        if (this.user) {
          logAnalyticsEvent('login_success', { method: 'email' })
        }

        return user
      } catch (error: any) {
        this.error = error.message || 'Login failed'
        logAnalyticsEvent('login_error', { method: 'email', error: error.code || 'unknown_error' })
        return null
      } finally {
        this.loading = false
      }
    },

    // Login with Google
    async loginWithGoogle() {
      this.loading = true
      this.error = null

      try {
        const user = await authService.loginWithGoogle()
        this.user = authService.mapUserToProfile(user)
        toast('You have successfully logged in with Google!', 'Welcome!')

        // Log analytics event
        if (this.user) {
          logAnalyticsEvent('login_success', { method: 'google' })
        }

        return user
      } catch (error: any) {
        this.error = error.message || 'Google login failed'
        logAnalyticsEvent('login_error', { method: 'google', error: error.code || 'unknown_error' })
        return null
      } finally {
        this.loading = false
      }
    },

    // Register with email and password
    async register(credentials: RegisterCredentials) {
      this.loading = true
      this.error = null

      try {
        const user = await authService.register(
          credentials.email,
          credentials.password,
          credentials.displayName,
        )
        this.user = authService.mapUserToProfile(user)
        toast('Your account has been created successfully!', 'Welcome to BashNota!')

        // Log analytics event
        if (this.user) {
          logAnalyticsEvent('signup_success', { method: 'email' })
        }

        return user
      } catch (error: any) {
        this.error = error.message || 'Registration failed'
        logAnalyticsEvent('signup_error', { method: 'email', error: error.code || 'unknown_error' })
        return null
      } finally {
        this.loading = false
      }
    },

    // Logout
    async logout() {
      this.loading = true

      try {
        await authService.logout()
        this.user = null
        // Clear any in-memory user data if needed
        return true
      } catch (error: any) {
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
        await authService.resetPassword(email)
        toast('Password reset email has been sent to your email address.', 'Password Reset')
        return true
      } catch (error: any) {
        this.error = error.message || 'Password reset failed'
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
