<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import { ExternalLink, Trash2, Clock, Search, Grid, List, Table, AlertCircle, CalendarDays, BarChart, Eye, Filter, DownloadCloud, ThumbsUp, ThumbsDown } from 'lucide-vue-next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { type PublishedNota } from '@/types/nota'
import { logger } from '@/services/logger'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/services/firebase'
import { toast } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const notaStore = useNotaStore()
const authStore = useAuthStore()
const publishedNotas = ref<PublishedNota[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const userId = ref<string | null>(null)
const searchQuery = ref('')
const viewType = ref<'grid' | 'list' | 'table'>('grid')
const isConfirmDeleteOpen = ref(false)
const notaToDelete = ref<string | null>(null)
const dateFilter = ref<'all' | 'today' | 'week' | 'month' | 'year'>('all')
const isFilterOpen = ref(false)
const sortBy = ref<'date' | 'views' | 'title'>('date')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Activity grid data
const activityData = reactive({
  // Stores count of publications by date - format: 'YYYY-MM-DD': count
  byDate: {} as Record<string, number>,
  // Max publications in a single day (for color intensity calculation)
  maxCount: 0,
  // Dates range for current month grid (past 4 weeks)
  startDate: new Date(),
  endDate: new Date()
})

// Statistics
const stats = reactive({
  totalViews: 0,
  mostViewed: null as PublishedNota | null,
  averageViews: 0,
  publishedToday: 0,
  publishedThisWeek: 0,
  publishedThisMonth: 0,
  topTags: [] as {tag: string, count: number}[],
  totalLikes: 0,
  totalDislikes: 0,
  mostLiked: null as PublishedNota | null,
  likeRatio: undefined as number | undefined
})

// Check if the current logged-in user is viewing their own profile
const isOwnProfile = computed(() => {
  return authStore.isAuthenticated && authStore.currentUser?.uid === userId.value
})

// Filtered notas based on search query
const filteredNotas = computed(() => {
  if (!searchQuery.value) return publishedNotas.value
  
  const query = searchQuery.value.toLowerCase()
  return publishedNotas.value.filter(nota => 
    nota.title.toLowerCase().includes(query)
  )
})

// Computed property to get author name from the first published nota
const authorName = computed(() => {
  if (publishedNotas.value.length > 0) {
    return publishedNotas.value[0].authorName
  }
  return 'Author'
})

// Computed property to generate initials from author name
const authorInitials = computed(() => {
  if (!authorName.value) return ''

  const nameParts = authorName.value.split(' ').filter((part) => part.length > 0)
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
  } else if (nameParts.length === 1) {
    return nameParts[0][0].toUpperCase()
  }
  return ''
})

// Computed property to check which route parameter is available
const userTag = computed(() => {
  const tag = route.params.userTag;
  return typeof tag === 'string' ? tag : (Array.isArray(tag) ? tag[0] : '');
})

const legacyUserId = computed(() => {
  const id = route.params.userId;
  return typeof id === 'string' ? id : (Array.isArray(id) ? id[0] : '');
})

// Profile URL for sharing
const profileUrl = computed(() => {
  if (userTag.value) {
    return `/@${userTag.value}`
  }
  return `/u/${userId.value}`
})

// Convert user tag to user ID if needed
const getUserIdFromTag = async (tag: string): Promise<string | null> => {
  try {
    // Use the userTags collection for lookup
    const tagDoc = doc(firestore, 'userTags', tag)
    const tagSnapshot = await getDoc(tagDoc)
    
    if (tagSnapshot.exists()) {
      return tagSnapshot.data().uid
    }
    
    return null
  } catch (err) {
    logger.error('Error fetching user ID from tag:', err)
    return null
  }
}

// Date filtering logic
const getDateFilter = (filter: string) => {
  const now = new Date()
  switch (filter) {
    case 'today':
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return (date: Date) => date >= today
    case 'week':
      const week = new Date(now)
      week.setDate(now.getDate() - 7)
      return (date: Date) => date >= week
    case 'month':
      const month = new Date(now)
      month.setMonth(now.getMonth() - 1)
      return (date: Date) => date >= month
    case 'year':
      const year = new Date(now)
      year.setFullYear(now.getFullYear() - 1)
      return (date: Date) => date >= year
    default:
      return () => true
  }
}

