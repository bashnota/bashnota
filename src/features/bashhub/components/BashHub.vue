<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  FileText, 
  TrendingUp, 
  Heart, 
  Search,
  LayoutGrid,
  List,
} from 'lucide-vue-next'
import { useBashhubData } from '@/features/bashhub/composables/useBashhubData'
import { useAuthStore } from '@/features/auth/stores/auth'
import NotaTab from './bashhub/NotaTab.vue'
import ContributorTab from './bashhub/ContributorTab.vue'
import VotesContributorTab from './bashhub/VotesContributorTab.vue'
import type { PublishedNota } from '@/features/nota/types/nota'
import { logger } from '@/services/logger'
import { toast } from 'vue-sonner'
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore'
import { firestore } from '@/services/firebase'

// Define tab types for type safety
type TabType = 'latest' | 'popular' | 'most-voted' | 'top-contributors' | 'top-voted-contributors';
// Define view types
type ViewType = 'grid' | 'list';

// State
const activeTab = ref<TabType>('latest')
const viewMode = ref<ViewType>('list') // Default to list view
const searchQuery = ref('')
const router = useRouter()
const authStore = useAuthStore()

// Data fetching using our composable
const { 
  items, 
  isLoading, 
  error, 
  currentPage, 
  hasMoreItems,
  loadData,
  nextPage,
  prevPage,
  resetPagination
} = useBashhubData({ pageSize: 10 })

// Filter items based on active tab type
const publishedNotas = computed(() => {
  if (['top-contributors', 'top-voted-contributors'].includes(activeTab.value)) return []
  return items.value as PublishedNota[]
})

const contributors = computed(() => {
  if (activeTab.value !== 'top-contributors' && activeTab.value !== 'top-voted-contributors') return []
  return items.value as Array<{ 
    uid: string; 
    name: string; 
    tag?: string; 
    count: number;
    totalVotes?: number;
  }>
})

// Tab configuration for better organization
const tabConfig = {
  'latest': {
    icon: FileText,
    title: 'Latest Notas',
    emptyTitle: 'No Notas Found',
    emptyDescription: 'Be the first to publish content in the community!'
  },
  'popular': {
    icon: TrendingUp,
    title: 'Popular Notas',
    emptyTitle: 'No Popular Notas Found',
    emptyDescription: 'Check back later for popular content!'
  },
  'most-voted': {
    icon: Heart,
    title: 'Most Voted Notas',
    emptyTitle: 'No Highly Voted Notas Found',
    emptyDescription: 'Be the first to vote on community content!'
  }
};

// Load initial data
onMounted(async () => {
  await loadData(activeTab.value)
})

// Watch for tab changes to reload data
watch(activeTab, async (newTabValue) => {
  resetPagination()
  await loadData(newTabValue)
})

// Handle search
const handleSearch = async () => {
  if (!searchQuery.value.trim()) return
  resetPagination()
  await loadData(activeTab.value)
  // Note: In a real implementation, we would add search functionality to the Firestore queries
}

// Check if search is empty
const isSearchEmpty = computed(() => !searchQuery.value.trim())

// Utility functions
// Get user tag from user ID
const getUserTagFromId = async (userId: string): Promise<string | null> => {
  try {
    // Try the userTags collection first, which has public read access
    // Instead of querying the users collection directly (which has restricted access),
    // we'll query the userTags collection to find tags where uid matches our userId
    const userTagsRef = collection(firestore, 'userTags')
    const q = query(userTagsRef, where('uid', '==', userId), limit(1))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      // The document ID is the user tag
      return querySnapshot.docs[0].id
    }
    
    // If no tag is found, return null
    return null
  } catch (err) {
    logger.error('Error fetching user tag from ID:', err)
    
    // Additional logging to help diagnose the issue
    if (err instanceof Error) {
      logger.error('Error details:', {
        message: err.message,
        code: (err as any).code,
        name: err.name
      })
    }
    
    // Return null on error
    return null
  }
}

// View nota details
const viewNota = async (nota: PublishedNota) => {
  if (!nota.authorId) {
    logger.error('Cannot view nota: No author ID available')
    return
  }

  try {
    // Try to get the author's tag from their ID - only proceed if tag is available
    const authorTag = await getUserTagFromId(nota.authorId)
    
    if (authorTag) {
      // Only navigate if we found a tag
      router.push(`/@${authorTag}/${nota.id}`)
    } else {
      // If no tag is found, log the error but don't navigate
      logger.error(`Cannot view nota: No user tag found for user ID ${nota.authorId}`)
      toast('Unable to view this nota', { description: 'User tag required' })
    }
  } catch (error) {
    // Log the error but don't navigate anywhere
    logger.error('Error resolving author tag:', error)
    toast('Unable to view this nota', { description: 'Error loading user information' })
  }
}

