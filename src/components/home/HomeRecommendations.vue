<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Lightbulb, 
  Target, 
  TrendingUp, 
  Clock, 
  Tag, 
  Folder,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-vue-next'
import type { Nota } from '@/types/nota'

// Types
interface Recommendation {
  id: string
  type: 'productivity' | 'organization' | 'quality' | 'engagement'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  icon: any
  completed?: boolean
  data?: any
}

interface SmartInsight {
  type: 'welcome' | 'getting-started' | 'productive'
  message: string
}

const props = defineProps<{
  notas: Nota[]
}>()

// State
const recommendations = ref<Recommendation[]>([])
const dismissedRecommendations = ref<string[]>([])

// Constants
const STORAGE_KEY = 'dismissed-recommendations'
const UNTAGGED_THRESHOLD = 0.3
const SHORT_NOTA_THRESHOLD = 50
const ORPHANED_THRESHOLD = 5
const CONSISTENCY_THRESHOLD = 7
const MIN_NOTAS_FOR_FAVORITES = 5
const MIN_NOTAS_FOR_ANALYSIS = 10
const MIN_AVERAGE_WORDS = 100

// Computed properties
const highPriorityRecs = computed(() => 
  recommendations.value.filter(r => r.priority === 'high')
)

const otherRecs = computed(() => 
  recommendations.value.filter(r => r.priority !== 'high')
)

const insights = computed((): SmartInsight[] => {
  const insights: SmartInsight[] = []
  
  if (props.notas.length === 0) {
    insights.push({
      type: 'welcome',
      message: 'Welcome to BashNota! Start by creating your first nota to begin building your knowledge base.'
    })
  } else if (props.notas.length < MIN_NOTAS_FOR_FAVORITES) {
    insights.push({
      type: 'getting-started',
      message: 'You\'re off to a great start! Try creating notas on different topics to explore the platform\'s features.'
    })
  } else {
    const recentActivity = getRecentActivity()
    
    if (recentActivity > 3) {
      insights.push({
        type: 'productive',
        message: `Great momentum! You've created ${recentActivity} notas this week. Keep up the excellent work!`
      })
    }
  }
  
  return insights
})

// Utility functions
const getRecentActivity = (): number => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return props.notas.filter(n => new Date(n.createdAt) >= weekAgo).length
}

const hasChildren = (notaId: string): boolean => {
  return props.notas.some(n => n.parentId === notaId)
}

const loadDismissedRecommendations = () => {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) {
      dismissedRecommendations.value = JSON.parse(dismissed)
    }
  } catch (error) {
    console.error('Failed to load dismissed recommendations:', error)
  }
}

const saveDismissedRecommendations = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissedRecommendations.value))
  } catch (error) {
    console.error('Failed to save dismissed recommendations:', error)
  }
}

