import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  type User,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '@/services/firebase'
import { toast } from '@/lib/utils'
import { logAnalyticsEvent } from '@/services/firebase'
import type { UserProfile } from '@/types/user'

export class AuthService {
  // Sign in with email and password
  async loginWithEmail(email: string, password: string): Promise<User | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      logAnalyticsEvent('login', { method: 'email' })
      return userCredential.user
    } catch (error: any) {
      const errorCode = error.code
      const errorMessage = this.getReadableErrorMessage(errorCode)
      toast(errorMessage, 'Login Failed', 'destructive')
      throw error
    }
  }

  // Sign in with Google
  async loginWithGoogle(): Promise<User | null> {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      logAnalyticsEvent('login', { method: 'google' })
      return result.user
    } catch (error: any) {
      const errorCode = error.code
      const errorMessage = this.getReadableErrorMessage(errorCode)
      toast(errorMessage, 'Google Login Failed', 'destructive')
      throw error
    }
  }

  // Register new user with email and password
  async register(email: string, password: string, displayName: string): Promise<User | null> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Update the user profile with the displayName
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName })
        logAnalyticsEvent('sign_up', { method: 'email' })
      }

      return userCredential.user
    } catch (error: any) {
      const errorCode = error.code
      const errorMessage = this.getReadableErrorMessage(errorCode)
      toast(errorMessage, 'Registration Failed', 'destructive')
      throw error
    }
  }

  // Sign out
  async logout(): Promise<void> {
    try {
      await signOut(auth)
      logAnalyticsEvent('logout')
      toast('You have been successfully logged out', 'Logout Successful')
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during logout'
      toast(errorMessage, 'Logout Failed', 'destructive')
      throw error
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email)
      toast('Password reset email sent. Check your inbox.', 'Password Reset')
    } catch (error: any) {
      const errorCode = error.code
      const errorMessage = this.getReadableErrorMessage(errorCode)
      toast(errorMessage, 'Password Reset Failed', 'destructive')
      throw error
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser
  }

  // Listen for auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback)
  }

  // Convert Firebase error codes to readable messages
  private getReadableErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'The email address is not valid.'
      case 'auth/user-disabled':
        return 'This user account has been disabled.'
      case 'auth/user-not-found':
        return 'No user found with this email address.'
      case 'auth/wrong-password':
        return 'Incorrect password.'
      case 'auth/email-already-in-use':
        return 'The email address is already in use by another account.'
      case 'auth/weak-password':
        return 'The password is too weak. Please use a stronger password.'
      case 'auth/operation-not-allowed':
        return 'This operation is not allowed.'
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email address but different sign-in credentials.'
      case 'auth/cancelled-popup-request':
        return 'The popup sign-in was cancelled before completion.'
      case 'auth/popup-blocked':
        return 'The sign-in popup was blocked by your browser.'
      case 'auth/popup-closed-by-user':
        return 'The sign-in popup was closed before completion.'
      case 'auth/invalid-credential':
        return 'The authentication credential is invalid.'
      case 'auth/invalid-verification-code':
        return 'The verification code is invalid.'
      case 'auth/invalid-verification-id':
        return 'The verification ID is invalid.'
      case 'auth/missing-verification-code':
        return 'The verification code is missing.'
      case 'auth/missing-verification-id':
        return 'The verification ID is missing.'
      case 'auth/network-request-failed':
        return 'A network error occurred. Please check your connection and try again.'
      case 'auth/too-many-requests':
        return 'Too many unsuccessful login attempts. Please try again later.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  // Convert Firebase user to UserProfile
  mapUserToProfile(user: User | null): UserProfile | null {
    if (!user) return null

    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      emailVerified: user.emailVerified,
      createdAt: user.metadata.creationTime || '',
      lastLoginAt: user.metadata.lastSignInTime || '',
    }
  }
}

export const authService = new AuthService()
