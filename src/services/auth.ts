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
import { auth, firestore } from '@/services/firebase'
import { toast } from '@/lib/utils'
import { logAnalyticsEvent } from '@/services/firebase'
import type { UserProfile } from '@/types/user'
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { generateUniqueUserTag } from '@/utils/userTagGenerator'

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
        
        // Generate a unique user tag and save it to Firestore
        await this.createUserTagForNewUser(userCredential.user)
        
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

  // Create and save user tag for a new user
  async createUserTagForNewUser(user: User): Promise<string> {
    try {
      // Generate a unique tag based on displayName if available, otherwise generate a random one
      const baseTagText = user.displayName ? 
        user.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') : 
        '';
      
      const userTag = await generateUniqueUserTag(3, { 
        prefix: baseTagText ? `${baseTagText.substring(0, 10)}` : '',
        useWords: !baseTagText
      });
      
      // Save to users collection
      const userRef = doc(firestore, 'users', user.uid)
      
      // Check if user document exists
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userRef, { userTag })
      } else {
        // Create new user document
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          userTag,
          createdAt: new Date().toISOString(),
        })
      }
      
      // Save to userTags collection for faster lookup
      const userTagRef = doc(firestore, 'userTags', userTag)
      await setDoc(userTagRef, {
        uid: user.uid,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      })
      
      return userTag
    } catch (error) {
      console.error('Error creating user tag:', error)
      throw error
    }
  }
  
  // Update a user's tag
  async updateUserTag(userId: string, newTag: string): Promise<void> {
    try {
      // Get the current user document to check if they already have a tag
      const userRef = doc(firestore, 'users', userId)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        throw new Error('User document not found')
      }
      
      const userData = userDoc.data()
      const oldTag = userData.userTag
      
      // Update the user document with the new tag
      await updateDoc(userRef, { 
        userTag: newTag,
        lastUpdatedAt: new Date().toISOString()
      })
      
      // First create the new tag entry before removing the old one
      // Add new tag to userTags collection
      const userTagRef = doc(firestore, 'userTags', newTag)
      await setDoc(userTagRef, {
        uid: userId,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      })
      
      // Remove old tag from userTags collection if it exists
      if (oldTag) {
        const oldTagRef = doc(firestore, 'userTags', oldTag)
        const oldTagDoc = await getDoc(oldTagRef)
        
        if (oldTagDoc.exists()) {
          // Completely delete the old tag document instead of just marking it as available
          await deleteDoc(oldTagRef)
          console.log(`Previous user tag "${oldTag}" has been deleted`)
        }
      }
      
      toast('Your user tag has been updated successfully', 'User Tag Updated')
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred while updating your user tag'
      toast(errorMessage, 'User Tag Update Failed', 'destructive')
      throw error
    }
  }

  // Get user profile data from Firestore
  async getUserProfileData(userId: string): Promise<Record<string, any> | null> {
    try {
      const userRef = doc(firestore, 'users', userId)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        return userDoc.data()
      }
      
      return null
    } catch (error) {
      console.error('Error getting user profile data:', error)
      return null
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
  async mapUserToProfile(user: User | null): Promise<UserProfile | null> {
    if (!user) return null

    // Try to get additional user data from Firestore
    const firestoreData = await this.getUserProfileData(user.uid)
    
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      emailVerified: user.emailVerified,
      createdAt: user.metadata.creationTime || '',
      lastLoginAt: user.metadata.lastSignInTime || '',
      userTag: firestoreData?.userTag || '',
    }
  }
}

export const authService = new AuthService()
