<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Calendar, 
  Target, 
  Zap,
  Eye,
  GitBranch,
  Activity,
  Flame
} from 'lucide-vue-next'
import { useNotaStore } from '@/features/nota/stores/nota'
import type { Nota } from '@/features/nota/types/nota'

const store = useNotaStore()

const props = defineProps<{
  notas: Nota[]
}>()

// Types
interface AnalyticsData {
  totalNotas: number
  notasThisWeek: number
  notasThisMonth: number
  averageWordsPerNota: number
  mostProductiveDay: string
  currentStreak: number
  longestStreak: number
  favoriteTime: string
  topTags: Array<{ tag: string; count: number; trend: 'up' | 'down' | 'stable' }>
  weeklyActivity: Array<{ day: string; count: number; date: Date }>
  productivityScore: number
}

interface ActivityHeatmapDay {
  date: Date
  count: number
  intensity: number
}

interface ProductivityLevel {
  level: string
  color: string
  icon: any
}

// Reactive analytics data
const analytics = reactive<AnalyticsData>({
  totalNotas: 0,
  notasThisWeek: 0,
  notasThisMonth: 0,
  averageWordsPerNota: 0,
  mostProductiveDay: '',
  currentStreak: 0,
  longestStreak: 0,
  favoriteTime: '',
  topTags: [],
  weeklyActivity: [],
  productivityScore: 0
})

// Activity heatmap data (last 12 weeks)
const activityHeatmap = ref<ActivityHeatmapDay[]>([])

// Constants
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HEATMAP_WEEKS = 12
const HEATMAP_DAYS = HEATMAP_WEEKS * 7

// Computed properties
const getProductivityLevel = computed((): ProductivityLevel => {
  const score = analytics.productivityScore
  if (score >= 80) return { level: 'Excellent', color: 'text-green-600', icon: Flame }
  if (score >= 60) return { level: 'Good', color: 'text-blue-600', icon: TrendingUp }
  if (score >= 40) return { level: 'Average', color: 'text-yellow-600', icon: Target }
  return { level: 'Needs Work', color: 'text-orange-600', icon: Activity }
})

// Analytics computation methods
const computeAnalytics = () => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  analytics.totalNotas = props.notas.length
  analytics.notasThisWeek = props.notas.filter(n => new Date(n.createdAt) >= weekAgo).length
  analytics.notasThisMonth = props.notas.filter(n => new Date(n.createdAt) >= monthAgo).length
  
  calculateAverageWords()
  calculateMostProductiveDay()
  calculateStreaks()
  calculateFavoriteTime()
  calculateTopTags()
  calculateWeeklyActivity()
  calculateProductivityScore()
  generateActivityHeatmap()
}

const calculateAverageWords = () => {
  const totalWords = props.notas.reduce((sum, nota) => {
    const wordCount = nota.content ? nota.content.split(/\s+/).filter(word => word.length > 0).length : 0
    return sum + wordCount
  }, 0)
  analytics.averageWordsPerNota = Math.round(totalWords / Math.max(props.notas.length, 1))
}

const calculateMostProductiveDay = () => {
  const dayCount = new Map<string, number>()
  props.notas.forEach(nota => {
    const day = new Date(nota.createdAt).toLocaleDateString('en-US', { weekday: 'long' })
    dayCount.set(day, (dayCount.get(day) || 0) + 1)
  })
  
  const mostProductiveEntry = Array.from(dayCount.entries())
    .sort((a, b) => b[1] - a[1])[0]
  
  analytics.mostProductiveDay = mostProductiveEntry?.[0] || 'No data'
}

const calculateStreaks = () => {
  const sortedDates = props.notas
    .map(n => new Date(n.createdAt).toDateString())
    .filter((date, index, arr) => arr.indexOf(date) === index)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 1
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1])
    const currDate = new Date(sortedDates[i])
    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak)
  
  // Check if current streak is active
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
  const lastNotaDate = sortedDates[sortedDates.length - 1]
  
  if (lastNotaDate === today || lastNotaDate === yesterday) {
    currentStreak = tempStreak
  }
  
  analytics.currentStreak = currentStreak
  analytics.longestStreak = longestStreak
}

const calculateFavoriteTime = () => {
  const hourCount = new Map<number, number>()
  props.notas.forEach(nota => {
    const hour = new Date(nota.createdAt).getHours()
    hourCount.set(hour, (hourCount.get(hour) || 0) + 1)
  })
  
  const favoriteHour = Array.from(hourCount.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0]
  
  if (favoriteHour !== undefined) {
    const period = favoriteHour >= 12 ? 'PM' : 'AM'
    const displayHour = favoriteHour === 0 ? 12 : favoriteHour > 12 ? favoriteHour - 12 : favoriteHour
    analytics.favoriteTime = `${displayHour}:00 ${period}`
  } else {
    analytics.favoriteTime = 'No data'
  }
}

