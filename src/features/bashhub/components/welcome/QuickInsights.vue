<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/ui/badge'
import { 
  TrendingUp, 
  Calendar, 
  Star, 
  FileText, 
  Target,
  Zap,
  Clock
} from 'lucide-vue-next'

interface Stats {
  total: number
  today: number
  thisWeek: number
  favorites: number
}

interface Props {
  stats: Stats
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
}

const props = defineProps<Props>()

const insights = computed(() => {
  const { total, today, thisWeek, favorites } = props.stats
  
  const productivity = computed(() => {
    if (today >= 3) return 'high'
    if (today >= 1) return 'medium'
    return 'low'
  })

  const weeklyProgress = computed(() => {
    if (thisWeek >= 10) return 'excellent'
    if (thisWeek >= 5) return 'good'
    if (thisWeek >= 1) return 'moderate'
    return 'low'
  })

  return {
    productivity: productivity.value,
    weeklyProgress: weeklyProgress.value,
    favoriteRatio: total > 0 ? Math.round((favorites / total) * 100) : 0
  }
})

const contextualMessage = computed(() => {
  const { today, thisWeek } = props.stats
  
  switch (props.timeOfDay) {
    case 'morning':
      if (today === 0) return "Fresh start! Ready to capture some ideas?"
      return "Great momentum this morning! Keep it going."
    case 'afternoon':
      if (today >= 2) return "Productive day so far! You're on fire 🔥"
      if (today === 1) return "Good progress! Maybe add another note?"
      return "Afternoon inspiration time! What's on your mind?"
    case 'evening':
      if (today >= 3) return "Wow! What a productive day! 🌟"
      if (today >= 1) return "Good work today! Time to wind down."
      return "Evening reflection time. How was your day?"
    case 'night':
      if (today >= 1) return "Night owl! Your dedication is inspiring 🦉"
      return "Late night thoughts? Perfect time for notes!"
    default:
      return "Ready to organize your thoughts?"
  }
})

const quickStats = computed(() => [
  {
    label: 'Today',
    value: props.stats.today,
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  {
    label: 'This Week',
    value: props.stats.thisWeek,
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  {
    label: 'Favorites',
    value: props.stats.favorites,
    icon: Star,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  {
    label: 'Total',
    value: props.stats.total,
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  }
])

const getProductivityBadge = computed(() => {
  switch (insights.value.productivity) {
    case 'high': return { variant: 'default' as const, text: 'High Productivity', icon: Zap }
    case 'medium': return { variant: 'secondary' as const, text: 'Steady Progress', icon: Target }
    case 'low': return { variant: 'outline' as const, text: 'Getting Started', icon: Clock }
    default: return { variant: 'outline' as const, text: 'Ready to Begin', icon: Target }
  }
})
</script>

<template>
  <div class="space-y-2">
    <!-- Contextual Message -->
    <div class="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-md p-2 border border-border/50">
      <div class="flex items-center gap-1.5">
        <div class="p-1 rounded-sm bg-primary/10 border border-primary/20 flex-shrink-0">
          <component :is="getProductivityBadge.icon" class="h-3 w-3 text-primary" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-foreground leading-tight break-words">{{ contextualMessage }}</p>
          <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <Badge :variant="getProductivityBadge.variant" class="text-xs py-0 px-1 whitespace-nowrap">
              {{ getProductivityBadge.text }}
            </Badge>
            <span class="text-xs text-muted-foreground whitespace-nowrap">
              {{ insights.favoriteRatio }}% favorites
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-2 gap-1.5">
      <div
        v-for="stat in quickStats"
        :key="stat.label"
        :class="[
          'group relative overflow-hidden rounded-md border p-2 transition-all duration-200 hover:shadow-md hover:scale-105',
          stat.bgColor,
          stat.borderColor
        ]"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-muted-foreground mb-0.5 truncate">{{ stat.label }}</p>
            <p :class="['text-lg font-bold leading-none', stat.color]">{{ stat.value }}</p>
          </div>
          <div :class="['p-1 rounded-sm bg-background/50 border border-current/20 flex-shrink-0', stat.color]">
            <component :is="stat.icon" class="h-3 w-3" />
          </div>
        </div>
        
        <!-- Hover effect -->
        <div class="absolute inset-0 bg-current opacity-0 group-hover:opacity-5 transition-opacity"></div>
      </div>
    </div>

    <!-- Weekly Progress Bar -->
    <div class="bg-muted/30 rounded-md p-2 border border-border/50">
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs font-medium text-foreground">Weekly Progress</p>
        <Badge variant="outline" class="text-xs py-0 px-1 whitespace-nowrap">
          {{ insights.weeklyProgress.charAt(0).toUpperCase() + insights.weeklyProgress.slice(1) }}
        </Badge>
      </div>
      <div class="w-full bg-muted rounded-full h-1 overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000 ease-out"
          :style="{ width: `${Math.min((stats.thisWeek / 10) * 100, 100)}%` }"
        ></div>
      </div>
      <p class="text-xs text-muted-foreground mt-1 leading-tight">
        {{ stats.thisWeek }}/10 notes this week
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Custom animations for stat cards */
.group:hover .h-4 {
  animation: bounce 0.5s ease-in-out;
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
  40%, 43% { transform: translate3d(0,-8px,0); }
  70% { transform: translate3d(0,-4px,0); }
  90% { transform: translate3d(0,-2px,0); }
}
</style> 