// Sorted and filtered notas
const processedNotas = computed(() => {
  // First apply search filter
  let result = searchQuery.value 
    ? publishedNotas.value.filter(nota => nota.title.toLowerCase().includes(searchQuery.value.toLowerCase()))
    : [...publishedNotas.value]
  
  // Then apply date filter
  if (dateFilter.value !== 'all') {
    const filterFn = getDateFilter(dateFilter.value)
    result = result.filter(nota => filterFn(new Date(nota.publishedAt)))
  }
  
  // Then sort
  result.sort((a, b) => {
    let comparison = 0
    
    if (sortBy.value === 'date') {
      comparison = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    } else if (sortBy.value === 'title') {
      comparison = a.title.localeCompare(b.title)
    } else if (sortBy.value === 'views') {
      // Fallback to view count if available, otherwise publishedAt
      const viewsA = a.viewCount || 0
      const viewsB = b.viewCount || 0
      comparison = viewsB - viewsA
    }
    
    return sortDirection.value === 'asc' ? -comparison : comparison
  })
  
  return result
})

// Calculate activity grid data from published notas
const calculateActivityGrid = (notas: PublishedNota[]) => {
  // Reset the activity data
  activityData.byDate = {}
  activityData.maxCount = 0
  
  // Set date range for the past 4 weeks (28 days)
  const today = new Date()
  activityData.endDate = new Date(today)
  activityData.startDate = new Date(today)
  activityData.startDate.setDate(today.getDate() - 27) // 28 days including today
  
  // Initialize all dates in the range with 0 count
  let currentDate = new Date(activityData.startDate)
  while (currentDate <= activityData.endDate) {
    const dateKey = formatDateKey(currentDate)
    activityData.byDate[dateKey] = 0
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // Count publications for each date
  notas.forEach(nota => {
    const pubDate = new Date(nota.publishedAt)
    // Only count if within our date range
    if (pubDate >= activityData.startDate && pubDate <= activityData.endDate) {
      const dateKey = formatDateKey(pubDate)
      activityData.byDate[dateKey] = (activityData.byDate[dateKey] || 0) + 1
      // Track max count for color scaling
      if (activityData.byDate[dateKey] > activityData.maxCount) {
        activityData.maxCount = activityData.byDate[dateKey]
      }
    }
  })
}

// Format date to YYYY-MM-DD for activity grid
const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

// Get days of the week for grid labels
const getDaysOfWeek = () => {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
}

// Get month weeks (array of arrays containing dates for each week)
const getMonthWeeks = computed(() => {
  const weeks: string[][] = []
  let currentDate = new Date(activityData.startDate)
  let currentWeek: string[] = []
  
  // Start with appropriate day of week padding
  const startDayOfWeek = currentDate.getDay()
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push('')
  }
  
  // Fill in the days
  while (currentDate <= activityData.endDate) {
    const dateKey = formatDateKey(currentDate)
    currentWeek.push(dateKey)
    
    // Start a new week when we reach Saturday
    if (currentDate.getDay() === 6) {
      weeks.push([...currentWeek])
      currentWeek = []
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // Add the last week if it's not complete
  if (currentWeek.length > 0) {
    // Pad to end of week if needed
    while (currentWeek.length < 7) {
      currentWeek.push('')
    }
    weeks.push(currentWeek)
  }
  
  return weeks
})

// Get color class based on activity count
const getActivityColorClass = (count: number) => {
  if (count === 0) return 'bg-muted/20'
  
  // Calculate intensity level (0-4) based on max count
  const max = Math.max(activityData.maxCount, 4)
  const level = Math.ceil((count / max) * 4)
  
  // Return appropriate color class based on level
  switch (level) {
    case 1: return 'bg-primary/20'
    case 2: return 'bg-primary/40'
    case 3: return 'bg-primary/60'
    case 4: return 'bg-primary/80'
    default: return 'bg-primary/20'
  }
}

// Create title text for each activity cell
const getActivityTitle = (dateKey: string) => {
  if (!dateKey) return ''
  
  const count = activityData.byDate[dateKey] || 0
  const date = new Date(dateKey)
  const formattedDate = formatDate(date)
  
  return `${count} publication${count !== 1 ? 's' : ''} on ${formattedDate}`
}

// Load user's published notas
const loadPublishedNotas = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    // Determine which identifier to use
    let userIdToUse = userId.value
    
    if (!userIdToUse) {
      error.value = 'No user ID provided'
      return
    }

    const notas = await notaStore.getPublishedNotasByUser(userIdToUse)
    publishedNotas.value = notas

    if (notas.length === 0) {
      // This isn't an error, just an empty state
      isLoading.value = false
      return
    }
    
    // Calculate statistics
    calculateStats(notas)
    calculateActivityGrid(notas)
  } catch (err) {
    logger.error('Error loading published notas:', err)
    error.value = 'Failed to load published notas'
  } finally {
    isLoading.value = false
  }
}

