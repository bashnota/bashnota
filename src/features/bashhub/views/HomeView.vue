<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/card'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs'
import { 
  Clock, 
  X, 
  Plus, 
  FolderPlus, 
  BarChart3, 
  Lightbulb, 
  Sparkles,
  Layers
} from 'lucide-vue-next'
import HomeHeader from '@/features/bashhub/components/HomeHeader.vue'
import HomeSearchBar from '@/features/bashhub/components/HomeSearchBar.vue'
import HomeTagFilter from '@/features/bashhub/components/HomeTagFilter.vue'
import HomeNotaList from '@/features/bashhub/components/HomeNotaList.vue'
import HomeAnalytics from '@/features/bashhub/components/HomeAnalytics.vue'
import HomeRecommendations from '@/features/bashhub/components/HomeRecommendations.vue'
import HomeQuickActions from '@/features/bashhub/components/HomeQuickActions.vue'

// Composables
import { useHomePreferences, type ActiveView } from '@/features/bashhub/composables/useHomePreferences'
import { useNotaFiltering } from '@/features/nota/composables/useNotaFiltering'
import { useNotaActions } from '@/features/nota/composables/useNotaActions'
import { getRelativeTime } from '@/utils/dateUtils'
import { toast } from '@/lib/utils'

// Store
const store = useNotaStore()

// State
const isLoading = ref(true)

// Composables
const {
  viewType,
  activeView,
  showFavorites,
  searchQuery,
  selectedTag,
  layoutPreferences,
  currentPage,
  clearFilters
} = useHomePreferences()

const {
  createNewNota,
  handleImport,
  handleExport
} = useNotaActions()

// Filtering
const filterOptions = computed(() => ({
  showFavorites: showFavorites.value,
  searchQuery: searchQuery.value,
  selectedTag: selectedTag.value
}))

const {
  filteredNotas,
  stats,
  hasActiveFilters,
  activeFiltersText
} = useNotaFiltering(
  computed(() => store.rootItems),
  filterOptions
)

// Lifecycle
onMounted(async () => {
  try {
    await store.loadNotas()
  } catch (error) {
    console.error('Failed to load notas:', error)
    toast('Failed to load notas')
  }
})

// Watch for loading state
watch(
  () => store.rootItems,
  () => {
    isLoading.value = false
  },
  { immediate: true }
)

// Computed properties
const lastUpdated = computed(() => {
  if (store.rootItems.length === 0) return null
  const latest = store.rootItems.reduce((latest, nota) => {
    const notaDate = nota.updatedAt instanceof Date ? nota.updatedAt : new Date(nota.updatedAt)
    const latestDate = latest instanceof Date ? latest : new Date(latest)
    return notaDate > latestDate ? notaDate : latest
  }, store.rootItems[0].updatedAt)
  
  return getRelativeTime(latest)
})

const emptyStateConfig = computed(() => {
  if (showFavorites.value) {
    return {
      title: 'No Favorite Notas',
      description: 'Star important notas to see them here',
      action: null
    }
  }
  
  if (searchQuery.value || selectedTag.value) {
    return {
      title: 'No Matching Notas',
      description: `No notas match your current filters. Try adjusting your search or creating a new nota.`,
      action: 'create'
    }
  }
  
  return {
    title: 'No Notas Yet',
    description: 'Create your first nota to get started',
    action: 'create'
  }
})

// Methods
const handlePageChange = (page: number) => {
  currentPage.value = page
}
</script>

