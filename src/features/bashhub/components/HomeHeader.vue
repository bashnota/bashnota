<script setup lang="ts">
import { computed } from 'vue'
import { 
  Github,
  Plus,
  LogIn,
  ExternalLink
} from 'lucide-vue-next'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useRouter } from 'vue-router'
import { Button } from '@/ui/button'
import { Card, CardContent } from '@/ui/card'

// Emits
const emit = defineEmits<{
  (e: 'create-nota'): void
}>()

const authStore = useAuthStore()
const router = useRouter()

// Methods
const handleCreateNota = () => {
  emit('create-nota')
}

const handleLogin = () => {
  router.push('/login')
}

const openGitHub = () => {
  window.open('https://github.com/bashnota/bashnota', '_blank')
}

const greeting = computed(() => {
  const name = authStore.currentUser?.displayName
  return name ? `Welcome back, ${name}!` : 'Welcome to BashNota'
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="text-center space-y-4">
      <div class="flex items-center justify-center gap-3">
        <div class="p-2 bg-primary/10 rounded-lg border border-primary/20">
          <img src="@/assets/logo.svg" alt="BashNota Logo" class="h-6 w-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-foreground">BashNota</h1>
          <p class="text-sm text-muted-foreground">{{ greeting }}</p>
        </div>
      </div>
      
      <!-- Compelling Tagline -->
      <div class="max-w-md mx-auto">
        <p class="text-lg font-medium text-foreground mb-2">
          Your second brain, cracked on code and AI
        </p>
        <p class="text-sm text-muted-foreground leading-relaxed">
          Build your own extensions, own your data, break free from platform lock-in. 
          Open source tools for independent minds.
        </p>
      </div>
    </div>

    <!-- Call to Action Cards -->
    <div class="space-y-3">
      <!-- Primary CTA -->
      <Card class="border-2 border-primary/20 hover:border-primary/40 transition-colors">
        <CardContent class="p-0">
          <Button 
            @click="handleCreateNota"
            class="w-full h-auto p-4 bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            <div class="flex items-center gap-3 w-full">
              <Plus class="h-5 w-5" />
              <div class="text-left flex-1">
                <div class="font-semibold">Create Your First Nota</div>
                <div class="text-sm opacity-90">Start building your knowledge base</div>
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>

      <!-- Secondary CTAs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card v-if="!authStore.isAuthenticated" class="hover:shadow-md transition-shadow">
          <CardContent class="p-0">
            <Button 
              @click="handleLogin"
              variant="outline"
              class="w-full h-auto p-3"
            >
              <div class="flex items-center gap-2 w-full">
                <LogIn class="h-4 w-4" />
                <div class="text-left flex-1">
                  <div class="font-medium text-sm">Sign In</div>
                  <div class="text-xs text-muted-foreground">Access your workspace</div>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Card class="hover:shadow-md transition-shadow">
          <CardContent class="p-0">
            <Button 
              @click="openGitHub"
              variant="outline"
              class="w-full h-auto p-3"
            >
              <div class="flex items-center gap-2 w-full">
                <Github class="h-4 w-4" />
                <div class="text-left flex-1">
                  <div class="font-medium text-sm">Contribute</div>
                  <div class="text-xs text-muted-foreground">Join the open source movement</div>
                </div>
                <ExternalLink class="h-3 w-3 opacity-60" />
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Open Source Message -->
    <div class="text-center">
      <p class="text-xs text-muted-foreground italic">
        Built by developers, for developers. No corporate overlords, no data harvesting.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Minimal, clean styling with subtle interactions */
.transition-colors {
  transition: border-color 0.2s ease;
}

.transition-shadow {
  transition: box-shadow 0.2s ease;
}
</style>









