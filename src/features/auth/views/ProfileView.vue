<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import UserTagEditor from '@/features/auth/components/UserTagEditor.vue'
import AuthFeedback from '@/features/auth/components/AuthFeedback.vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Mail, User, ShieldCheck, Calendar, Clock, AtSign } from 'lucide-vue-next'
import { formatDate } from '@/lib/utils'
import { logger } from '@/services/logger'

const authStore = useAuthStore()
const router = useRouter()

// User state
const currentUser = computed(() => authStore.currentUser)
const isLoading = ref(false)
const localError = ref<string | null>(null)
const resetSuccess = ref<string | null>(null)
const isLoggingOut = ref(false)
const feedbackError = computed(() => localError.value || authStore.errorMessage)

onMounted(() => {
  // Redirect to login if user not authenticated
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: '/profile' } })
  }
})

// Format date for display
const formatDateDisplay = (dateString: string) => {
  if (!dateString) return 'N/A'
  return formatDate(new Date(dateString))
}

// Handle password reset
const handleResetPassword = async () => {
  if (!currentUser.value?.email) return

  localError.value = null
  resetSuccess.value = null
  authStore.clearError()
  isLoading.value = true

  try {
    const reset = await authStore.resetPassword(currentUser.value.email)
    if (reset === true) {
      resetSuccess.value = 'Password reset email sent. Check your inbox for reset instructions.'
    } else if (!authStore.errorMessage) {
      localError.value = 'Password reset email could not be sent. Check your email and try again.'
    }
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Password reset failed'
  } finally {
    isLoading.value = false
  }
}

// Handle logout
const handleLogout = async () => {
  if (isLoggingOut.value) return
  localError.value = null
  authStore.clearError()
  isLoggingOut.value = true
  try {
    const signedOut = await authStore.logout()
    if (signedOut) {
      await router.push('/')
    } else if (!authStore.errorMessage) {
      localError.value = 'Sign out failed. Check your connection and try again.'
    }
  } catch (error) {
    logger.error('Logout error:', error)
    localError.value = error instanceof Error ? error.message : 'Sign out failed. Try again.'
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="container py-8 max-w-3xl mx-auto">
    <div v-if="currentUser" class="space-y-6">
      <!-- Profile Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Your Profile</h1>
        <Button @click="handleLogout" variant="outline" :disabled="isLoggingOut">
          {{ isLoggingOut ? 'Signing out…' : 'Logout' }}
        </Button>
      </div>

      <!-- Profile Info Card -->
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription> Manage your personal information and account settings </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Profile Picture -->
          <div class="flex justify-center mb-6">
            <div class="relative">
              <div v-if="currentUser.photoURL" class="h-24 w-24 rounded-full overflow-hidden">
                <img
                  :src="currentUser.photoURL"
                  alt="Profile picture"
                  class="h-full w-full object-cover"
                />
              </div>
              <div
                v-else
                class="h-24 w-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold"
              >
                {{
                  currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : '?'
                }}
              </div>
            </div>
          </div>

          <!-- Display Name -->
          <div class="space-y-2">
            <Label class="text-muted-foreground">Display Name</Label>
            <div class="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/20">
              <User class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <span>{{ currentUser.displayName || 'No display name set' }}</span>
            </div>
          </div>

          <!-- Email -->
          <div class="space-y-2">
            <Label class="text-muted-foreground">Email</Label>
            <div class="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/20">
              <Mail class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <span>{{ currentUser.email }}</span>
              <span
                v-if="currentUser.emailVerified"
                class="ml-auto text-sm text-green-600 dark:text-green-400 flex items-center"
              >
                <ShieldCheck class="h-4 w-4 mr-1" />
                Verified
              </span>
              <span v-else class="ml-auto text-sm text-amber-600 dark:text-amber-400">
                Not verified
              </span>
            </div>
          </div>

          <!-- Account Created -->
          <div class="space-y-2">
            <Label class="text-muted-foreground">Account Created</Label>
            <div class="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/20">
              <Calendar class="h-4 w-4 text-muted-foreground" />
              <span>{{ formatDateDisplay(currentUser.createdAt) }}</span>
            </div>
          </div>

          <!-- Last Login -->
          <div class="space-y-2">
            <Label class="text-muted-foreground">Last Login</Label>
            <div class="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/20">
              <Clock class="h-4 w-4 text-muted-foreground" />
              <span>{{ formatDateDisplay(currentUser.lastLoginAt) }}</span>
            </div>
          </div>

          <!-- User Tag -->
          <div class="space-y-2">
            <Label class="text-muted-foreground flex items-center gap-1">
              <AtSign class="h-4 w-4 text-primary" />
              User Tag
            </Label>
            <UserTagEditor />
          </div>
        </CardContent>
        <CardFooter class="flex flex-col space-y-4">
          <AuthFeedback :error="feedbackError" :success="resetSuccess" />
          <Button
            variant="outline"
            class="w-full"
            @click="handleResetPassword"
            :disabled="isLoading"
          >
            Reset Password
          </Button>
        </CardFooter>
      </Card>

    </div>

    <!-- Loading state -->
    <div v-else-if="authStore.isLoading" class="flex justify-center items-center min-h-[60vh]">
      <div
        class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"
      ></div>
    </div>
  </div>
</template>