<template>
  <div class="flex flex-col w-full h-screen lg:h-screen bg-background overflow-hidden lg:overflow-hidden">

    <!-- Main Content Area with proper overflow handling for desktop vs mobile -->
    <main class="flex-1 overflow-auto lg:overflow-hidden h-full w-full">
      <div class="container max-w-full px-3 sm:px-4 lg:px-6 h-full py-4 sm:py-6 lg:h-full lg:overflow-hidden">
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 h-full w-full max-w-full lg:h-full lg:overflow-hidden">
          <!-- Mobile: Full width, Desktop: Left Column with HomeHeader -->
          <div class="lg:col-span-2 flex flex-col h-auto lg:h-full lg:min-h-0 w-full min-w-0">
            <div class="flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:scrollbar-thin lg:scrollbar-thumb-muted lg:scrollbar-track-background w-full">
              <HomeHeader 
                @create-nota="createNewNota"
              />
            </div>
          </div>

          <!-- Mobile: Full width below header, Desktop: Right Column with dynamic content -->
          <div class="lg:col-span-3 flex flex-col h-auto lg:h-full lg:min-h-0 w-full min-w-0">
            
            <!-- View Controls Tabs -->
            <div class="shrink-0 mb-4">
              <Tabs :model-value="activeView" @update:model-value="(value: string | number) => activeView = String(value) as ActiveView" class="w-full">
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
            <!-- Notas View -->
            <div v-if="activeView === 'notas'" class="flex flex-col h-auto lg:h-full gap-4 w-full min-w-0">
              <!-- Search and Controls Bar with responsive spacing -->
              <div class="shrink-0 space-y-3 sm:space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-4 w-full">
                <div class="flex-1 min-w-0 w-full lg:w-auto">
                  <HomeSearchBar
                    v-model:search="searchQuery"
                    v-model:view-type="viewType"
                    v-model:show-favorites="showFavorites"
                    @create-nota="createNewNota"
                    class="w-full"
                  />
                </div>
                
                <div class="w-full sm:w-64 lg:w-64 shrink-0">
                  <HomeTagFilter 
                    v-model:selected-tag="selectedTag" 
                    :notas="store.rootItems"
                    class="h-10 w-full"
                  />
                </div>
                
                <Button
                  v-if="hasActiveFilters"
                  variant="ghost"
                  size="sm"
                  @click="clearFilters"
                  class="h-10 shrink-0 hover:bg-destructive-[.10] hover:text-destructive w-full sm:w-auto"
                  :title="`Clear active filters: ${activeFiltersText}`"
                >
                  Clear Filters
                  <X class="h-4 w-4 ml-2" />
                </Button>
              </div>

              <!-- Notas List Card with proper overflow -->
              <Card class="flex-1 flex flex-col min-h-[50vh] lg:min-h-0 lg:h-full lg:overflow-hidden">
                <CardHeader class="shrink-0 border-b bg-muted-[.30]">
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div class="min-w-0 flex-1">
                      <CardTitle class="flex items-center gap-2 text-base sm:text-lg">
                        <Clock class="h-4 w-4 sm:h-5 sm:w-5" />
                        {{ showFavorites ? 'Favorite' : 'Recent' }} Notas
                        <Badge variant="secondary" class="ml-2 flex items-center gap-1 text-xs">
                          <span v-if="stats.isFiltering && isLoading" class="animate-pulse">
                            ⋯
                          </span>
                          {{ stats.filtered }}
                        </Badge>
                      </CardTitle>
                      <CardDescription class="mt-1 text-xs sm:text-sm">
                        {{ showFavorites ? 'Your starred notas' : 'Your recently updated notas' }}
                        <span v-if="lastUpdated && !showFavorites" class="text-xs opacity-75 ml-2 hidden sm:inline">
                          • Last updated {{ lastUpdated }}
                        </span>
                      </CardDescription>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        @click="createNewNota"
                        title="Create a new nota"
                        class="hover:bg-primary-[.10] text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <Plus class="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span class="hidden xs:inline">New</span>
                        <span class="hidden sm:inline"> Nota</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        @click="() => handleImport()"
                        title="Import notas from JSON file"
                        class="hover:bg-blue-50 dark:hover:bg-blue-900-[.20] text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <FolderPlus class="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span class="hidden sm:inline">Import</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent class="flex-1 overflow-y-auto p-3 sm:p-6">
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
            <div v-else-if="activeView === 'insights'" class="flex flex-col h-auto lg:h-full lg:min-h-0">
              <Card class="flex-1 flex flex-col min-h-[60vh] lg:min-h-0 lg:h-full lg:overflow-hidden">
                <CardHeader class="shrink-0">
                  <CardTitle class="flex items-center gap-2 text-base sm:text-lg">
                    <Lightbulb class="h-4 w-4 sm:h-5 sm:w-5" />
                    Smart Insights & Recommendations
                  </CardTitle>
                  <CardDescription class="text-xs sm:text-sm">
                    AI-powered suggestions and productivity insights based on your nota patterns
                  </CardDescription>
                </CardHeader>
                <CardContent class="flex-1 overflow-y-auto p-3 sm:p-6">
                  <HomeRecommendations :notas="store.rootItems" />
                </CardContent>
              </Card>
            </div>

            <!-- Templates View -->
            <div v-else-if="activeView === 'templates'" class="flex flex-col h-auto lg:h-full lg:min-h-0">
              <Card class="flex-1 flex flex-col min-h-[60vh] lg:min-h-0 lg:h-full lg:overflow-hidden">
                <CardHeader class="shrink-0">
                  <CardTitle class="flex items-center gap-2 text-base sm:text-lg">
                    <Sparkles class="h-4 w-4 sm:h-5 sm:w-5" />
                    Professional Template Gallery
                  </CardTitle>
                  <CardDescription class="text-xs sm:text-sm">
                    Choose from comprehensive templates designed for productivity, documentation, and personal growth
                  </CardDescription>
                </CardHeader>
                <CardContent class="flex-1 overflow-y-auto p-3 sm:p-6">
                  <HomeQuickActions 
                    :notas="store.rootItems"
                    @create-nota="createNewNota"
                    @import-notas="() => handleImport()"
                    @export-notas="handleExport"
                  />
                </CardContent>
              </Card>
            </div>

            <!-- Analytics Dashboard -->
            <div v-else-if="activeView === 'workspace'" class="flex flex-col h-auto lg:h-full lg:min-h-0">
              <Card class="flex-1 flex flex-col min-h-[60vh] lg:min-h-0 lg:h-full lg:overflow-hidden">
                <CardHeader class="shrink-0">
                  <CardTitle class="flex items-center gap-2 text-base sm:text-lg">
                    <BarChart3 class="h-4 w-4 sm:h-5 sm:w-5" />
                    Analytics Dashboard
                  </CardTitle>
                  <CardDescription class="text-xs sm:text-sm">
                    Comprehensive analytics and productivity metrics for your nota workspace
                  </CardDescription>
                </CardHeader>
                <CardContent class="flex-1 overflow-y-auto p-3 sm:p-6">
                  <!-- Analytics Overview Section -->
                  <div>
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-base sm:text-lg font-semibold flex items-center gap-2">
                        <BarChart3 class="h-4 w-4 sm:h-5 sm:w-5" />
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
.scrollbar-thumb-muted-foreground-20::-webkit-scrollbar-thumb {
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

/* Desktop layout - no scrolling, fixed height */
@media (min-width: 1025px) {
  /* Ensure main container takes full height without scrolling */
  main {
    height: 100% !important;
    overflow: hidden !important;
  }
  
  /* Container should take full height */
  .container {
    height: 100% !important;
    overflow: hidden !important;
  }
  
  /* Grid should take full height */
  .grid {
    height: 100% !important;
    overflow: hidden !important;
  }
  
  /* Columns should take full height */
  .lg:h-full {
    height: 100% !important;
  }
  
  /* Only allow scrolling within specific content areas */
  .lg:overflow-y-auto {
    overflow-y: auto !important;
  }
  
  .lg:overflow-hidden {
    overflow: hidden !important;
  }
}

/* Mobile and Tablet layout - allow scrolling and natural height */
@media (max-width: 1024px) {
  /* Force scrollable layout on mobile/tablet */
  html, body {
    overflow-x: hidden;
    height: auto !important;
  }
  
  /* Allow main content to scroll on mobile */
  main {
    overflow-y: auto !important;
    overflow-x: hidden !important;
    height: auto !important;
    min-height: 100vh !important;
  }
  
  /* Allow container to grow naturally on mobile */
  .container {
    height: auto !important;
    overflow: visible !important;
    min-height: 100vh !important;
  }
  
  /* Single column layout with natural height */
  .grid {
    grid-template-columns: 1fr !important;
    gap: 1rem;
    height: auto !important;
    overflow: visible !important;
    min-height: 100vh !important;
  }
  
  /* Reset column spans */
  .lg:col-span-2,
  .lg:col-span-3 {
    grid-column: span 1 !important;
  }
  
  /* Allow natural height flow on mobile */
  .h-auto {
    height: auto !important;
  }
  
  /* Remove desktop height constraints on mobile */
  .lg:h-full {
    height: auto !important;
  }
  
  /* Remove desktop overflow constraints on mobile */
  .lg:overflow-hidden {
    overflow: visible !important;
  }
  
  .lg:overflow-y-auto {
    overflow-y: visible !important;
  }
  
  /* Ensure minimum heights work on mobile */
  .min-h-\[50vh\] {
    min-height: 50vh !important;
  }
  
  .min-h-\[60vh\] {
    min-height: 60vh !important;
  }
}

@media (max-width: 768px) {
  /* Ensure body can scroll */
  html, body {
    height: auto !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
  }
  
  /* Root container should allow scrolling */
  .h-screen {
    height: auto !important;
    min-height: 100vh !important;
  }
  
  /* Main container should be scrollable */
  main {
    overflow-y: auto !important;
    overflow-x: hidden !important;
    height: auto !important;
    min-height: 100vh !important;
  }
  
  /* Better container padding for tablets */
  .container {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    height: auto !important;
    overflow: visible !important;
  }
  
  /* Ensure cards have proper spacing */
  .gap-4 {
    gap: 0.75rem;
  }
}

/* Custom breakpoint for extra small screens (tabs) */
@media (min-width: 475px) {
  .xs:inline {
    display: inline !important;
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

/* Mobile-first responsive improvements */
@media (max-width: 640px) {
  /* Better container padding for small screens */
  .container {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  
  /* Allow natural content height flow on mobile */
  main {
    height: auto !important;
    min-height: calc(100vh - 80px); /* Account for header */
    overflow-y: auto !important;
  }
  
  /* Ensure header items don't wrap awkwardly */
  header .flex {
    min-height: fit-content;
  }
  
  /* Tab improvements for mobile */
  [role="tablist"] {
    min-width: max-content;
  }
  
  /* Touch targets for mobile */
  [role="tab"] {
    min-height: 44px;
    touch-action: manipulation;
  }
  
  /* Better spacing for mobile cards */
  .gap-3 {
    gap: 0.75rem;
  }
  
  /* Ensure minimum content visibility */
  .min-h-\[50vh\] {
    min-height: 60vh !important;
  }
}

/* Extra small screens - very compact layout */
@media (max-width: 475px) {
  .container {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    width: 100vw;
    max-width: 100vw;
  }
  
  /* More compact header */
  header {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    width: 100%;
  }
  
  /* Ensure tabs don't get too cramped */
  [role="tab"] {
    min-width: 40px;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  
  /* Better mobile content flow */
  main {
    padding-bottom: 1.5rem;
    width: 100%;
  }
  
  /* Reduce gaps for very small screens */
  .gap-4 {
    gap: 0.5rem;
  }
  
  /* Ensure content is always scrollable */
  .min-h-\[50vh\] {
    min-height: 70vh !important;
  }
  
  /* Hide less important UI elements on very small screens */
  .text-muted-foreground.hidden {
    display: none !important;
  }
  
  /* Tab container full width */
  [role="tablist"] {
    width: 100%;
    max-width: calc(100vw - 2rem);
  }
}

/* Very small screens - optimization for phones in portrait */
@media (max-width: 375px) {
  /* Further compact the layout */
  .gap-3 {
    gap: 0.5rem;
  }
  
  .container {
    padding-left: 0.25rem;
    padding-right: 0.25rem;
    width: 100vw;
    max-width: 100vw;
  }
  
  /* Smaller text on very small screens */
  h1 {
    font-size: 1.125rem !important;
  }
  
  /* Compact tabs even more */
  [role="tab"] {
    min-width: 36px;
    padding: 0.375rem;
  }
  
  /* Ensure minimum scrollable content */
  .min-h-\[50vh\] {
    min-height: 75vh !important;
  }
  
  /* Force width constraints on all elements */
  * {
    max-width: 100vw;
  }
  
  /* Tab container width fix */
  [role="tablist"] {
    width: 100%;
    max-width: calc(100vw - 1rem);
  }
  
  /* Card content width fixes */
  :deep(.card-content), :deep(.card-header) {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
}

/* Landscape mode on mobile phones */
@media (max-height: 500px) and (orientation: landscape) {
  header {
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
  }
  
  .py-3, .py-4 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
  
  /* Reduce content minimum heights in landscape */
  .min-h-\[50vh\] {
    min-height: 40vh !important;
  }
  
  .min-h-\[60vh\] {
    min-height: 45vh !important;
  }
}

/* Ensure proper mobile scrolling behavior */
@media (max-width: 1024px) {
  /* Force proper scrolling on mobile */
  body {
    overflow-x: hidden;
  }
  
  /* Better touch scrolling */
  * {
    -webkit-overflow-scrolling: touch;
  }
  
  /* Prevent horizontal overflow */
  .container {
    width: 100%;
    max-width: 100vw;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}

/* Base width constraints for all screen sizes */
* {
  box-sizing: border-box;
}

body, html {
  overflow-x: hidden;
  width: 100%;
}

/* Container and layout width fixes */
.container {
  width: 100%;
  max-width: 100%;
}

/* Grid and flex width constraints */
.grid {
  width: 100%;
  max-width: 100%;
}

.flex {
  max-width: 100%;
}

/* Card width constraints */
:deep(.card) {
  width: 100%;
  max-width: 100%;
}

/* Input and form element width constraints */
:deep(input), :deep(select), :deep(textarea) {
  max-width: 100%;
}

/* Button width constraints for mobile */
@media (max-width: 640px) {
  :deep(.btn), :deep(button) {
    max-width: 100%;
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

/* Tab improvements for better responsive behavior */
:deep([data-state="active"]) {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}

/* Ensure tabs don't overflow on small screens */
@media (max-width: 475px) {
  .container {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}
</style>








