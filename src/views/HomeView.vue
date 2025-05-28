<script setup lang="ts">
import { ref, watch, onMounted, computed, onUnmounted } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  X, 
  Plus, 
  FolderPlus, 
  BarChart3, 
  Lightbulb, 
  Zap,
  Layers,
  TrendingUp,
  Sparkles
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import HomeHeader from '@/components/home/HomeHeader.vue'
import HomeSearchBar from '@/components/home/HomeSearchBar.vue'
import HomeTagFilter from '@/components/home/HomeTagFilter.vue'
import HomeNotaList from '@/components/home/HomeNotaList.vue'
import HomeAnalytics from '@/components/home/HomeAnalytics.vue'
import HomeRecommendations from '@/components/home/HomeRecommendations.vue'
import HomeQuickActions from '@/components/home/HomeQuickActions.vue'
import { toast } from '@/lib/utils'

// Types
interface LayoutPreferences {
  showAnalytics: boolean
  showRecommendations: boolean
  compactMode: boolean
  sidebarWidth: 'narrow' | 'normal' | 'wide'
}

type ViewType = 'grid' | 'list' | 'compact'
type ActiveView = 'notas' | 'insights' | 'templates' | 'workspace'

// Composables
const router = useRouter()
const store = useNotaStore()

// State
const isLoading = ref(true)
const viewType = ref<ViewType>('grid')
const showFavorites = ref(false)
const searchQuery = ref('')
const selectedTag = ref('')
const currentPage = ref(1)

// Enhanced view state
const activeView = ref<ActiveView>('notas')

// Layout preferences with proper typing
const layoutPreferences = ref<LayoutPreferences>({
  showAnalytics: true,
  showRecommendations: true,
  compactMode: false,
  sidebarWidth: 'normal'
})

// Constants
const STORAGE_KEYS = {
  VIEW_TYPE: 'home-view-type',
  LAYOUT_PREFERENCES: 'home-layout-preferences'
} as const

// Lifecycle
onMounted(async () => {
  try {
    await store.loadNotas()
    loadPreferences()
  } catch (error) {
    console.error('Failed to load notas:', error)
    toast('Failed to load notas')
  }
})

onUnmounted(() => {
  // Cleanup if needed
})

// Preference management
const loadPreferences = () => {
  try {
    const savedView = localStorage.getItem(STORAGE_KEYS.VIEW_TYPE)
    if (savedView && ['grid', 'list', 'compact'].includes(savedView)) {
      viewType.value = savedView as ViewType
    }
    
    const savedLayout = localStorage.getItem(STORAGE_KEYS.LAYOUT_PREFERENCES)
    if (savedLayout) {
      const parsed = JSON.parse(savedLayout)
      layoutPreferences.value = { ...layoutPreferences.value, ...parsed }
    }
  } catch (error) {
    console.error('Failed to load preferences:', error)
  }
}

const savePreference = (key: string, value: any) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch (error) {
    console.error('Failed to save preference:', error)
  }
}

// Watchers for preference persistence
watch(viewType, (newView) => {
  savePreference(STORAGE_KEYS.VIEW_TYPE, newView)
})

watch(layoutPreferences, (newPrefs) => {
  savePreference(STORAGE_KEYS.LAYOUT_PREFERENCES, newPrefs)
}, { deep: true })

watch(
  () => store.rootItems,
  () => {
    isLoading.value = false
  },
  { immediate: true }
)

// Computed properties
const filteredNotas = computed(() => {
  let notas = store.rootItems
  
  if (showFavorites.value) {
    notas = notas.filter(nota => nota.favorite)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim()
    notas = notas.filter(nota => 
      nota.title.toLowerCase().includes(query) ||
      nota.content?.toLowerCase().includes(query) ||
      nota.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }
  
  if (selectedTag.value) {
    notas = notas.filter(nota => nota.tags?.includes(selectedTag.value))
  }
  
  return notas
})

const quickStats = computed(() => {
  return {
    total: store.rootItems.length,
    filtered: filteredNotas.value.length
  }
})

const hasActiveFilters = computed(() => 
  showFavorites.value || searchQuery.value || selectedTag.value
)

// Methods
const clearFilters = () => {
  showFavorites.value = false
  searchQuery.value = ''
  selectedTag.value = ''
}

const createNewNota = async () => {
  try {
    const nota = await store.createItem('Untitled Nota')
    router.push(`/nota/${nota.id}`)
  } catch (error) {
    console.error('Failed to create nota:', error)
    toast('Failed to create nota')
  }
}

const handleImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) {
      try {
        const success = await store.importNotas(file)
        if (success) {
          await store.loadNotas()
          toast('Notas imported successfully!')
        }
      } catch (error) {
        console.error('Import failed:', error)
        toast('Failed to import notas')
      }
    }
  }
  input.click()
}

