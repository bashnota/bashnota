<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PodiumView from './PodiumView.vue'
import EmptyState from './EmptyState.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { Button } from '@/components/ui/button'
import { 
  Heart, 
  ChevronRight, 
  ChevronLeft, 
  LayoutGrid, 
  List,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Users,
  BarChart2
} from 'lucide-vue-next'

interface VotesContributorTabProps {
  isActive: boolean
  title: string
  contributors: Array<{
    uid: string
    name: string
    tag?: string
    count: number
    totalVotes?: number
  }>
  isLoading: boolean
  error: string | null
}

const props = defineProps<VotesContributorTabProps>()
const router = useRouter()

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(5)
const viewMode = ref<'grid' | 'list'>('list')
const sortDirection = ref<'asc' | 'desc'>('desc')
const sortCriteria = ref<'votes' | 'count'>('votes')

// Reset pagination when tab changes
watch(() => props.isActive, (isActive) => {
  if (isActive) {
    currentPage.value = 1
  }
})

// Computed properties
const hasContributors = computed(() => props.contributors.length > 0)
const hasError = computed(() => !!props.error)
const showLoading = computed(() => props.isLoading)
const showEmptyState = computed(() => !props.isLoading && !hasError.value && !hasContributors.value)
const showContent = computed(() => !props.isLoading && !hasError.value && hasContributors.value)

// Sort and paginate the contributors
const sortedContributors = computed(() => {
  if (!props.contributors.length) return []
  
  // Create a new array to avoid mutating props
  const sorted = [...props.contributors]
  
  // Sort by selected criteria
  sorted.sort((a, b) => {
    if (sortCriteria.value === 'votes') {
      const aVotes = a.totalVotes || 0
      const bVotes = b.totalVotes || 0
      return sortDirection.value === 'desc' ? bVotes - aVotes : aVotes - bVotes
    } else {
      return sortDirection.value === 'desc' ? b.count - a.count : a.count - b.count
    }
  })
  
  return sorted
})

// Prepare contributors data for the podium
const podiumContributors = computed(() => {
  // Take top 3 from sorted contributors
  return sortedContributors.value.slice(0, 3).map(contributor => ({
    ...contributor,
    // Display totalVotes as the count for the podium
    count: contributor.totalVotes || 0
  }))
})

