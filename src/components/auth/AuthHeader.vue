<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-vue-next'
import { toast } from '@/lib/utils'
import { logger } from '@/services/logger'

const authStore = useAuthStore()
const router = useRouter()

// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentUser = computed(() => authStore.currentUser)
const userInitials = computed(() => {
  if (!currentUser.value?.displayName) return '?'

  const nameParts = currentUser.value.displayName.split(' ')
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase()
  }

  return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase()
})

// Handle login button click
const handleLoginClick = () => {
  router.push('/login')
}

// Handle register button click
const handleRegisterClick = () => {
  router.push('/register')
}

// Handle logout
const handleLogout = async () => {
  if (!confirm('Are you sure you want to logout?')) return

  try {
    await authStore.logout()
    toast('You have been logged out successfully')

    // Navigate to home page after logout
    router.push('/')
  } catch (error) {
    logger.error('Logout error:', error)
  }
}

// Handle profile click
const handleProfileClick = () => {
  router.push('/profile')
}
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- Show these buttons when user is not authenticated -->
    <template v-if="!isAuthenticated">
      <Button variant="ghost" size="sm" @click="handleLoginClick">Login</Button>
      <Button size="sm" @click="handleRegisterClick">Register</Button>
    </template>

    <!-- Show user dropdown when authenticated -->
    <template v-else>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" class="relative h-8 w-8 rounded-full">
            <template v-if="currentUser?.photoURL">
              <img
                :src="currentUser.photoURL"
                alt="User avatar"
                class="h-8 w-8 rounded-full object-cover"
              />
            </template>
            <template v-else>
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                {{ userInitials }}
              </div>
            </template>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel>
            <div class="flex flex-col">
              <span class="font-medium">{{ currentUser?.displayName }}</span>
              <span class="text-xs text-muted-foreground truncate">{{ currentUser?.email }}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleProfileClick">
            <User class="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleLogout">
            <LogOut class="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
  </div>
</template>