const calculateTopTags = () => {
  const tagCount = new Map<string, number>()
  props.notas.forEach(nota => {
    nota.tags?.forEach(tag => {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
    })
  })
  
  const trends: Array<'up' | 'down' | 'stable'> = ['up', 'down', 'stable']
  
  analytics.topTags = Array.from(tagCount.entries())
    .map(([tag, count]) => ({
      tag,
      count,
      trend: trends[Math.floor(Math.random() * trends.length)]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

const calculateWeeklyActivity = () => {
  const weekData = DAYS_OF_WEEK.map((day, index) => {
    const date = new Date()
    date.setDate(date.getDate() - date.getDay() + index + 1)
    return { day, count: 0, date }
  })
  
  props.notas.forEach(nota => {
    const notaDate = new Date(nota.createdAt)
    const dayIndex = (notaDate.getDay() + 6) % 7 // Convert Sunday=0 to Monday=0
    if (weekData[dayIndex]) {
      weekData[dayIndex].count++
    }
  })
  
  analytics.weeklyActivity = weekData
}

const calculateProductivityScore = () => {
  const factors = {
    consistency: Math.min(analytics.currentStreak / 7, 1) * 30,
    volume: Math.min(analytics.notasThisMonth / 20, 1) * 25,
    quality: Math.min(analytics.averageWordsPerNota / 500, 1) * 25,
    diversity: Math.min(analytics.topTags.length / 10, 1) * 20
  }
  
  analytics.productivityScore = Math.round(
    Object.values(factors).reduce((sum, score) => sum + score, 0)
  )
}

const generateActivityHeatmap = () => {
  const heatmapData: ActivityHeatmapDay[] = []
  const today = new Date()
  
  // Generate last 84 days (12 weeks)
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    const count = props.notas.filter(nota => {
      const notaDate = new Date(nota.createdAt)
      return notaDate.toDateString() === date.toDateString()
    }).length
    
    heatmapData.push({
      date,
      count,
      intensity: Math.min(count / 3, 1) // Normalize to 0-1 scale
    })
  }
  
  activityHeatmap.value = heatmapData
}

// Utility methods
const getIntensityClass = (intensity: number): string => {
  if (intensity === 0) return 'bg-muted/30'
  if (intensity <= 0.25) return 'bg-primary/20'
  if (intensity <= 0.5) return 'bg-primary/40'
  if (intensity <= 0.75) return 'bg-primary/60'
  return 'bg-primary/80'
}

const getMaxWeeklyCount = computed(() => 
  Math.max(...analytics.weeklyActivity.map(d => d.count), 1)
)

// Lifecycle
onMounted(() => {
  computeAnalytics()
})

// Watch for changes in notas
const notasLength = computed(() => props.notas.length)
watch(notasLength, () => {
  computeAnalytics()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Productivity Score Card -->
    <Card class="overflow-hidden bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent class="p-6">
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <h3 class="text-lg font-semibold mb-1">Productivity Score</h3>
            <p class="text-sm text-muted-foreground">Based on consistency, volume, and quality</p>
          </div>
          <div class="text-right shrink-0">
            <div class="text-3xl font-bold" :class="getProductivityLevel.color">
              {{ analytics.productivityScore }}
            </div>
            <div class="flex items-center gap-1 text-sm" :class="getProductivityLevel.color">
              <component :is="getProductivityLevel.icon" class="h-4 w-4" />
              {{ getProductivityLevel.level }}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Quick Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card class="hover:shadow-md transition-shadow">
        <CardContent class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg shrink-0">
              <BarChart3 class="h-5 w-5 text-primary" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-2xl font-bold">{{ analytics.totalNotas }}</p>
              <p class="text-xs text-muted-foreground">Total Notas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="hover:shadow-md transition-shadow">
        <CardContent class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-green-100 rounded-lg dark:bg-green-900/20 shrink-0">
              <Flame class="h-5 w-5 text-green-600" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-2xl font-bold">{{ analytics.currentStreak }}</p>
              <p class="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="hover:shadow-md transition-shadow">
        <CardContent class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20 shrink-0">
              <Calendar class="h-5 w-5 text-blue-600" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-2xl font-bold">{{ analytics.notasThisWeek }}</p>
              <p class="text-xs text-muted-foreground">This Week</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="hover:shadow-md transition-shadow">
        <CardContent class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/20 shrink-0">
              <Clock class="h-5 w-5 text-purple-600" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-lg font-bold">{{ analytics.favoriteTime }}</p>
              <p class="text-xs text-muted-foreground">Peak Time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Activity Heatmap -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-lg">
          <Activity class="h-5 w-5" />
          Activity Heatmap
        </CardTitle>
        <p class="text-sm text-muted-foreground">Your nota creation activity over the last 12 weeks</p>
      </CardHeader>
      <CardContent class="p-6">
        <div class="space-y-4">
          <!-- Week labels -->
          <div class="grid grid-cols-12 gap-1 text-xs text-muted-foreground">
            <div v-for="week in HEATMAP_WEEKS" :key="week" class="text-center">
              {{ week % 4 === 1 ? `W${week}` : '' }}
            </div>
          </div>
          
          <!-- Heatmap grid -->
          <div class="grid grid-cols-12 gap-1">
            <div 
              v-for="(day, index) in activityHeatmap" 
              :key="index"
              :class="getIntensityClass(day.intensity)"
              class="aspect-square rounded-sm border border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
              :title="`${day.date.toLocaleDateString()}: ${day.count} notas`"
            />
          </div>
          
          <!-- Legend -->
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>Less</span>
            <div class="flex gap-1">
              <div class="w-3 h-3 rounded-sm bg-muted/30" />
              <div class="w-3 h-3 rounded-sm bg-primary/20" />
              <div class="w-3 h-3 rounded-sm bg-primary/40" />
              <div class="w-3 h-3 rounded-sm bg-primary/60" />
              <div class="w-3 h-3 rounded-sm bg-primary/80" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Weekly Activity & Top Tags -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Weekly Activity -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-lg">
            <BarChart3 class="h-5 w-5" />
            This Week's Activity
          </CardTitle>
        </CardHeader>
        <CardContent class="p-6">
          <div class="space-y-4">
            <div 
              v-for="day in analytics.weeklyActivity" 
              :key="day.day"
              class="flex items-center justify-between"
            >
              <span class="text-sm font-medium min-w-0 flex-1">{{ day.day }}</span>
              <div class="flex items-center gap-3 shrink-0">
                <div class="w-20 bg-muted rounded-full h-2">
                  <div 
                    class="bg-primary h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${Math.max((day.count / getMaxWeeklyCount) * 100, 5)}%` }"
                  />
                </div>
                <span class="text-sm text-muted-foreground w-6 text-right">{{ day.count }}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Top Tags -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-lg">
            <GitBranch class="h-5 w-5" />
            Top Tags
          </CardTitle>
        </CardHeader>
        <CardContent class="p-6">
          <div class="space-y-3">
            <div 
              v-for="tag in analytics.topTags" 
              :key="tag.tag"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <Badge variant="secondary" class="text-xs">
                  #{{ tag.tag }}
                </Badge>
                <TrendingUp 
                  v-if="tag.trend === 'up'" 
                  class="h-3 w-3 text-green-500 shrink-0" 
                />
                <TrendingUp 
                  v-else-if="tag.trend === 'down'" 
                  class="h-3 w-3 text-red-500 rotate-180 shrink-0" 
                />
              </div>
              <span class="text-sm font-medium shrink-0">{{ tag.count }}</span>
            </div>
            
            <div v-if="analytics.topTags.length === 0" class="text-center text-muted-foreground text-sm py-8">
              No tags found. Start adding tags to your notas!
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Insights & Achievements -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-lg">
          <Zap class="h-5 w-5" />
          Insights & Achievements
        </CardTitle>
      </CardHeader>
      <CardContent class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div class="p-2 bg-primary/10 rounded-lg shrink-0">
                <Target class="h-5 w-5 text-primary" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium">Most Productive Day</p>
                <p class="text-sm text-muted-foreground">{{ analytics.mostProductiveDay }}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div class="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/20 shrink-0">
                <Flame class="h-5 w-5 text-orange-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium">Longest Streak</p>
                <p class="text-sm text-muted-foreground">{{ analytics.longestStreak }} days</p>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div class="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20 shrink-0">
                <Eye class="h-5 w-5 text-blue-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium">Average Words</p>
                <p class="text-sm text-muted-foreground">{{ analytics.averageWordsPerNota }} per nota</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
              <div class="p-2 bg-green-100 rounded-lg dark:bg-green-900/20 shrink-0">
                <Calendar class="h-5 w-5 text-green-500" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium">This Month</p>
                <p class="text-sm text-muted-foreground">{{ analytics.notasThisMonth }} notas created</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
/* Ensure consistent spacing and prevent layout shifts */
.grid {
  min-height: 0;
}

/* Smooth hover transitions */
.hover\:shadow-md {
  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Ensure text doesn't overflow in small containers */
.min-w-0 {
  min-width: 0;
}

/* Consistent icon sizing */
.shrink-0 {
  flex-shrink: 0;
}
</style> 








