export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  emailVerified: boolean
  createdAt: string
  lastLoginAt: string
  userTag?: string  // Added new field for user tag
}

// Adding new interface for user tag validation
export interface UserTagValidation {
  isValid: boolean
  isAvailable: boolean
  error?: string
}

export interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
  initialized: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  displayName: string
}