// Recommendation generation
const generateRecommendations = () => {
  const recs: Recommendation[] = []
  
  // Analyze notas for recommendations
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  const recentNotas = props.notas.filter(n => new Date(n.createdAt) >= weekAgo)
  const monthlyNotas = props.notas.filter(n => new Date(n.createdAt) >= monthAgo)
  
  // Check for productivity patterns
  if (recentNotas.length === 0 && props.notas.length > 0) {
    recs.push({
      id: 'no-recent-activity',
      type: 'productivity',
      priority: 'high',
      title: 'Get Back on Track',
      description: 'You haven\'t created any notas this week. Consistency is key to building a knowledge base.',
      action: 'Create a new nota',
      icon: Target
    })
  }
  
  // Check for untagged notas
  const untaggedNotas = props.notas.filter(n => !n.tags || n.tags.length === 0)
  if (untaggedNotas.length > props.notas.length * UNTAGGED_THRESHOLD) {
    recs.push({
      id: 'add-tags',
      type: 'organization',
      priority: 'medium',
      title: 'Organize with Tags',
      description: `${untaggedNotas.length} of your notas don't have tags. Tags help you find and organize your content.`,
      action: 'Add tags to notas',
      icon: Tag,
      data: { count: untaggedNotas.length }
    })
  }
  
  // Check for short notas (potential for expansion)
  const shortNotas = props.notas.filter(n => {
    const wordCount = n.content ? n.content.split(/\s+/).filter(word => word.length > 0).length : 0
    return wordCount < SHORT_NOTA_THRESHOLD && wordCount > 0
  })
  if (shortNotas.length > 3) {
    recs.push({
      id: 'expand-content',
      type: 'quality',
      priority: 'medium',
      title: 'Expand Your Ideas',
      description: `You have ${shortNotas.length} brief notas that could benefit from more detail and examples.`,
      action: 'Add more content',
      icon: TrendingUp,
      data: { count: shortNotas.length }
    })
  }
  
  // Check for orphaned notas (no connections)
  const orphanedNotas = props.notas.filter(n => !n.parentId && !hasChildren(n.id))
  if (orphanedNotas.length > ORPHANED_THRESHOLD) {
    recs.push({
      id: 'create-connections',
      type: 'organization',
      priority: 'low',
      title: 'Create Connections',
      description: `${orphanedNotas.length} notas exist in isolation. Consider creating sub-notas or grouping related content.`,
      action: 'Organize into hierarchies',
      icon: Folder,
      data: { count: orphanedNotas.length }
    })
  }
  
  // Check for consistent writing schedule
  if (monthlyNotas.length > 0) {
    const daysWithActivity = new Set(
      monthlyNotas.map(n => new Date(n.createdAt).toDateString())
    ).size
    
    if (daysWithActivity < CONSISTENCY_THRESHOLD) {
      recs.push({
        id: 'consistency-boost',
        type: 'productivity',
        priority: 'medium',
        title: 'Build a Writing Habit',
        description: `You've been active on ${daysWithActivity} days this month. Try to write something daily, even if it's small.`,
        action: 'Set a daily goal',
        icon: Clock,
        data: { activeDays: daysWithActivity }
      })
    }
  }
  
  // Check for duplicate or similar titles
  const titleMap = new Map<string, number>()
  props.notas.forEach(n => {
    const normalizedTitle = n.title.toLowerCase().trim()
    titleMap.set(normalizedTitle, (titleMap.get(normalizedTitle) || 0) + 1)
  })
  
  const duplicateTitles = Array.from(titleMap.entries()).filter(([_, count]) => count > 1)
  if (duplicateTitles.length > 0) {
    recs.push({
      id: 'unique-titles',
      type: 'organization',
      priority: 'low',
      title: 'Make Titles Unique',
      description: `You have ${duplicateTitles.length} sets of duplicate titles. Unique titles make content easier to find.`,
      action: 'Rename duplicate titles',
      icon: Sparkles,
      data: { duplicates: duplicateTitles.length }
    })
  }
  
  // Check for favorites usage
  const favoriteNotas = props.notas.filter(n => n.favorite)
  if (favoriteNotas.length === 0 && props.notas.length > MIN_NOTAS_FOR_FAVORITES) {
    recs.push({
      id: 'use-favorites',
      type: 'organization',
      priority: 'low',
      title: 'Mark Important Notas',
      description: 'You haven\'t marked any notas as favorites. Use favorites to quickly access your most important content.',
      action: 'Add some favorites',
      icon: CheckCircle
    })
  }
  
  // Productivity boost suggestions
  if (props.notas.length > MIN_NOTAS_FOR_ANALYSIS) {
    const avgWordsPerNota = props.notas.reduce((sum, n) => {
      return sum + (n.content ? n.content.split(/\s+/).filter(word => word.length > 0).length : 0)
    }, 0) / props.notas.length
    
    if (avgWordsPerNota < MIN_AVERAGE_WORDS) {
      recs.push({
        id: 'detailed-notes',
        type: 'quality',
        priority: 'medium',
        title: 'Add More Detail',
        description: `Your average nota has ${Math.round(avgWordsPerNota)} words. Consider adding examples, explanations, and context.`,
        action: 'Enhance existing notas',
        icon: Lightbulb,
        data: { avgWords: Math.round(avgWordsPerNota) }
      })
    }
  }
  
  // Filter out dismissed recommendations
  recommendations.value = recs.filter(r => !dismissedRecommendations.value.includes(r.id))
}

// Actions
const dismissRecommendation = (id: string) => {
  dismissedRecommendations.value.push(id)
  saveDismissedRecommendations()
  recommendations.value = recommendations.value.filter(r => r.id !== id)
}

const markCompleted = (id: string) => {
  const rec = recommendations.value.find(r => r.id === id)
  if (rec) {
    rec.completed = true
    setTimeout(() => {
      dismissRecommendation(id)
    }, 2000)
  }
}

