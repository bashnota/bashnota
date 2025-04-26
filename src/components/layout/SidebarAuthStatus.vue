<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { 
  LogIn, 
  UserPlus, 
  LogOut, 
  AtSign,
  Settings
} from 'lucide-vue-next'
import { Tooltip } from '@/components/ui/tooltip'

const authStore = useAuthStore()
const router = useRouter()

// Auth related computed
const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentUser = computed(() => authStore.currentUser)
const userTag = computed(() => currentUser.value?.userTag)

// Calculate user initials for avatar (same as AuthHeader)
const userInitials = computed(() => {
  if (!currentUser.value?.displayName) return '?'

  const nameParts = currentUser.value.displayName.split(' ')
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase()
  }

  return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase()
})

const handleProfileClick = () => {
  router.push('/profile')
}

const handleLogout = () => {
  authStore.logout()
}
</script>

<template>
  <div class="border-t px-2 py-2">
    <div v-if="isAuthenticated" class="flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <!-- User avatar with initials -->
        <div 
          class="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-medium"
          v-if="!currentUser?.photoURL"
        >
          {{ userInitials }}
        </div>
        <img 
          v-else 
          :src="currentUser.photoURL" 
          alt="User avatar" 
          class="w-6 h-6 rounded-full object-cover"
        />
        <span class="text-xs text-muted-foreground truncate">
          {{ currentUser?.displayName || currentUser?.email }}
        </span>
      </div>
      
      <!-- Action buttons with tooltips -->
      <div class="flex gap-1">
        <Tooltip content="Profile settings">
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-6 w-6" 
            @click="handleProfileClick"
          >
            <Settings class="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
        
        <Tooltip v-if="userTag" content="Your public profile">
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-6 w-6" 
            asChild
          >
            <RouterLink :to="`/@${userTag}`">
              <AtSign class="h-3.5 w-3.5" />
            </RouterLink>
          </Button>
        </Tooltip>
        
        <Tooltip content="Logout">
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-6 w-6" 
            @click="handleLogout"
          >
            <LogOut class="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      </div>
    </div>
    
    <div v-else class="flex items-center justify-between">
      <Button variant="ghost" size="sm" asChild class="h-7 px-2 text-xs">
        <RouterLink to="/login">
          <LogIn class="h-3 w-3 mr-1" />
          Login
        </RouterLink>
      </Button>
      <Button variant="ghost" size="sm" asChild class="h-7 px-2 text-xs">
        <RouterLink to="/register">
          <UserPlus class="h-3 w-3 mr-1" />
          Register
        </RouterLink>
      </Button>
    </div>
  </div>
</template>