// Calculate statistics for the published notas
const calculateStats = (notas: PublishedNota[]) => {
  // Reset stats
  stats.totalViews = 0
  stats.mostViewed = null
  stats.averageViews = 0
  stats.publishedToday = 0
  stats.publishedThisWeek = 0
  stats.publishedThisMonth = 0
  stats.topTags = []
  stats.totalLikes = 0
  stats.totalDislikes = 0
  stats.mostLiked = null
  stats.likeRatio = undefined
  
  // Find the current date boundaries
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)
  const monthStart = new Date(now); monthStart.setMonth(now.getMonth() - 1)
  
  // Tag counter
  const tagCounter: Record<string, number> = {}
  
  // Process each nota
  notas.forEach(nota => {
    // Count views
    const views = nota.viewCount || 0
    stats.totalViews += views
    
    // Find most viewed
    if (!stats.mostViewed || views > (stats.mostViewed.viewCount || 0)) {
      stats.mostViewed = nota
    }
    
    // Count by publication date
    const pubDate = new Date(nota.publishedAt)
    if (pubDate >= todayStart) stats.publishedToday++
    if (pubDate >= weekStart) stats.publishedThisWeek++
    if (pubDate >= monthStart) stats.publishedThisMonth++
    
    // Count tags if available
    if (nota.tags && Array.isArray(nota.tags)) {
      nota.tags.forEach(tag => {
        tagCounter[tag] = (tagCounter[tag] || 0) + 1
      })
    }

    // Count likes and dislikes
    const likes = nota.likeCount || 0
    const dislikes = nota.dislikeCount || 0
    stats.totalLikes += likes
    stats.totalDislikes += dislikes

    // Find most liked
    if (!stats.mostLiked || likes > (stats.mostLiked.likeCount || 0)) {
      stats.mostLiked = nota
    }
  })
  
  // Calculate average views
  stats.averageViews = notas.length > 0 ? Math.round(stats.totalViews / notas.length) : 0
  
  // Get top tags
  stats.topTags = Object.entries(tagCounter)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Calculate like ratio
  const totalVotes = stats.totalLikes + stats.totalDislikes
  stats.likeRatio = totalVotes > 0 ? stats.totalLikes / totalVotes : undefined

  // Calculate the activity grid data
  calculateActivityGrid(notas)
}

// Set the date filter
const setDateFilter = (filter: 'all' | 'today' | 'week' | 'month' | 'year') => {
  dateFilter.value = filter
  isFilterOpen.value = false
}

// Toggle sort direction
const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

// Set sort criteria
const setSortBy = (sort: 'date' | 'views' | 'title') => {
  if (sortBy.value === sort) {
    toggleSortDirection()
  } else {
    sortBy.value = sort
    sortDirection.value = 'desc'
  }
}

