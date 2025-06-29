<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/ui/badge'
import { Sparkles, Zap, Coffee, Rocket, Heart } from 'lucide-vue-next'

interface Props {
  greeting: string
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  quote: string
  isAuthenticated: boolean
}

const props = defineProps<Props>()

const greetingIcon = computed(() => {
  switch (props.timeOfDay) {
    case 'morning': return Coffee
    case 'afternoon': return Zap
    case 'evening': return Heart
    case 'night': return Rocket
    default: return Sparkles
  }
})

const greetingColor = computed(() => {
  switch (props.timeOfDay) {
    case 'morning': return 'text-amber-500'
    case 'afternoon': return 'text-blue-500'
    case 'evening': return 'text-purple-500'
    case 'night': return 'text-indigo-500'
    default: return 'text-primary'
  }
})

const backgroundGradient = computed(() => {
  switch (props.timeOfDay) {
    case 'morning': return 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20'
    case 'afternoon': return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
    case 'evening': return 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
    case 'night': return 'from-indigo-50 to-slate-50 dark:from-indigo-900/20 dark:to-slate-900/20'
    default: return 'from-primary/5 to-secondary/5'
  }
})
</script>

<template>
  <div :class="['relative overflow-visible rounded-lg border bg-gradient-to-r p-3', backgroundGradient]">
    <!-- Animated background pattern -->
    <div class="absolute inset-0 opacity-15">
      <div class="absolute top-0 right-0 w-12 h-12 rounded-full bg-current animate-pulse"></div>
      <div class="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-current animate-pulse delay-1000"></div>
    </div>

    <div class="relative z-10 space-y-2">
      <!-- Main Greeting -->
      <div class="flex items-center gap-2">
        <div :class="['p-1 rounded-md bg-background/50 border border-current/20', greetingColor]">
          <component :is="greetingIcon" class="h-3.5 w-3.5" />
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-sm font-bold text-foreground mb-0.5 leading-tight">
            {{ greeting }}
          </h2>
          <Badge variant="secondary" class="text-xs py-0 px-1.5">
            <Sparkles class="h-2.5 w-2.5 mr-0.5" />
            {{ isAuthenticated ? 'Ready to create' : 'Let\'s start' }}
          </Badge>
        </div>
      </div>

      <!-- Motivational Quote -->
      <div class="bg-background/70 backdrop-blur-sm rounded-md p-2 border border-border/50">
        <div class="flex items-start gap-1.5">
          <div class="p-1 rounded-sm bg-primary/10 border border-primary/20 flex-shrink-0">
            <Sparkles class="h-3 w-3 text-primary" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-foreground mb-0.5">Daily Inspiration</p>
            <p class="text-xs text-muted-foreground italic leading-relaxed break-words">
              "{{ quote }}"
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.delay-1000 {
  animation-delay: 1s;
}
</style> 








