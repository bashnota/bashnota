<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { RouterLink } from 'vue-router'

const authStore = useAuthStore()

// Auth related computed
const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentUser = computed(() => authStore.currentUser)
</script>

<template>
  <div class="px-4 py-2 border-t">
    <div v-if="isAuthenticated" class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-green-500"></div>
      <RouterLink
        to="/profile"
        class="text-sm text-muted-foreground hover:text-foreground truncate transition-colors"
      >
        Signed in as {{ currentUser?.displayName || currentUser?.email }}
      </RouterLink>
    </div>
    <div v-else class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-amber-500"></div>
      <RouterLink 
        to="/login" 
        class="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Sign in to sync your data
      </RouterLink>
    </div>
  </div>
</template> 