export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  emailVerified: boolean
  createdAt: string
  lastLoginAt: string
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