// Get the contributors for the current page (excluding top 3)
const paginatedContributors = computed(() => {
  const start = 3 + (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return sortedContributors.value.slice(start, end)
})

// Pagination controls
const totalRemainingContributors = computed(() => Math.max(0, props.contributors.length - 3))
const totalPages = computed(() => Math.ceil(totalRemainingContributors.value / itemsPerPage.value))
const canGoNext = computed(() => currentPage.value < totalPages.value)
const canGoPrev = computed(() => currentPage.value > 1)
const showPagination = computed(() => totalPages.value > 1)
const currentRange = computed(() => {
  const start = 3 + (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(start + paginatedContributors.value.length - 1, props.contributors.length)
  return `${start}-${end} of ${props.contributors.length}`
})

// Navigation functions
const nextPage = () => {
  if (canGoNext.value) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (canGoPrev.value) {
    currentPage.value--
  }
}

// Toggle view mode
const toggleViewMode = (mode: 'grid' | 'list') => {
  viewMode.value = mode
}

// Toggle sort direction
const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
}

// Toggle sort criteria
const toggleSortCriteria = (criteria: 'votes' | 'count') => {
  sortCriteria.value = criteria
}

// View contributor content
const viewContributor = (contributor: any) => {
  if (contributor.tag) {
    router.push(`/@${contributor.tag}`)
  } else if (contributor.uid) {
    router.push(`/u/${contributor.uid}`)
  }
}

// Calculate vote to nota ratio for a contributor
const getVoteRatio = (contributor: any) => {
  if (!contributor.count || contributor.count === 0) return 0
  return ((contributor.totalVotes || 0) / contributor.count).toFixed(1)
}
</script>

<template>
  <div class="votes-contributor-tab">
    <h2 class="text-xl font-semibold mb-4">{{ title }}</h2>
    
    <!-- Loading state -->
    <div v-if="showLoading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>
    
    <!-- Error state -->
    <div v-else-if="hasError" class="text-red-500 py-4 bg-destructive/10 px-4 rounded-md">
      {{ error }}
    </div>
    
    <!-- Empty state -->
    <EmptyState 
      v-else-if="showEmptyState" 
      :icon="Heart" 
      title="No Top Voted Users Found"
      description="Be the first to get votes on your content!"
    />
    
    <!-- Content state -->
    <div v-else-if="showContent" class="space-y-6">
      <!-- Podium view for top 3 voted contributors -->
      <PodiumView 
        :contributors="podiumContributors" 
        podiumTitle="Most Voted Users Podium" 
      />
      
      <!-- Leaderboard Section for remaining contributors -->
      <div v-if="totalRemainingContributors > 0" class="relative">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Votes Leaderboard</h3>
          
          <div class="flex items-center gap-2">
            <!-- Sort criteria toggle -->
            <div class="flex border rounded-md overflow-hidden">
              <button 
                class="px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors"
                :class="{'bg-primary text-primary-foreground': sortCriteria === 'votes', 'hover:bg-accent': sortCriteria !== 'votes'}"
                @click="toggleSortCriteria('votes')"
              >
                <Heart class="h-3 w-3" />
                Votes
              </button>
              <button 
                class="px-2 py-1 text-xs font-medium flex items-center gap-1 transition-colors"
                :class="{'bg-primary text-primary-foreground': sortCriteria === 'count', 'hover:bg-accent': sortCriteria !== 'count'}"
                @click="toggleSortCriteria('count')"
              >
                <BarChart2 class="h-3 w-3" />
                Notas
              </button>
            </div>
            
            <!-- Sort direction toggle -->
            <Button 
              variant="outline" 
              size="sm"
              @click="toggleSortDirection"
              title="Toggle sort order"
              class="flex items-center gap-1"
            >
              <ArrowDownNarrowWide v-if="sortDirection === 'desc'" class="h-4 w-4" />
              <ArrowUpNarrowWide v-else class="h-4 w-4" />
              {{ sortDirection === 'desc' ? 'Highest First' : 'Lowest First' }}
            </Button>
            
            <!-- View mode toggle -->
            <div class="flex gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                :class="{ 'bg-primary/10': viewMode === 'list' }"
                @click="toggleViewMode('list')"
                title="List view"
              >
                <List class="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                :class="{ 'bg-primary/10': viewMode === 'grid' }"
                @click="toggleViewMode('grid')"
                title="Grid view"
              >
                <LayoutGrid class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <!-- Grid View -->
        <div 
          v-if="viewMode === 'grid'" 
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4"
        >
          <div 
            v-for="(contributor, index) in paginatedContributors" 
            :key="contributor.uid"
            class="bg-card rounded-lg border shadow-sm p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-accent/50 relative"
            @click="viewContributor(contributor)"
          >
            <div class="flex flex-col items-center text-center">
              <!-- Avatar placeholder -->
              <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold mb-3">
                {{ contributor.name.charAt(0).toUpperCase() }}
              </div>
              
              <!-- Position badge -->
              <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-background shadow-sm flex items-center justify-center text-sm font-semibold">
                {{ 3 + (currentPage - 1) * itemsPerPage + index + 1 }}
              </div>
              
              <h4 class="font-semibold truncate w-full">{{ contributor.name }}</h4>
              <div v-if="contributor.tag" class="text-sm text-muted-foreground mb-2">
                @{{ contributor.tag }}
              </div>
              
              <!-- Stats -->
              <div class="grid grid-cols-2 gap-2 w-full mt-3">
                <div class="flex flex-col items-center py-1 px-2 rounded-md bg-primary/5">
                  <span class="text-xs text-muted-foreground">Votes</span>
                  <div class="flex items-center gap-1">
                    <Heart class="h-3 w-3 text-primary" />
                    <span class="font-medium text-sm">{{ contributor.totalVotes || 0 }}</span>
                  </div>
                </div>
                
                <div class="flex flex-col items-center py-1 px-2 rounded-md bg-primary/5">
                  <span class="text-xs text-muted-foreground">Notas</span>
                  <div class="flex items-center gap-1">
                    <BarChart2 class="h-3 w-3" />
                    <span class="font-medium text-sm">{{ contributor.count }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Ratio badge -->
              <div class="mt-2 py-1 px-3 rounded-full bg-accent text-sm font-medium">
                {{ getVoteRatio(contributor) }} votes/nota
              </div>
            </div>
          </div>
        </div>
        
        <!-- List View (default) -->
        <div v-else class="space-y-2 mb-4">
          <div 
            v-for="(contributor, index) in paginatedContributors" 
            :key="contributor.uid"
            class="flex items-center justify-between p-3 bg-card rounded-lg border shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-accent/50"
            @click="viewContributor(contributor)"
          >
            <div class="flex items-center gap-3">
              <div class="relative">
                <!-- Position badge -->
                <span class="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-primary/20 rounded-full text-xs font-semibold">
                  {{ 3 + (currentPage - 1) * itemsPerPage + index + 1 }}
                </span>
                
                <!-- Avatar -->
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold">
                  {{ contributor.name.charAt(0).toUpperCase() }}
                </div>
              </div>
              
              <div>
                <div class="font-semibold">{{ contributor.name }}</div>
                <div v-if="contributor.tag" class="text-xs text-muted-foreground">
                  @{{ contributor.tag }}
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2 text-sm">
              <!-- Vote stats -->
              <div class="flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10">
                <Heart class="h-4 w-4 text-primary" />
                <span class="font-medium">{{ contributor.totalVotes || 0 }}</span>
              </div>
              
              <!-- Nota count -->
              <div class="flex items-center gap-1 text-muted-foreground">
                <BarChart2 class="h-4 w-4" />
                <span>{{ contributor.count }}</span>
              </div>
              
              <!-- Ratio badge for each row -->
              <div class="py-1 px-2 rounded-full bg-accent text-xs">
                {{ getVoteRatio(contributor) }} v/n
              </div>
              
              <ChevronRight class="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        
        <!-- Pagination controls -->
        <div v-if="showPagination" class="flex items-center justify-between mt-4">
          <p class="text-sm text-muted-foreground">
            Showing {{ currentRange }}
          </p>
          
          <div class="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              @click="prevPage" 
              :disabled="!canGoPrev" 
              class="transition-opacity"
              :class="{'opacity-50': !canGoPrev}"
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>
            
            <span class="text-sm font-medium">
              Page {{ currentPage }} of {{ totalPages }}
            </span>
            
            <Button 
              variant="outline" 
              size="icon" 
              @click="nextPage" 
              :disabled="!canGoNext"
              class="transition-opacity"
              :class="{'opacity-50': !canGoNext}"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add smooth entrance animation for the whole tab */
.votes-contributor-tab {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Add animation for badge hover effects */
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
</style>