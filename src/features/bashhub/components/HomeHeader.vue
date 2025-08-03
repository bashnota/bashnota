<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { 
  Github,
  Plus,
  LogIn,
  ExternalLink,
  Star,
  FileUp,
  ChevronDown,
  Twitter,
  Mail
} from 'lucide-vue-next'
import { useAuthStore } from '@/features/auth/stores/auth'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useNotaImport } from '@/features/nota/composables/useNotaImport'
import { FILE_EXTENSIONS } from '@/constants/app'
import NewsletterModal from './NewsletterModal.vue'

// Emits
const emit = defineEmits<{
  (e: 'create-nota'): void
}>()

const authStore = useAuthStore()
const router = useRouter()

// Newsletter Modal State
const isNewsletterModalOpen = ref(false)

// Import composable
const { importNota, importJupyterNotebook, isImporting } = useNotaImport()

// GitHub stars state
const githubStars = ref<number | null>(null)
const isLoadingStars = ref(false)

// Twitter followers state
const twitterFollowers = ref<number | null>(null)
const isLoadingTwitter = ref(false)

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

const openTwitter = () => {
  window.open('https://twitter.com/bashnota', '_blank')
}

const fetchGitHubStars = async () => {
  try {
    isLoadingStars.value = true
    const response = await fetch('https://api.github.com/repos/bashnota/bashnota')
    if (response.ok) {
      const data = await response.json()
      githubStars.value = data.stargazers_count
    }
  } catch (error) {
    console.error('Failed to fetch GitHub stars:', error)
  } finally {
    isLoadingStars.value = false
  }
}

const fetchTwitterFollowers = async () => {
  try {
    isLoadingTwitter.value = true
    // Note: Twitter API v2 requires authentication, so we'll use a fallback approach
    // For now, we'll show the follow button without the count
    // In production, you'd want to use a backend service to fetch this data
    
    // Fallback: Try to get follower count from a public API or service
    // Since Twitter API requires auth, we'll skip the count for now
    twitterFollowers.value = null
  } catch (error) {
    console.error('Failed to fetch Twitter followers:', error)
  } finally {
    isLoadingTwitter.value = false
  }
}

// Import functionality using composable
const handleImportNota = async () => {
  await importNota([FILE_EXTENSIONS.nota])
}

const handleImportIpynb = async () => {
  await importJupyterNotebook()
}

const greeting = computed(() => {
  const name = authStore.currentUser?.displayName
  return name ? `Welcome back, ${name}!` : ''
})

const formattedStars = computed(() => {
  if (githubStars.value === null) return null
  if (githubStars.value >= 1000) {
    return `${(githubStars.value / 1000).toFixed(1)}k`
  }
  return githubStars.value.toString()
})

const formattedFollowers = computed(() => {
  if (twitterFollowers.value === null) return null
  if (twitterFollowers.value >= 1000) {
    return `${(twitterFollowers.value / 1000).toFixed(1)}k`
  }
  return twitterFollowers.value.toString()
})

// Load data on mount
onMounted(() => {
  fetchGitHubStars()
  fetchTwitterFollowers()
})
</script>