// Export data as CSV
const exportAsCSV = () => {
  // Create CSV headers
  let csvContent = "Title,Published Date,Last Updated,Views\n"
  
  // Add each nota as a row
  processedNotas.value.forEach(nota => {
    const title = nota.title.replace(/,/g, ' ')
    const published = formatDate(nota.publishedAt)
    const updated = formatDate(nota.updatedAt)
    const views = nota.viewCount || 0
    
    csvContent += `"${title}",${published},${updated},${views}\n`
  })
  
  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `published-notas-${formatDate(new Date())}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  toast('CSV file downloaded successfully')
}

// Watch for changes in route parameters
watch(
  () => route.params,
  async () => {
    await resolveUserId()
  }
)

// Resolve user ID from either direct ID or user tag
const resolveUserId = async () => {
  try {
    if (legacyUserId.value) {
      // Direct user ID provided
      userId.value = legacyUserId.value
    } else if (userTag.value) {
      // User tag provided, need to look up the ID
      const id = await getUserIdFromTag(userTag.value)
      if (id) {
        userId.value = id
      } else {
        error.value = 'User not found'
        isLoading.value = false
        return
      }
    } else {
      error.value = 'No valid user identifier provided'
      isLoading.value = false
      return
    }
    
    await loadPublishedNotas()
  } catch (err) {
    logger.error('Error resolving user ID:', err)
    error.value = 'Error finding user'
    isLoading.value = false
  }
}

onMounted(async () => {
  await resolveUserId()
})

const viewNota = (id: string) => {
  // Use the user tag in the URL if available
  if (userTag.value) {
    router.push(`/@${userTag.value}/${id}`)
  } else {
    router.push(`/p/${id}`)
  }
}

// Handle unpublishing a nota (deleting it from public view)
const confirmDelete = (notaId: string) => {
  notaToDelete.value = notaId
  isConfirmDeleteOpen.value = true
}

const cancelDelete = () => {
  notaToDelete.value = null
  isConfirmDeleteOpen.value = false
}

const unpublishNota = async () => {
  if (!notaToDelete.value) return
  
  try {
    // First try to load the nota into the store to ensure it exists locally
    await notaStore.loadNota(notaToDelete.value)
    
    // Then unpublish it
    await notaStore.unpublishNota(notaToDelete.value)
    
    // Remove the nota from the list
    publishedNotas.value = publishedNotas.value.filter(nota => nota.id !== notaToDelete.value)
    toast('Nota unpublished successfully')
  } catch (error) {
    logger.error('Error unpublishing nota:', error)
    toast('Failed to unpublish nota', undefined, 'destructive')
  } finally {
    isConfirmDeleteOpen.value = false
    notaToDelete.value = null
  }
}
</script>

<template>
  <div class="container mx-auto py-8 px-4 overflow-auto">
    <!-- Profile Header -->
    <header class="mb-8">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="flex items-center gap-4">
          <!-- User Avatar -->
          <Avatar class="h-16 w-16">
            <AvatarFallback class="text-lg">
              {{ authorInitials || 'A' }}
            </AvatarFallback>
          </Avatar>

          <!-- User info -->
          <div>
            <h1 class="text-3xl font-bold">{{ authorName }}'s Notas</h1>
            <p class="text-muted-foreground mt-1">
              <span v-if="userTag">@{{ userTag }} • </span>
              Published documents and notes
            </p>
          </div>
        </div>

        <!-- Search and view controls -->
        <div class="flex items-center gap-2 mt-2 md:mt-0">
          <div class="relative w-full md:w-auto">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              :value="searchQuery"
              @input="(event: Event) => searchQuery = (event.target as HTMLInputElement).value"
              type="search"
              placeholder="Search notas..."
              class="pl-8 w-full md:w-[200px]"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            @click="viewType = 'grid'"
            :class="{ 'bg-primary/10': viewType === 'grid' }"
          >
            <Grid class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            @click="viewType = 'list'"
            :class="{ 'bg-primary/10': viewType === 'list' }"
          >
            <List class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            @click="viewType = 'table'"
            :class="{ 'bg-primary/10': viewType === 'table' }"
          >
            <Table class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <LoadingSpinner class="w-10 h-10" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <h2 class="text-red-600 text-xl font-semibold mb-2">{{ error }}</h2>
      <p class="text-gray-600 mb-4">There was an error loading the published notas.</p>
      <Button @click="router.push('/')">Go Home</Button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="publishedNotas.length === 0"
      class="bg-muted/50 border rounded-lg p-8 text-center"
    >
      <h2 class="text-xl font-semibold mb-2">No Published Notas</h2>
      <p class="text-muted-foreground mb-4">This user hasn't published any notas yet.</p>
      <Button @click="router.push('/')">Go Home</Button>
    </div>

    <!-- Content state with Stats and Notas -->
    <div v-else-if="publishedNotas.length > 0" class="space-y-6">
      <!-- Two-column layout for larger screens -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Stats Card - Takes 1/3 of the space on larger screens -->
        <div class="lg:col-span-1">
          <Card class="overflow-hidden h-full">
            <CardHeader class="bg-card border-b px-4 py-3">
              <CardTitle class="text-base flex items-center gap-2">
                <BarChart class="h-4 w-4" />
                Publication Statistics
              </CardTitle>
            </CardHeader>
            <CardContent class="p-3">
              <div class="space-y-3">
                <!-- Combined Stats Grid -->
                <div class="grid grid-cols-2 gap-2">
                  <!-- Views -->
                  <div class="bg-muted/30 rounded-md p-2.5 flex flex-col">
                    <div class="flex items-center justify-between">
                      <p class="text-xs font-medium text-muted-foreground">Total Views</p>
                      <Eye class="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div class="mt-1 flex items-end justify-between">
                      <p class="text-lg font-bold">{{ stats.totalViews }}</p>
                      <p class="text-xs text-muted-foreground">Avg: {{ stats.averageViews }}</p>
                    </div>
                  </div>
                  
                  <!-- Recent Publications -->
                  <div class="bg-muted/30 rounded-md p-2.5 flex flex-col">
                    <div class="flex items-center justify-between">
                      <p class="text-xs font-medium text-muted-foreground">Publications</p>
                      <CalendarDays class="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div class="mt-1 flex flex-col text-xs">
                      <div class="grid grid-cols-3 gap-1">
                        <span class="text-muted-foreground">Today:</span>
                        <span class="font-medium col-span-2">{{ stats.publishedToday }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-1">
                        <span class="text-muted-foreground">Week:</span>
                        <span class="font-medium col-span-2">{{ stats.publishedThisWeek }}</span>
                      </div>
                      <div class="grid grid-cols-3 gap-1">
                        <span class="text-muted-foreground">Month:</span>
                        <span class="font-medium col-span-2">{{ stats.publishedThisMonth }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Most Viewed -->
                <div class="bg-muted/30 rounded-md p-2.5">
                  <div class="flex items-center justify-between mb-1">
                    <p class="text-xs font-medium text-muted-foreground">Most Viewed</p>
                    <Eye class="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <p v-if="stats.mostViewed" class="text-xs font-medium line-clamp-1">
                    {{ stats.mostViewed.title }}
                  </p>
                  <p v-if="stats.mostViewed" class="text-xs text-muted-foreground">
                    {{ stats.mostViewed.viewCount || 0 }} views
                  </p>
                  <p v-else class="text-xs italic text-muted-foreground">No view data available</p>
                </div>
              
                <!-- Engagement Stats -->
                <div class="bg-muted/30 rounded-md p-2.5">
                  <div class="flex items-center justify-between mb-1">
                    <p class="text-xs font-medium text-muted-foreground">Engagement</p>
                    <ThumbsUp class="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <div class="flex items-center gap-1">
                        <ThumbsUp class="h-3 w-3 text-primary" />
                        <span class="text-xs font-medium">{{ stats.totalLikes || 0 }} Likes</span>
                      </div>
                      <p v-if="stats.mostLiked" class="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        Most: {{ stats.mostLiked.title }}
                      </p>
                    </div>
                    <div>
                      <div class="flex items-center gap-1">
                        <ThumbsDown class="h-3 w-3 text-muted-foreground" />
                        <span class="text-xs font-medium">{{ stats.totalDislikes || 0 }} Dislikes</span>
                      </div>
                      <p v-if="stats.likeRatio !== undefined" class="text-xs text-muted-foreground mt-0.5">
                        Ratio: {{ Math.round(stats.likeRatio * 100) }}%
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Activity Grid -->
                <div class="bg-muted/30 rounded-md p-2.5">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-medium text-muted-foreground">Monthly Activity</p>
                    <BarChart class="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div class="grid grid-cols-8 gap-1 text-center text-[9px]">
                    <!-- Empty cell for alignment -->
                    <div></div>
                    <!-- Days of the week labels -->
                    <div v-for="day in getDaysOfWeek().slice(0, 7)" :key="day" class="text-muted-foreground">
                      {{ day[0] }}
                    </div>
                    
                    <!-- Weekly rows with activity cells -->
                    <template v-for="(week, weekIndex) in getMonthWeeks" :key="'week-' + weekIndex">
                      <!-- Week label (only on first cell in row) -->
                      <div class="text-right pr-1 text-muted-foreground">
                        {{ weekIndex + 1 }}
                      </div>
                      
                      <!-- Activity cells -->
                      <div 
                        v-for="(dateKey, dayIndex) in week" 
                        :key="'day-' + weekIndex + '-' + dayIndex" 
                        :title="getActivityTitle(dateKey)"
                        :class="[
                          getActivityColorClass(activityData.byDate[dateKey] || 0),
                          'h-4 w-4 rounded transition-colors cursor-help'
                        ]"
                      ></div>
                    </template>
                  </div>
                  <div class="flex items-center justify-end gap-1 mt-2 text-[9px]">
                    <span class="text-muted-foreground">Less</span>
                    <div class="h-3 w-3 rounded bg-muted/20"></div>
                    <div class="h-3 w-3 rounded bg-primary/20"></div>
                    <div class="h-3 w-3 rounded bg-primary/40"></div>
                    <div class="h-3 w-3 rounded bg-primary/60"></div>
                    <div class="h-3 w-3 rounded bg-primary/80"></div>
                    <span class="text-muted-foreground">More</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <!-- Notas Card - Takes 2/3 of the space on larger screens -->
        <div class="lg:col-span-2">
          <Card class="overflow-hidden h-full flex flex-col">
            <CardHeader class="bg-card border-b px-6">
              <div class="flex items-center justify-between">
                <div>
                  <CardTitle class="flex items-center gap-2">
                    <Clock class="h-4 w-4" />
                    Published Notas
                  </CardTitle>
                  <CardDescription>
                    {{ processedNotas.length }} public nota{{ processedNotas.length > 1 ? 's' : '' }}
                    {{ dateFilter !== 'all' ? ` (${dateFilter})` : '' }}
                  </CardDescription>
                </div>
                
                <!-- Enhanced Controls -->
                <div class="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    @click="exportAsCSV"
                    class="hidden md:flex"
                  >
                    <DownloadCloud class="mr-1 h-4 w-4" />
                    Export CSV
                  </Button>
                  
                  <!-- Date Filter Dropdown -->
                  <div class="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="isFilterOpen = !isFilterOpen"
                      class="gap-1"
                    >
                      <Filter class="h-4 w-4" />
                      <span class="hidden md:inline">{{ dateFilter === 'all' ? 'All time' : dateFilter }}</span>
                    </Button>
                    
                    <div 
                      v-if="isFilterOpen" 
                      class="absolute right-0 mt-1 w-40 bg-card border rounded-md shadow-lg z-50"
                    >
                      <div class="p-1">
                        <button 
                          v-for="filter in ['all', 'today', 'week', 'month', 'year']" 
                          :key="filter"
                          @click="setDateFilter(filter as any)"
                          class="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                          :class="{ 'bg-muted': dateFilter === filter }"
                        >
                          {{ filter === 'all' ? 'All time' : filter }}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Sort Buttons -->
                  <div class="flex items-center border rounded-md overflow-hidden">
                    <button 
                      @click="setSortBy('date')"
                      class="px-2 py-1 text-xs border-r"
                      :class="sortBy === 'date' ? 'bg-muted' : 'hover:bg-muted/50'"
                    >
                      Date {{ sortBy === 'date' ? (sortDirection === 'desc' ? '↓' : '↑') : '' }}
                    </button>
                    <button 
                      @click="setSortBy('title')"
                      class="px-2 py-1 text-xs border-r"
                      :class="sortBy === 'title' ? 'bg-muted' : 'hover:bg-muted/50'"
                    >
                      Title {{ sortBy === 'title' ? (sortDirection === 'desc' ? '↓' : '↑') : '' }}
                    </button>
                    <button 
                      @click="setSortBy('views')"
                      class="px-2 py-1 text-xs"
                      :class="sortBy === 'views' ? 'bg-muted' : 'hover:bg-muted/50'"
                    >
                      Views {{ sortBy === 'views' ? (sortDirection === 'desc' ? '↓' : '↑') : '' }}
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent class="p-4 overflow-auto flex-1">
              <!-- Grid View -->
              <div v-if="viewType === 'grid'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card v-for="nota in processedNotas" :key="nota.id" class="flex flex-col">
                  <CardHeader>
                    <CardTitle class="line-clamp-2">{{ nota.title }}</CardTitle>
                  </CardHeader>
                  <CardContent class="flex-1">
                    <div class="flex flex-col gap-1 text-sm">
                      <p class="text-sm text-muted-foreground flex justify-between">
                        <span>Published: {{ formatDate(nota.publishedAt) }}</span>
                        <span v-if="nota.viewCount !== undefined" class="flex items-center">
                          <Eye class="h-3.5 w-3.5 mr-1" /> {{ nota.viewCount }}
                        </span>
                      </p>
                      <p class="text-sm text-muted-foreground">
                        Last updated: {{ formatDate(nota.updatedAt) }}
                      </p>
                      <!-- Show tags if available -->
                      <div v-if="nota.tags && nota.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                        <span 
                          v-for="tag in nota.tags" 
                          :key="tag"
                          class="px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                        >
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter class="flex flex-col gap-2">
                    <Button variant="outline" class="w-full" @click="viewNota(nota.id)">
                      <ExternalLink class="mr-2 h-4 w-4" />
                      View Nota
                    </Button>
                    <Button 
                      v-if="isOwnProfile" 
                      variant="outline" 
                      class="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      @click="confirmDelete(nota.id)"
                    >
                      <Trash2 class="mr-2 h-4 w-4" />
                      Unpublish
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              <!-- List View - Enhanced -->
              <div v-else-if="viewType === 'list'" class="space-y-2">
                <div v-for="nota in processedNotas" :key="nota.id" 
                     class="flex flex-col sm:flex-row sm:items-center justify-between border rounded-md p-4 gap-4 hover:bg-muted/50 transition-colors">
                  <div class="flex-1">
                    <h3 class="font-medium text-lg">{{ nota.title }}</h3>
                    <div class="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      <span class="flex items-center">
                        <Clock class="mr-1 h-3 w-3" /> 
                        Published: {{ formatDate(nota.publishedAt) }}
                      </span>
                      <span class="flex items-center">
                        <Clock class="mr-1 h-3 w-3" /> 
                        Updated: {{ formatDate(nota.updatedAt) }}
                      </span>
                      <span v-if="nota.viewCount !== undefined" class="flex items-center">
                        <Eye class="mr-1 h-3 w-3" /> 
                        {{ nota.viewCount }} views
                      </span>
                    </div>
                    <!-- Show tags if available -->
                    <div v-if="nota.tags && nota.tags.length > 0" class="flex flex-wrap gap-1 mt-2">
                      <span 
                        v-for="tag in nota.tags" 
                        :key="tag"
                        class="px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                      >
                        {{ tag }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-2 mt-2 sm:mt-0">
                    <Button size="sm" variant="outline" @click="viewNota(nota.id)">
                      <ExternalLink class="mr-1 h-4 w-4" />
                      View
                    </Button>
                    <Button 
                      v-if="isOwnProfile" 
                      size="sm"
                      variant="outline" 
                      class="text-destructive hover:text-destructive hover:bg-destructive/10"
                      @click="confirmDelete(nota.id)"
                    >
                      <Trash2 class="mr-1 h-4 w-4" />
                      Unpublish
                    </Button>
                  </div>
                </div>
              </div>

              <!-- Table View (Enhanced) -->
              <div v-else class="overflow-x-auto">
                <table class="w-full border-collapse">
                  <thead>
                    <tr class="border-b">
                      <th class="text-left py-3 px-4 font-medium">Title</th>
                      <th class="text-left py-3 px-4 font-medium">Published</th>
                      <th class="text-left py-3 px-4 font-medium">Updated</th>
                      <th class="text-center py-3 px-4 font-medium">Views</th>
                      <th class="text-center py-3 px-4 font-medium">Likes</th>
                      <th class="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="nota in processedNotas" :key="nota.id" class="border-b hover:bg-muted/50 transition-colors">
                      <td class="py-3 px-4">
                        <div class="font-medium">{{ nota.title }}</div>
                        <!-- Show tags if available -->
                        <div v-if="nota.tags && nota.tags.length > 0" class="flex flex-wrap gap-1 mt-1">
                          <span 
                            v-for="tag in nota.tags" 
                            :key="tag"
                            class="px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                          >
                            {{ tag }}
                          </span>
                        </div>
                      </td>
                      <td class="py-3 px-4 text-sm text-muted-foreground">
                        {{ formatDate(nota.publishedAt) }}
                      </td>
                      <td class="py-3 px-4 text-sm text-muted-foreground">
                        {{ formatDate(nota.updatedAt) }}
                      </td>
                      <td class="py-3 px-4 text-sm text-center text-muted-foreground">
                        <span class="flex items-center justify-center">
                          <Eye class="mr-1 h-3.5 w-3.5" /> {{ nota.viewCount || 0 }}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-sm text-center text-muted-foreground">
                        <div class="flex items-center justify-center gap-2">
                          <span class="flex items-center">
                            <ThumbsUp class="mr-1 h-3 w-3 text-primary" /> {{ nota.likeCount || 0 }}
                          </span>
                          <span class="flex items-center">
                            <ThumbsDown class="mr-1 h-3 w-3" /> {{ nota.dislikeCount || 0 }}
                          </span>
                        </div>
                      </td>
                      <td class="py-3 px-4 text-right">
                        <div class="flex justify-end gap-2">
                          <Button size="sm" variant="outline" @click="viewNota(nota.id)">
                            <ExternalLink class="mr-1 h-4 w-4" />
                            View
                          </Button>
                          <Button 
                            v-if="isOwnProfile" 
                            size="sm"
                            variant="outline" 
                            class="text-destructive hover:text-destructive hover:bg-destructive/10"
                            @click="confirmDelete(nota.id)"
                          >
                            <Trash2 class="mr-1 h-4 w-4" />
                            Unpublish
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Empty search/filter results -->
      <div v-if="publishedNotas.length > 0 && processedNotas.length === 0" class="text-center py-12">
        <AlertCircle class="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 class="mt-4 text-lg font-semibold">No matching notas</h3>
        <p class="text-muted-foreground">Try adjusting your search query or filters.</p>
        <div class="flex gap-2 justify-center mt-4">
          <Button variant="outline" @click="searchQuery = ''">Clear Search</Button>
          <Button variant="outline" @click="dateFilter = 'all'">Clear Filters</Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div v-if="isConfirmDeleteOpen" class="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
    <div class="bg-card border rounded-lg shadow-lg max-w-md w-full p-6">
      <h2 class="text-xl font-semibold mb-4">Unpublish Nota</h2>
      <p class="mb-6">
        Are you sure you want to unpublish this nota? It will no longer be accessible to the public,
        but you can publish it again later.
      </p>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="cancelDelete">Cancel</Button>
        <Button variant="destructive" @click="unpublishNota">Unpublish</Button>
      </div>
    </div>
  </div>
</template>
