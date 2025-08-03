<script setup lang="ts">
import { ref, watch, onMounted, computed, onUnmounted } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertCircle,
  RefreshCw
} from 'lucide-vue-next'
import HomeHeader from '@/features/bashhub/components/HomeHeader.vue'
import HomeNotaList from '@/features/bashhub/components/HomeNotaList.vue'

// Composables
import { useHomePreferences } from '@/features/bashhub/composables/useHomePreferences'
import { useNotaActions } from '@/features/nota/composables/useNotaActions'
import { toast } from 'vue-sonner'

// Store
const store = useNotaStore()

// Enhanced state management
const isLoading = ref(true)
const isRefreshing = ref(false)
const loadError = ref<string | null>(null)
const retryCount = ref(0)
const maxRetries = 3

// Composables
const {
  viewType,
  showFavorites,
  searchQuery,
  selectedTag,
  clearFilters
} = useHomePreferences()

const {
  createNewNota
} = useNotaActions()

const hasNotas = computed(() => store.rootItems.length > 0)

// Enhanced loading and error handling
const loadNotas = async (showToast = false) => {
  try {
    loadError.value = null
    if (showToast) {
      isRefreshing.value = true
    } else {
      isLoading.value = true
    }
    
    await store.loadNotas()
    retryCount.value = 0
    
    if (showToast) {
      toast('Notas refreshed successfully')
    }
  } catch (error) {
    console.error('Failed to load notas:', error)
    loadError.value = error instanceof Error ? error.message : 'Failed to load notas'
    
    if (retryCount.value < maxRetries) {
      retryCount.value++
      setTimeout(() => loadNotas(), 1000 * retryCount.value) // Exponential backoff
    } else {
      toast('Failed to load notas. Please try again later.')
    }
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

const handleRetry = () => {
  retryCount.value = 0
  loadNotas()
}

const handleRefresh = () => {
  loadNotas(true)
}

// Lifecycle
onMounted(() => {
  loadNotas()
})

// Watch for loading state
watch(
  () => store.rootItems,
  () => {
    if (isLoading.value) {
      isLoading.value = false
    }
  },
  { immediate: true }
)

// Methods

// Enhanced filter management
const handleClearFilters = () => {
  clearFilters()
  toast('Filters cleared')
}

// Performance optimization: Cleanup any listeners
onUnmounted(() => {
  // Cleanup any pending timeouts or intervals if needed
})
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

          <!-- Mobile: Full width below header, Desktop: Right Column with HomeNotaList -->
          <div class="lg:col-span-3 flex flex-col h-auto lg:h-full lg:min-h-0 w-full min-w-0">
            
            <!-- Error State -->
            <Alert v-if="loadError && !isLoading" variant="destructive" class="mb-4">
              <AlertCircle class="h-4 w-4" />
              <AlertDescription class="flex items-center justify-between w-full">
                <span>{{ loadError }}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  @click="handleRetry"
                  class="ml-4"
                >
                  <RefreshCw class="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>

            <!-- HomeNotaList -->
            <div class="flex flex-col h-auto lg:h-full w-full min-w-0">
              <HomeNotaList
                :is-loading="isLoading"
                :view-type="viewType"
                :show-favorites="showFavorites"
                :search-query="searchQuery"
                :selected-tag="selectedTag"
                :notas="store.rootItems"
                @create-nota="createNewNota"
                @update:selectedTag="selectedTag = $event"
                @update:viewType="viewType = $event"
                @update:searchQuery="searchQuery = $event"
                @update:showFavorites="showFavorites = $event"
                @clear-filters="handleClearFilters"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Base styles */
* {
  box-sizing: border-box;
  scroll-behavior: smooth;
}

body, html {
  overflow-x: hidden;
  width: 100%;
}

/* Scrollbar styling */
:deep(.overflow-y-auto)::-webkit-scrollbar,
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-track {
  background: hsl(var(--muted) / 0.1);
  border-radius: 3px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb,
.scrollbar-thumb-muted::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}

.scrollbar-track-background::-webkit-scrollbar-track {
  background: hsl(var(--background));
  border-radius: 3px;
}

/* Container and layout */
.container {
  width: 100%;
  max-width: 100%;
}

.grid {
  width: 100%;
  max-width: 100%;
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Width constraints */
.flex,
:deep(.card),
:deep(input),
:deep(select),
:deep(textarea) {
  max-width: 100%;
}

/* Desktop layout (1025px+) */
@media (min-width: 1025px) {
  main {
    height: 100% !important;
    overflow: hidden !important;
  }
  
  .container {
    height: 100% !important;
    overflow: hidden !important;
  }
  
  .grid {
    height: 100% !important;
    overflow: hidden !important;
  }
  
  .lg:h-full {
    height: 100% !important;
  }
  
  .lg:overflow-y-auto {
    overflow-y: auto !important;
  }
  
  .lg:overflow-hidden {
    overflow: hidden !important;
  }
}

/* Tablet layout (769px-1024px) */
@media (max-width: 1024px) {
  html, body {
    overflow-x: hidden;
    height: auto !important;
    -webkit-overflow-scrolling: touch;
  }
  
  main {
    overflow-y: auto !important;
    overflow-x: hidden !important;
    height: auto !important;
    min-height: 100vh !important;
  }
  
  .container {
    height: auto !important;
    overflow: visible !important;
    min-height: 100vh !important;
    width: 100%;
    max-width: 100vw;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  
  .grid {
    grid-template-columns: 1fr !important;
    gap: 1rem;
    height: auto !important;
    overflow: visible !important;
    min-height: 100vh !important;
  }
  
  .lg:col-span-2,
  .lg:col-span-3 {
    grid-column: span 1 !important;
  }
  
  .h-auto,
  .lg:h-full {
    height: auto !important;
  }
  
  .lg:overflow-hidden {
    overflow: visible !important;
  }
  
  .lg:overflow-y-auto {
    overflow-y: visible !important;
  }
}

/* Medium screens (640px-768px) */
@media (max-width: 768px) {
  .h-screen {
    height: auto !important;
    min-height: 100vh !important;
  }
  
  main {
    height: auto !important;
    min-height: calc(100vh - 80px);
    overflow-y: auto !important;
  }
  
  .container {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  
  .gap-4 {
    gap: 0.75rem;
  }
}

/* Small screens (475px-640px) */
@media (max-width: 640px) {
  .gap-3 {
    gap: 0.75rem;
  }
}

/* Extra small screens (375px-475px) */
@media (max-width: 475px) {
  .container {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  
  main {
    padding-bottom: 1.5rem;
  }
  
  .gap-4 {
    gap: 0.5rem;
  }
}

/* Very small screens (≤375px) */
@media (max-width: 375px) {
  .container {
    padding-left: 0.25rem;
    padding-right: 0.25rem;
  }
  
  .gap-3 {
    gap: 0.5rem;
  }
  
  h1 {
    font-size: 1.125rem !important;
  }
  
  :deep(.card-content),
  :deep(.card-header) {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
}

/* Large screens container adjustments */
@media (max-width: 1280px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* Landscape mobile */
@media (max-height: 500px) and (orientation: landscape) {
  header {
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
  }
  
  .py-3, .py-4 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
}

/* Accessibility and interaction */
:deep(.focus-visible) {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>