<template>
  <div class="max-w-lg mx-auto space-y-8 p-6">
    <!-- Header Section -->
    <div class="text-center space-y-6">
      <!-- Logo and Brand -->
      <div class="space-y-3">
        <div class="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 shadow-sm">
          <img src="@/assets/logo.svg" alt="BashNota Logo" class="h-8 w-8" />
        </div>
        <div>
          <h1 class="text-3xl font-bold text-foreground tracking-tight">BashNota</h1>
          <p class="text-muted-foreground mt-1">{{ greeting }}</p>
        </div>
      </div>
      
      <!-- Compelling Tagline -->
      <div class="space-y-3">
        <h2 class="text-xl font-semibold text-foreground leading-tight">
          Your second brain, cracked on code and AI
        </h2>
        <p class="text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Build extensions, own your data, break free from platform lock-in. 
          Open source tools for independent minds.
        </p>
      </div>
    </div>

    <!-- Call to Action Section -->
    <div class="space-y-4">
      <!-- Primary CTA -->
      <Button 
        @click="handleCreateNota"
        class="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
        size="lg"
      >
        <div class="flex items-center gap-3">
          <div class="p-1 bg-white/20 rounded-lg">
            <Plus class="h-5 w-5" />
          </div>
          <div class="text-left">
            <div class="font-semibold text-base">Create Your First Nota</div>
            <div class="text-sm opacity-90">Start building your knowledge base</div>
          </div>
        </div>
      </Button>

      <!-- Secondary Actions -->
      <div class="flex gap-3">
        <Button 
          v-if="!authStore.isAuthenticated"
          @click="handleLogin"
          variant="outline"
          class="flex-1 h-12 hover:bg-muted/50 transition-colors"
        >
          <LogIn class="h-4 w-4 mr-2" />
          <span class="font-medium">Sign In</span>
        </Button>

        <!-- Import Dropdown -->
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline"
              :class="authStore.isAuthenticated ? 'flex-1' : 'flex-[0.6]'"
              class="h-12 hover:bg-muted/50 transition-colors"
              :disabled="isImporting"
            >
              <FileUp class="h-4 w-4 mr-2" />
              <span class="font-medium">{{ isImporting ? 'Importing...' : 'Import' }}</span>
              <ChevronDown class="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuItem @click="handleImportNota" class="cursor-pointer" :disabled="isImporting">
              <FileUp class="h-4 w-4 mr-2" />
              <div class="flex-1">
                <div class="font-medium text-sm">Import Nota</div>
                <div class="text-xs text-muted-foreground">.nota files</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleImportIpynb" class="cursor-pointer" :disabled="isImporting">
              <FileUp class="h-4 w-4 mr-2" />
              <div class="flex-1">
                <div class="font-medium text-sm">Import Notebook</div>
                <div class="text-xs text-muted-foreground">Jupyter .ipynb files</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          v-if="authStore.isAuthenticated"
          @click="isNewsletterModalOpen = true"
          variant="outline"
          class="flex-[0.8] h-12 hover:bg-muted/50 transition-colors group"
        >
          <Mail class="h-4 w-4 mr-2" />
          <span class="font-medium">Newsletter</span>
        </Button>

        <Button 
          @click="openGitHub"
          variant="outline"
          :class="authStore.isAuthenticated ? 'flex-[0.5]' : 'flex-[0.3]'"
          class="h-12 hover:bg-muted/50 transition-colors group"
        >
          <Github class="h-4 w-4 mr-2" />
          <span class="font-medium">Contribute</span>
          <ExternalLink class="h-3 w-3 ml-1 opacity-60 group-hover:opacity-100 transition-opacity" />
        </Button>

      </div>
    </div>

    <!-- GitHub Stars, Twitter Followers & Open Source Badge -->
    <div class="flex justify-center gap-3 flex-wrap">
      <!-- GitHub Stars -->
      <div 
        v-if="githubStars !== null || isLoadingStars"
        class="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border/50 hover:bg-muted/70 transition-colors cursor-pointer"
        @click="openGitHub"
      >
        <Star class="h-3 w-3 text-yellow-500 fill-yellow-500" />
        <span class="text-xs font-medium text-muted-foreground">
          {{ isLoadingStars ? '...' : formattedStars }} stars
        </span>
      </div>

      <!-- Twitter Followers -->
      <div 
        class="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border/50 hover:bg-muted/70 transition-colors cursor-pointer"
        @click="openTwitter"
      >
        <Twitter class="h-3 w-3 text-blue-500" />
        <span class="text-xs font-medium text-muted-foreground">
          {{ isLoadingTwitter ? '...' : (twitterFollowers !== null ? `${formattedFollowers} followers` : 'Follow @bashnota') }}
        </span>
      </div>

      <!-- Open Source Badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border/50">
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span class="text-xs font-medium text-muted-foreground">
          Open Source & Privacy First
        </span>
      </div>
    </div>
  </div>
  <NewsletterModal :open="isNewsletterModalOpen" @update:open="isNewsletterModalOpen = $event" />
</template>

<style scoped>
/* Enhanced UX with smooth interactions */
.transition-all {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-colors {
  transition: color 0.2s ease, background-color 0.2s ease;
}

.transition-opacity {
  transition: opacity 0.2s ease;
}

/* Subtle hover scale effect */
.hover\:scale-\[1\.02\]:hover {
  transform: scale(1.02);
}

/* Custom shadow for primary button */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Smooth gradient animation for logo container */
.bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
}

/* Improved focus states for accessibility */
button:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .max-w-lg {
    max-width: 100%;
  }
  
  .p-6 {
    padding: 1rem;
  }
  
  .space-y-8 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 1.5rem;
  }
}
</style>









