<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Plus, Sparkles, Code2, FileText, MessagesSquare, LogIn, UserPlus } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

defineEmits<{
  (e: 'create-nota'): void
}>()

// Function to open Discord in a new tab
const openDiscord = () => {
  window.open('https://discord.com/invite/2Gs2MTPGWd', '_blank')
}

// Handle login navigation
const handleLogin = () => {
  router.push('/login')
}

// Handle register navigation
const handleRegister = () => {
  router.push('/register')
}
</script>

<template>
  <div class="relative overflow-hidden rounded-lg border bg-gradient-to-tr from-slate-100 to-background h-full flex flex-col p-4 sm:p-6 dark:from-slate-800">
    <div class="relative z-10 flex flex-col flex-1">
      <!-- Top Content -->
      <div class="space-y-6">
        <div class="space-y-2">
          <div class="inline-flex items-center rounded-full border bg-background/95 px-3 py-1 text-sm">
            <Sparkles class="mr-2 h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span class="text-muted-foreground truncate">
              {{ authStore.isAuthenticated ? 'Welcome back to your smart workspace' : 'Welcome to your smart workspace' }}
            </span>
          </div>
          <h1 class="text-2xl sm:text-4xl font-bold tracking-tight">
            <div class="flex items-center gap-4">
              <img 
                src="@/assets/logo.svg" 
                alt="BashNota Logo" 
                class="h-12 w-auto text-primary animate-pulse-subtle hover:animate-wiggle" 
              />
              <div>
                {{ authStore.isAuthenticated ? `Welcome back, ${authStore.currentUser?.displayName || 'User'}!` : 'Welcome to' }}
                <span class="text-primary">BashNota</span>
              </div>
            </div>
          </h1>
        </div>

        <div class="space-y-2">
          <p class="text-lg sm:text-xl font-medium text-primary">More Than a Second Brain,</p>
          <p class="text-lg sm:text-xl font-medium text-muted-foreground">
            It's a Second Brain Cracked on Code and AI
          </p>
        </div>
        
        <p class="text-muted-foreground">
          Transform your notes into powerful tools with code snippets execution, markdown and latex support, and seamless
          organization. Built for developers, designed for productivity.
        </p>
      </div>

      <!-- Bottom Action -->
      <div class="mt-6 flex gap-3">
        <Button 
          @click="$emit('create-nota')" 
          size="lg" 
          class="group relative overflow-hidden flex-1"
        >
          <div class="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <Plus class="h-5 w-5 mr-2 flex-shrink-0" />
          New Nota
        </Button>
        
        <template v-if="authStore.isAuthenticated">
          <Button
            @click="openDiscord"
            size="lg"
            variant="outline"
            class="group relative overflow-hidden"
          >
            <div class="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <MessagesSquare class="h-5 w-5 mr-2 flex-shrink-0" />
            Join our Discord
          </Button>
        </template>
        
        <template v-else>
          <Button
            @click="handleLogin"
            size="lg"
            variant="outline"
            class="group relative overflow-hidden"
          >
            <div class="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <LogIn class="h-5 w-5 mr-2 flex-shrink-0" />
            Sign in / Register
          </Button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 640px) {
  .text-2xl {
    font-size: 1.5rem;
    line-height: 2rem;
  }
  
  .text-lg {
    font-size: 1.125rem;
    line-height: 1.75rem;
  }
}
</style>
