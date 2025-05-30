<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Sparkles, 
  Clock, 
  Calendar,
  MessagesSquare, 
  LogIn, 
  Zap,
  Brain,
  Code2,
  Rocket,
  Coffee,
  Sun,
  Moon,
  Sunset,
  Lightbulb,
  Layers
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { getTimeOfDay, getGreeting, formatTime, formatShortDate } from '@/utils/dateUtils'
import type { ActiveView } from '@/composables/useHomePreferences'

// Components
import WelcomeGreeting from './welcome/WelcomeGreeting.vue'
import QuickInsights from './welcome/QuickInsights.vue'
import ActionCards from './welcome/ActionCards.vue'

// Props
interface Props {
  activeView?: ActiveView
}

const props = withDefaults(defineProps<Props>(), {
  activeView: 'notas'
})

// Emits
const emit = defineEmits<{
  (e: 'create-nota'): void
  (e: 'update:activeView', value: ActiveView): void
}>()

const authStore = useAuthStore()
const router = useRouter()
const store = useNotaStore()

// Reactive state
const currentTime = ref(new Date())

// Update time every minute
onMounted(() => {
  const interval = setInterval(() => {
    currentTime.value = new Date()
  }, 60000)
  
  // Cleanup on unmount
  return () => clearInterval(interval)
})

// Computed properties
const timeOfDay = computed(() => getTimeOfDay())

const timeIcon = computed(() => {
  switch (timeOfDay.value) {
    case 'morning': return Sun
    case 'afternoon': return Sun
    case 'evening': return Sunset
    case 'night': return Moon
    default: return Clock
  }
})

const greeting = computed(() => {
  const name = authStore.currentUser?.displayName
  return getGreeting(name, timeOfDay.value)
})

const motivationalQuotes = [
  "Every nota is a step towards clarity.",
  "Your ideas deserve a beautiful home.",
  "Code your thoughts, think your code.",
  "Great notes lead to greater discoveries.",
  "Innovation starts with organization.",
  "Your second brain is growing stronger.",
  "Document today, thank yourself tomorrow.",
  "Ideas without action are just dreams."
]

const todaysQuote = computed(() => {
  const day = new Date().getDate()
  return motivationalQuotes[day % motivationalQuotes.length]
})

const quickStats = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  return {
    total: store.rootItems.length,
    today: store.rootItems.filter(n => new Date(n.createdAt) >= today).length,
    thisWeek: store.rootItems.filter(n => new Date(n.createdAt) >= thisWeek).length,
    favorites: store.rootItems.filter(n => n.favorite).length
  }
})

const currentTimeFormatted = computed(() => formatTime(currentTime.value))
const currentDateFormatted = computed(() => formatShortDate(currentTime.value))

// Methods
const openDiscord = () => {
  window.open('https://discord.com/invite/2Gs2MTPGWd', '_blank')
}

const handleLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="relative overflow-hidden rounded-xl border bg-gradient-to-br from-background via-muted/30 to-background flex flex-col min-h-fit">
    <!-- Animated background elements -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-0 left-0 w-24 h-24 bg-secondary/5 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
      <div class="absolute top-1/2 left-1/2 w-16 h-16 bg-accent/5 rounded-full blur-2xl animate-pulse-slow delay-500"></div>
    </div>

    <div class="relative z-10 flex flex-col p-4 space-y-4 min-h-0">
      <!-- Header Section -->
      <div class="flex items-start justify-between shrink-0">
        <div class="flex items-center gap-2">
          <div class="relative">
            <div class="p-1 bg-primary/10 rounded-lg border border-primary/20 backdrop-blur-sm">
              <Brain class="h-4 w-4 text-primary animate-pulse-subtle" />
            </div>
            <div class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
          </div>
          <div>
            <h1 class="text-base font-bold text-foreground">BashNota</h1>
            <p class="text-xs text-muted-foreground">AI-Powered Workspace</p>
          </div>
        </div>
        
        <div class="text-right">
          <div class="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
            <component :is="timeIcon" class="h-3 w-3" />
            <span>{{ currentTimeFormatted }}</span>
          </div>
          <p class="text-xs text-muted-foreground">
            {{ currentDateFormatted }}
          </p>
        </div>
      </div>

      <!-- Scrollable Content Area -->
      <div class="flex-1 overflow-y-auto overflow-x-hidden min-h-0 space-y-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">

        <!-- View Controls with responsive tabs -->
        <div class="shrink-0 pt-2 border-t border-border/50">
          <div class="flex items-center justify-center">
            <Tabs :model-value="activeView" @update:model-value="(value: string | number) => emit('update:activeView', String(value) as ActiveView)" class="w-full">
              <TabsList class="inline-flex h-9 sm:h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full overflow-x-auto scrollbar-none">
                <TabsTrigger 
                  value="notas" 
                  class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[44px] sm:min-w-0 flex-shrink-0"
                  :title="activeView !== 'notas' ? 'Notas' : undefined"
                >
                  <Clock class="h-4 w-4 flex-shrink-0" />
                  <span class="ml-1 sm:ml-2 hidden xs:inline">Notas</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="insights" 
                  class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[44px] sm:min-w-0 flex-shrink-0"
                  :title="activeView !== 'insights' ? 'Insights' : undefined"
                >
                  <Lightbulb class="h-4 w-4 flex-shrink-0" />
                  <span class="ml-1 sm:ml-2 hidden xs:inline">Insights</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="templates" 
                  class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[44px] sm:min-w-0 flex-shrink-0"
                  :title="activeView !== 'templates' ? 'Templates' : undefined"
                >
                  <Sparkles class="h-4 w-4 flex-shrink-0" />
                  <span class="ml-1 sm:ml-2 hidden xs:inline">Templates</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="workspace" 
                  class="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[44px] sm:min-w-0 flex-shrink-0"
                  :title="activeView !== 'workspace' ? 'Analytics' : undefined"
                >
                  <Layers class="h-4 w-4 flex-shrink-0" />
                  <span class="ml-1 sm:ml-2 hidden xs:inline">Analytics</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <!-- Welcome Greeting Component -->
        <div class="shrink-0">
          <WelcomeGreeting 
            :greeting="greeting"
            :time-of-day="timeOfDay"
            :quote="todaysQuote"
            :is-authenticated="authStore.isAuthenticated"
          />
        </div>

        <!-- Quick Insights Component -->
        <div class="shrink-0">
          <QuickInsights 
            :stats="quickStats"
            :time-of-day="timeOfDay"
          />
        </div>

        <!-- Action Cards Component -->
        <div class="shrink-0">
          <ActionCards 
            :is-authenticated="authStore.isAuthenticated"
            @create-nota="emit('create-nota')"
            @join-discord="openDiscord"
            @login="handleLogin"
          />
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-slow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; transform: rotate(0deg); }
  50% { opacity: 0.8; transform: rotate(5deg); }
}

.animate-pulse-slow {
  animation: pulse-slow 4s ease-in-out infinite;
}

.animate-pulse-subtle {
  animation: pulse-subtle 3s ease-in-out infinite;
}

.delay-500 {
  animation-delay: 0.5s;
}

.delay-1000 {
  animation-delay: 1s;
}

/* Glassmorphism effect */
.backdrop-blur-sm {
  backdrop-filter: blur(8px);
}

/* Responsive design */
@media (max-width: 640px) {
  .text-xl {
    font-size: 1.125rem;
  }
}

/* Hide scrollbars for tab containers */
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}

/* Custom breakpoint for extra small screens (tabs) */
@media (min-width: 475px) {
  .xs\:inline {
    display: inline !important;
  }
}
</style>
