<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Plus, 
  MessagesSquare, 
  LogIn, 
  Sparkles,
  Rocket,
  Users,
  BookOpen,
  Zap
} from 'lucide-vue-next'

interface Props {
  isAuthenticated: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'create-nota': []
  'join-discord': []
  'login': []
}>()

const primaryActions = [
  {
    id: 'create',
    title: 'Create New Nota',
    description: 'Start capturing your ideas',
    icon: Plus,
    variant: 'default' as const,
    gradient: 'from-primary to-primary/80',
    action: () => emit('create-nota')
  }
]

const secondaryActions = [
  {
    id: 'discord',
    title: 'Join Community',
    description: 'Connect with other users',
    icon: MessagesSquare,
    variant: 'outline' as const,
    gradient: 'from-blue-500 to-blue-600',
    authenticated: true,
    action: () => emit('join-discord')
  },
  {
    id: 'login',
    title: 'Sign In',
    description: 'Access your workspace',
    icon: LogIn,
    variant: 'outline' as const,
    gradient: 'from-green-500 to-green-600',
    authenticated: false,
    action: () => emit('login')
  }
]

const quickLinks = [
  {
    id: 'templates',
    title: 'Templates',
    icon: BookOpen,
    color: 'text-purple-600'
  },
  {
    id: 'shortcuts',
    title: 'Shortcuts',
    icon: Zap,
    color: 'text-amber-600'
  },
  {
    id: 'features',
    title: 'Features',
    icon: Rocket,
    color: 'text-blue-600'
  }
]
</script>

<template>
  <div class="space-y-2">
    <!-- Primary Action -->
    <div class="space-y-1.5">
      <Card 
        v-for="action in primaryActions"
        :key="action.id"
        class="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
      >
        <CardContent class="p-0">
          <Button 
            @click="action.action"
            :variant="action.variant"
            class="w-full h-full p-3 text-left justify-start relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-200"
          >
            <!-- Gradient background -->
            <div :class="['absolute inset-0 bg-gradient-to-r opacity-90', action.gradient]"></div>
            
            <!-- Content -->
            <div class="relative z-10 flex items-center gap-2 w-full">
              <div class="p-1.5 bg-white/20 rounded-md backdrop-blur-sm flex-shrink-0">
                <component :is="action.icon" class="h-4 w-4 text-white" />
              </div>
              <div class="flex-1 text-white min-w-0">
                <h3 class="text-sm font-semibold mb-0 leading-tight">{{ action.title }}</h3>
                <p class="text-white/80 text-xs leading-tight">{{ action.description }}</p>
              </div>
              <div class="p-1 bg-white/10 rounded-sm flex-shrink-0">
                <Sparkles class="h-3.5 w-3.5 text-white animate-pulse" />
              </div>
            </div>
            
            <!-- Animated elements -->
            <div class="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full blur-xl animate-pulse"></div>
            <div class="absolute bottom-0 left-0 w-8 h-8 bg-white/5 rounded-full blur-lg animate-pulse delay-1000"></div>
          </Button>
        </CardContent>
      </Card>
    </div>

    <!-- Secondary Actions -->
    <div class="grid grid-cols-1 gap-1.5">
      <template v-for="action in secondaryActions" :key="action.id">
        <Card 
          v-if="action.authenticated === isAuthenticated"
          class="group relative overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
        >
          <CardContent class="p-0">
            <Button 
              @click="action.action"
              :variant="action.variant"
              class="w-full h-full p-2 text-left justify-start relative overflow-hidden"
            >
              <div class="flex items-center gap-1.5 w-full">
                <div :class="['p-1 rounded-sm bg-gradient-to-r flex-shrink-0', action.gradient]">
                  <component :is="action.icon" class="h-3 w-3 text-white" />
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-xs font-medium text-foreground leading-tight truncate">{{ action.title }}</h4>
                  <p class="text-xs text-muted-foreground leading-tight truncate">{{ action.description }}</p>
                </div>
              </div>
              
              <!-- Hover effect -->
              <div class="absolute inset-0 bg-current opacity-0 group-hover:opacity-5 transition-opacity"></div>
            </Button>
          </CardContent>
        </Card>
      </template>
    </div>

    <!-- Quick Links -->
    <Card class="bg-muted/20 border-dashed">
      <CardContent class="p-2">
        <div class="flex items-center gap-1 mb-1.5">
          <Rocket class="h-3 w-3 text-primary flex-shrink-0" />
          <h4 class="text-xs font-medium text-foreground">Quick Access</h4>
        </div>
        
        <div class="grid grid-cols-3 gap-1">
          <button
            v-for="link in quickLinks"
            :key="link.id"
            class="group flex flex-col items-center gap-1 p-1.5 rounded-sm hover:bg-background/50 transition-colors duration-200"
          >
            <div :class="['p-1 rounded-sm bg-background/50 border group-hover:scale-110 transition-transform flex-shrink-0', link.color]">
              <component :is="link.icon" class="h-3 w-3" />
            </div>
            <span class="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
              {{ link.title }}
            </span>
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
/* Custom hover animations */
.group:hover .animate-pulse {
  animation-duration: 1.5s;
}

.delay-1000 {
  animation-delay: 1s;
}

/* Smooth transitions for all interactive elements */
button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Glassmorphism effect */
.backdrop-blur-sm {
  backdrop-filter: blur(8px);
}
</style> 