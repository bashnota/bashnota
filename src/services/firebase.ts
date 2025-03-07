import { initializeApp } from 'firebase/app'
import { getAnalytics, logEvent } from 'firebase/analytics'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  // These will need to be replaced with actual values from your Firebase console
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Analytics
const analytics = getAnalytics(app)

// Helper function to log events
export const logAnalyticsEvent = (eventName: string, eventParams?: Record<string, any>) => {
  try {
    logEvent(analytics, eventName, eventParams)
  } catch (error) {
    console.error('Failed to log analytics event:', error)
  }
}

// Initialize Auth
const auth = getAuth(app)

// Connect to the Auth emulator if running in development
if (import.meta.env.VITE_NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099')
}

// Initialize Firestore
const firestore = getFirestore(app)

// Connect to the Firestore emulator if running in development
if (import.meta.env.VITE_NODE_ENV === 'development') {
  connectFirestoreEmulator(firestore, 'localhost', 8080)
}

export { analytics, auth, firestore }
