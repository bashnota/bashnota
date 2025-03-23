<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Eye, EyeOff, Mail, Lock, User, ShieldCheck, Calendar, Clock } from 'lucide-vue-next'
import { toast } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { logger } from '@/services/logger'

const authStore = useAuthStore()
const router = useRouter()

// User state
const currentUser = computed(() => authStore.currentUser)
const isLoading = ref(false)

// Account deletion confirmation
const showDeleteConfirmation = ref(false)
const deleteConfirmationText = ref('')

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

  isLoading.value = true

  try {
    await authStore.resetPassword(currentUser.value.email)
  } catch (error) {
    logger.error('Password reset error:', error)
  } finally {
    isLoading.value = false
  }
}

// Handle account deletion (in a real app, this would need server-side implementation)
const handleDeleteAccount = async () => {
  if (deleteConfirmationText.value !== 'DELETE') {
    toast('Please type DELETE to confirm account deletion', 'Confirmation Required', 'destructive')
    return
  }

  isLoading.value = true

  try {
    // In a real app, you would call a server-side function to delete the user's account
    toast('Account deletion is not implemented in this demo', 'Demo Limitation')
    showDeleteConfirmation.value = false
    deleteConfirmationText.value = ''
  } catch (error) {
    logger.error('Account deletion error:', error)
  } finally {
    isLoading.value = false
  }
}

// Handle logout
const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/')
  } catch (error) {
    logger.error('Logout error:', error)
  }
}
</script>

<template>
  <div class="container py-8 max-w-3xl mx-auto">
    <div v-if="currentUser" class="space-y-6">
      <!-- Profile Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Your Profile</h1>
        <Button @click="handleLogout" variant="outline">Logout</Button>
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
        </CardContent>
        <CardFooter class="flex flex-col space-y-4">
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

      <!-- Danger Zone -->
      <Card class="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle class="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          <CardDescription>
            Actions in this section can result in permanent data loss
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground mb-4">
            Deleting your account will remove all your data and cannot be undone.
          </p>
          <template v-if="!showDeleteConfirmation">
            <Button
              variant="destructive"
              @click="showDeleteConfirmation = true"
              :disabled="isLoading"
            >
              Delete Account
            </Button>
          </template>
          <div v-else class="space-y-4">
            <div class="space-y-2">
              <Label for="confirmDelete">Type DELETE to confirm</Label>
              <Input
                id="confirmDelete"
                :value="deleteConfirmationText"
                class-name=""
                type="text"
                placeholder="DELETE"
                @input="
                  (e: Event) => (deleteConfirmationText = (e.target as HTMLInputElement).value)
                "
              />
            </div>
            <div class="flex gap-2">
              <Button
                variant="destructive"
                @click="handleDeleteAccount"
                :disabled="isLoading || deleteConfirmationText !== 'DELETE'"
              >
                Confirm Delete
              </Button>
              <Button
                variant="outline"
                @click="
                  () => {
                    showDeleteConfirmation = false
                    deleteConfirmationText = ''
                  }
                "
                :disabled="isLoading"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
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
