import { ref } from 'vue'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '@/services/firebase'
import { useAuthStore } from '@/features/auth/stores/auth'
import { toast } from '@/lib/utils'

export function useNewsletter() {
  const isSubscribing = ref(false)
  const authStore = useAuthStore()

  const subscribeToNewsletter = async () => {
    if (isSubscribing.value) return false
    if (!authStore.currentUser) {
      toast('You must be logged in to subscribe to the newsletter.', 'Authentication Required', 'destructive')
      return false
    }

    isSubscribing.value = true
    try {
      const user = authStore.currentUser
      const newsletterDocRef = doc(firestore, 'newsletterSubscriptions', user.uid)
      
      await setDoc(newsletterDocRef, {
        email: user.email,
        displayName: user.displayName || '',
        subscribedAt: serverTimestamp(),
        uid: user.uid
      })

      toast('🎉 You have successfully subscribed to the newsletter!', 'Subscription Successful')
      return true
    } catch (error) {
      console.error('Error subscribing to newsletter:', error)
      toast('There was an error subscribing. Please try again.', 'Subscription Failed', 'destructive')
      return false
    } finally {
      isSubscribing.value = false
    }
  }

  return {
    isSubscribing,
    subscribeToNewsletter,
  }
} 