const handleExport = async () => {
  try {
    await store.exportAllNotas()
    toast('Notas exported successfully!')
  } catch (error) {
    console.error('Export failed:', error)
    toast('Failed to export notas')
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}
</script>

<template>
  <div class="flex flex-col max-h-screen bg-background">
    <!-- Enhanced Header with consistent spacing -->
    <header class="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-primary/10 rounded-lg">
                <Sparkles class="h-5 w-5 text-primary" />
              </div>
              <h1 class="text-2xl font-bold">Dashboard</h1>
            </div>
            
            <!-- Quick Stats with consistent styling -->
            <div class="hidden lg:flex items-center gap-3">
              <Badge variant="secondary" class="flex items-center gap-2 px-3 py-1">
                <BarChart3 class="h-3 w-3" />
                <span class="font-medium">{{ quickStats.total }}</span>
                <span class="text-muted-foreground">Total</span>
              </Badge>
            </div>
          </div>
          
          <!-- View Controls with consistent styling -->
          <div class="flex items-center gap-3">
            <Tabs v-model="activeView" class="w-auto">
              <TabsList class="grid w-full grid-cols-4 h-10">
                <TabsTrigger value="notas" class="text-sm font-medium">
                  <Clock class="h-4 w-4 mr-2" />
                  Notas
                </TabsTrigger>
                <TabsTrigger value="insights" class="text-sm font-medium">
                  <Lightbulb class="h-4 w-4 mr-2" />
                  Insights
                </TabsTrigger>
                <TabsTrigger value="templates" class="text-sm font-medium">
                  <Sparkles class="h-4 w-4 mr-2" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="workspace" class="text-sm font-medium">
                  <Layers class="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content Area with proper overflow handling -->
    <main class="flex-1 overflow-hidden min-h-0">
      <div class="container h-full py-6">
        <div class="grid grid-cols-1 xl:grid-cols-5 gap-6 h-full">
          <!-- Left Column: HomeHeader with scrollable container -->
          <div class="xl:col-span-2 flex flex-col min-h-0">
            <div class="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
              <HomeHeader @create-nota="createNewNota" />
            </div>
          </div>

          <!-- Right Column: Dynamic Content with proper overflow -->
          <div class="xl:col-span-3 flex flex-col h-full min-h-0">
            <!-- Notas View -->
            <div v-if="activeView === 'notas'" class="flex flex-col h-full gap-4">
              <!-- Search and Controls Bar with consistent spacing -->
              <div class="shrink-0 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
                <div class="flex-1 min-w-0">
                  <HomeSearchBar
                    v-model:search="searchQuery"
                    v-model:view-type="viewType"
                    v-model:show-favorites="showFavorites"
                    @create-nota="createNewNota"
                    class="w-full"
                  />
                </div>
                
                <div class="w-full sm:w-64 shrink-0">
                  <HomeTagFilter 
                    v-model:selected-tag="selectedTag" 
                    :notas="store.rootItems"
                    class="h-10"
                  />
                </div>
                
                <Button
                  v-if="hasActiveFilters"
                  variant="ghost"
                  size="sm"
                  @click="clearFilters"
                  class="h-10 shrink-0"
                >
                  Clear Filters
                  <X class="h-4 w-4 ml-2" />
                </Button>
              </div>

              <!-- Notas List Card with proper overflow -->
              <Card class="flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardHeader class="shrink-0 border-b bg-muted/30">
                  <div class="flex items-center justify-between">
                    <div class="min-w-0 flex-1">
                      <CardTitle class="flex items-center gap-2 text-lg">
                        <Clock class="h-5 w-5" />
                        {{ showFavorites ? 'Favorite' : 'Recent' }} Notas
                        <Badge variant="secondary" class="ml-2">{{ quickStats.filtered }}</Badge>
                      </CardTitle>
                      <CardDescription class="mt-1">
                        {{ showFavorites ? 'Your starred notas' : 'Your recently updated notas' }}
                      </CardDescription>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" @click="createNewNota">
                        <Plus class="h-4 w-4 mr-2" />
                        New Nota
                      </Button>
                      <Button variant="outline" size="sm" @click="handleImport">
                        <FolderPlus class="h-4 w-4 mr-2" />
                        Import
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent class="flex-1 overflow-y-auto p-6">
                  <HomeNotaList
                    :is-loading="isLoading"
                    :view-type="viewType"
                    :show-favorites="showFavorites"
                    :search-query="searchQuery"
                    :selected-tag="selectedTag"
                    :notas="filteredNotas"
                    :current-page="currentPage"
                    @create-nota="createNewNota"
                    @update:selectedTag="selectedTag = $event"
                    @update:page="handlePageChange"
                  />
                </CardContent>
              </Card>
            </div>

            <!-- Analytics View with proper overflow -->
            <div v-else-if="activeView === 'insights'" class="flex flex-col h-full min-h-0">
              <Card class="flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardHeader class="shrink-0">
                  <CardTitle class="flex items-center gap-2 text-lg">
                    <Lightbulb class="h-5 w-5" />
                    Smart Insights & Recommendations
                  </CardTitle>
                  <CardDescription>
                    AI-powered suggestions and productivity insights based on your nota patterns
                  </CardDescription>
                </CardHeader>
                <CardContent class="flex-1 overflow-y-auto p-6">
                  <HomeRecommendations :notas="store.rootItems" />
                </CardContent>
              </Card>
            </div>

            <!-- Templates View -->
            <div v-else-if="activeView === 'templates'" class="flex flex-col h-full min-h-0">
              <Card class="flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardHeader class="shrink-0">
                  <CardTitle class="flex items-center gap-2 text-lg">
                    <Sparkles class="h-5 w-5" />
                    Professional Template Gallery
                  </CardTitle>
                  <CardDescription>
                    Choose from comprehensive templates designed for productivity, documentation, and personal growth
                  </CardDescription>
                </CardHeader>
                <CardContent class="flex-1 overflow-y-auto p-6">
                  <HomeQuickActions 
                    :notas="store.rootItems"
                    @create-nota="createNewNota"
                    @import-notas="handleImport"
                    @export-notas="handleExport"
                  />
                </CardContent>
              </Card>
            </div>

            <!-- Analytics Dashboard (formerly Workspace) -->
            <div v-else-if="activeView === 'workspace'" class="flex flex-col h-full min-h-0">
              <Card class="flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardHeader class="shrink-0">
                  <CardTitle class="flex items-center gap-2 text-lg">
                    <BarChart3 class="h-5 w-5" />
                    Analytics Dashboard
                  </CardTitle>
                  <CardDescription>
                    Comprehensive analytics and productivity metrics for your nota workspace
                  </CardDescription>
                </CardHeader>
                <CardContent class="flex-1 overflow-y-auto p-6">
                  <!-- Analytics Overview Section -->
                  <div>
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 class="h-5 w-5" />
                        Productivity Analytics
                      </h3>
                      <Badge variant="outline" class="text-xs">
                        Real-time Data
                      </Badge>
                    </div>
                    <HomeAnalytics :notas="store.rootItems" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Consistent scrollbar styling across all components */
:deep(.overflow-y-auto)::-webkit-scrollbar {
  width: 6px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-track {
  background: hsl(var(--muted) / 0.1);
  border-radius: 3px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}

/* Custom scrollbar for the main HomeHeader container */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thumb-muted::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

.scrollbar-track-background::-webkit-scrollbar-track {
  background: hsl(var(--background));
  border-radius: 3px;
}

/* Internal scrollbar styles for HomeHeader components */
.scrollbar-thumb-muted-foreground\/20::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.2);
  border-radius: 3px;
}

.scrollbar-track-transparent::-webkit-scrollbar-track {
  background: transparent;
}

/* Smooth scrolling behavior */
* {
  scroll-behavior: smooth;
}

/* Smooth transitions for layout changes */
.grid {
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Responsive adjustments */
@media (max-width: 1280px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr !important;
    gap: 1rem;
  }
  
  .xl\:col-span-2,
  .xl\:col-span-3 {
    grid-column: span 1 !important;
  }
}

/* Enhanced focus states for accessibility */
:deep(.focus-visible) {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Animation for view transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
