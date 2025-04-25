import { defineStore } from 'pinia'
import { authService } from '@/services/auth'
import type { AuthState, LoginCredentials, RegisterCredentials } from '@/types/user'
import { logAnalyticsEvent } from '@/services/firebase'
import { toast } from '@/lib/utils'
import { validateUserTag } from '@/utils/userTagGenerator'

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
      
      // List of admin user IDs - for demonstration, this could be moved to 
      // a Firestore collection or an environment variable in a real app
      const adminUserIds = [
        'YQBcqDhwkKMtNbh1WmdFp2bFBXk1', // Replace with actual admin UIDs
      ];
      
      return adminUserIds.includes(state.user.uid);
    },
  },

  actions: {
    // Initialize auth state listener
    init() {
      return new Promise<void>((resolve) => {
        // Set up auth state listener
        authService.onAuthStateChange(async (user) => {
          // Save token to local storage
          if (user) {
            // @ts-ignore
            localStorage.setItem('token', user.accessToken)
          } else {
            localStorage.removeItem('token')
          }

          this.user = await authService.mapUserToProfile(user)
          
          // Check if user needs a tag
          if (user && this.user && !this.user.userTag) {
            console.log('User is missing a tag, will generate one')
            await this.generateUserTag()
          }
          
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
        this.user = await authService.mapUserToProfile(user)
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
        this.user = await authService.mapUserToProfile(user)
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
        this.user = await authService.mapUserToProfile(user)
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
    
    // Generate a user tag for the current user
    async generateUserTag() {
      if (!this.user) return
      
      this.loading = true
      this.error = null
      
      try {
        // If user already has a tag from Firebase Auth but not in Firestore
        if (this.user.uid) {
          // The auth service will generate a tag based on display name if available
          await authService.createUserTagForNewUser({
            uid: this.user.uid,
            displayName: this.user.displayName,
            email: this.user.email,
          } as any)
          
          // Refresh user profile to get the newly created tag
          this.user = await authService.mapUserToProfile(await authService.getCurrentUser())
          
          toast('Your user tag has been generated', 'User Tag Created')
          return true
        }
        
        return false
      } catch (error: any) {
        this.error = error.message || 'Failed to generate user tag'
        return false
      } finally {
        this.loading = false
      }
    },
    
    // Update the user's tag
    async updateUserTag(newTag: string) {
      if (!this.user) return false
      
      this.loading = true
      this.error = null
      
      try {
        // Validate the tag first
        const validation = await validateUserTag(newTag)
        
        if (!validation.isValid || !validation.isAvailable) {
          this.error = validation.error || 'Invalid or unavailable user tag'
          toast(this.error, 'User Tag Error', 'destructive')
          return false
        }
        
        // Update the tag
        await authService.updateUserTag(this.user.uid, newTag)
        
        // Update local user object
        this.user = {
          ...this.user,
          userTag: newTag,
        }
        
        logAnalyticsEvent('user_tag_updated')
        
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