// Clone a nota
const cloneNota = async (nota: PublishedNota, event: Event) => {
  event.stopPropagation()
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  try {
    // Import the nota store to access cloning functionality
    const notaStore = await import('@/features/nota/stores/nota').then(m => m.useNotaStore())
    
    // Clone the nota using the existing functionality
    const clonedNota = await notaStore.clonePublishedNota(nota.id)
    
    if (clonedNota) {
      // Show success message
      toast(`"${nota.title}" has been added to your notas`, { description: 'Nota cloned successfully' })
      
      // Navigate to the cloned nota
      router.push(`/nota/${clonedNota.id}`)
    }
  } catch (err) {
    logger.error('Error cloning nota:', err)
    toast('Please try again later', { description: 'Failed to clone nota' })
  }
}

// Toggle view mode (grid/list)
const toggleViewMode = (mode: ViewType) => {
  viewMode.value = mode
}
</script>

<template>
  <div class="container mx-auto py-6 max-w-6xl">
    <header class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight mb-2">BashHub</h1>
      <p class="text-muted-foreground">Discover and explore notas from the community</p>
    </header>

    <!-- Search -->
    <div class="flex mb-6 gap-2">
      <Input 
        v-model="searchQuery" 
        placeholder="Search notas..." 
        class="max-w-md"
        @keyup.enter="handleSearch"
      />
      <Button @click="handleSearch" :disabled="isSearchEmpty">
        <Search class="h-4 w-4 mr-2" />
        Search
      </Button>
      
      <!-- View Toggle Buttons (when not on contributors tab) -->
      <div v-if="!['top-contributors', 'top-voted-contributors'].includes(activeTab)" class="ml-auto flex gap-1">
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

    <!-- Tabs -->
    <Tabs v-model="activeTab" class="w-full mb-6">
      <TabsList class="grid grid-cols-5 w-full max-w-md">
        <TabsTrigger value="latest">Latest</TabsTrigger>
        <TabsTrigger value="popular">Popular</TabsTrigger>
        <TabsTrigger value="most-voted">Most Voted</TabsTrigger>
        <TabsTrigger value="top-contributors">Contributors</TabsTrigger>
        <TabsTrigger value="top-voted-contributors">Voted Users</TabsTrigger>
      </TabsList>

      <!-- Latest Notas Tab -->
      <TabsContent value="latest">
        <NotaTab 
          :is-active="activeTab === 'latest'"
          type="latest"
          :title="tabConfig.latest.title"
          :empty-icon="tabConfig.latest.icon"
          :empty-title="tabConfig.latest.emptyTitle"
          :empty-description="tabConfig.latest.emptyDescription"
          :items="publishedNotas"
          :is-loading="isLoading"
          :error="error"
          :current-page="currentPage"
          :has-more-items="hasMoreItems"
          :view-mode="viewMode"
          @prev="prevPage"
          @next="nextPage"
          @view-nota="viewNota"
          @clone-nota="cloneNota"
        />
      </TabsContent>

      <!-- Popular Notas Tab -->
      <TabsContent value="popular">
        <NotaTab 
          :is-active="activeTab === 'popular'"
          type="popular"
          :title="tabConfig.popular.title"
          :empty-icon="tabConfig.popular.icon"
          :empty-title="tabConfig.popular.emptyTitle"
          :empty-description="tabConfig.popular.emptyDescription"
          :items="publishedNotas"
          :is-loading="isLoading"
          :error="error"
          :current-page="currentPage"
          :has-more-items="hasMoreItems"
          :view-mode="viewMode"
          @prev="prevPage"
          @next="nextPage"
          @view-nota="viewNota"
          @clone-nota="cloneNota"
        />
      </TabsContent>

      <!-- Most Voted Notas Tab -->
      <TabsContent value="most-voted">
        <NotaTab 
          :is-active="activeTab === 'most-voted'"
          type="most-voted"
          :title="tabConfig['most-voted'].title"
          :empty-icon="tabConfig['most-voted'].icon"
          :empty-title="tabConfig['most-voted'].emptyTitle"
          :empty-description="tabConfig['most-voted'].emptyDescription"
          :items="publishedNotas"
          :is-loading="isLoading"
          :error="error"
          :current-page="currentPage"
          :has-more-items="hasMoreItems"
          :view-mode="viewMode"
          @prev="prevPage"
          @next="nextPage"
          @view-nota="viewNota"
          @clone-nota="cloneNota"
        />
      </TabsContent>

      <!-- Top Contributors Tab -->
      <TabsContent value="top-contributors">
        <ContributorTab 
          :is-active="activeTab === 'top-contributors'"
          title="Top Contributors"
          :contributors="contributors"
          :is-loading="isLoading"
          :error="error"
        />
      </TabsContent>

      <!-- Top Voted Contributors Tab -->
      <TabsContent value="top-voted-contributors">
        <VotesContributorTab 
          :is-active="activeTab === 'top-voted-contributors'"
          title="Most Voted Users"
          :contributors="contributors"
          :is-loading="isLoading"
          :error="error"
        />
      </TabsContent>
    </Tabs>
  </div>
</template>