// Utility functions for styling
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
    case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
    case 'low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
    default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'productivity': return Target
    case 'organization': return Folder
    case 'quality': return Sparkles
    case 'engagement': return TrendingUp
    default: return Info
  }
}

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'welcome': return Sparkles
    case 'getting-started': return Target
    case 'productive': return TrendingUp
    default: return Info
  }
}

const getInsightColor = (type: string): string => {
  switch (type) {
    case 'welcome': return 'text-primary'
    case 'getting-started': return 'text-blue-600'
    case 'productive': return 'text-green-600'
    default: return 'text-muted-foreground'
  }
}

// Lifecycle
onMounted(() => {
  loadDismissedRecommendations()
  generateRecommendations()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Smart Insights -->
    <div v-if="insights.length > 0" class="space-y-3">
      <div 
        v-for="insight in insights" 
        :key="insight.type"
        class="flex items-start gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20"
      >
        <div class="p-2 bg-primary/10 rounded-lg shrink-0">
          <component :is="getInsightIcon(insight.type)" class="h-4 w-4" :class="getInsightColor(insight.type)" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-primary">Smart Insight</p>
          <p class="text-sm text-muted-foreground mt-1">{{ insight.message }}</p>
        </div>
      </div>
    </div>

    <!-- High Priority Recommendations -->
    <div v-if="highPriorityRecs.length > 0">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertCircle class="h-5 w-5 text-red-500" />
        Priority Actions
      </h3>
      <div class="space-y-3">
        <Card 
          v-for="rec in highPriorityRecs" 
          :key="rec.id"
          class="border-l-4 border-l-red-500 hover:shadow-md transition-shadow"
          :class="{ 'opacity-60': rec.completed }"
        >
          <CardContent class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 shrink-0">
                  <component :is="rec.icon" class="h-5 w-5 text-red-600" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 class="font-medium">{{ rec.title }}</h4>
                    <Badge :class="getPriorityColor(rec.priority)" class="text-xs">
                      {{ rec.priority }}
                    </Badge>
                  </div>
                  <p class="text-sm text-muted-foreground mb-3">{{ rec.description }}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    @click="markCompleted(rec.id)"
                    :disabled="rec.completed"
                    class="text-xs"
                  >
                    <CheckCircle v-if="rec.completed" class="h-3 w-3 mr-1" />
                    <ArrowRight v-else class="h-3 w-3 mr-1" />
                    {{ rec.completed ? 'Completed' : rec.action }}
                  </Button>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                @click="dismissRecommendation(rec.id)"
                class="text-muted-foreground hover:text-foreground shrink-0"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Other Recommendations -->
    <div v-if="otherRecs.length > 0">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <Lightbulb class="h-5 w-5 text-primary" />
        Suggestions for You
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          v-for="rec in otherRecs" 
          :key="rec.id"
          class="hover:shadow-md transition-shadow"
          :class="{ 'opacity-60': rec.completed }"
        >
          <CardContent class="p-4">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <div class="p-1.5 bg-muted/50 rounded-lg shrink-0">
                  <component :is="getTypeIcon(rec.type)" class="h-3 w-3 text-muted-foreground" />
                </div>
                <Badge :class="getPriorityColor(rec.priority)" class="text-xs">
                  {{ rec.priority }}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                @click="dismissRecommendation(rec.id)"
                class="text-muted-foreground hover:text-foreground -mt-1 -mr-1 shrink-0"
              >
                ×
              </Button>
            </div>
            
            <div class="space-y-3">
              <h4 class="font-medium text-sm">{{ rec.title }}</h4>
              <p class="text-xs text-muted-foreground leading-relaxed">{{ rec.description }}</p>
              <Button 
                size="sm" 
                variant="outline"
                @click="markCompleted(rec.id)"
                :disabled="rec.completed"
                class="text-xs w-full"
              >
                <CheckCircle v-if="rec.completed" class="h-3 w-3 mr-1" />
                <ArrowRight v-else class="h-3 w-3 mr-1" />
                {{ rec.completed ? 'Completed' : rec.action }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- No Recommendations -->
    <div v-if="recommendations.length === 0" class="text-center py-12">
      <div class="flex flex-col items-center gap-4">
        <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-full">
          <CheckCircle class="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h3 class="font-medium text-green-600 text-lg">All Caught Up!</h3>
          <p class="text-sm text-muted-foreground mt-1">
            You're doing great! No recommendations at the moment.
          </p>
        </div>
      </div>
    </div>
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

/* Better line height for readability */
.leading-relaxed {
  line-height: 1.6;
}
</style> 