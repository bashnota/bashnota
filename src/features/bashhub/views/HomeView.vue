<script setup lang="ts">
import { ref, watch, onMounted, computed, onUnmounted } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
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
import { useFilesystemNotas } from '@/features/bashhub/composables/useFilesystemNotas'
import { toast } from '@/services/toast'

// Store
const store = useNotaStore()

// Enhanced state management
const isLoading = ref(true)
const isRefreshing = ref(false)
const loadError = ref<string | null>(null)

// Composables
const {
  showFavorites,
  searchQuery,
  selectedTag,
  clearFilters
} = useHomePreferences()

const {
  createNewNota
} = useNotaActions()

// Filesystem notas
const {
  filesystemNotas,
  isLoadingFilesystem,
  hasDirectoryAccess,
  directoryName,
  isFilesystemMode,
  checkDirectoryAccess,
  loadFilesystemNotas,
  selectDirectory,
  getFilesystemOnlyNotas
} = useFilesystemNotas()

// Combined notas from database and filesystem
const allNotas = computed(() => {
  if (!isFilesystemMode.value) {
    return store.rootItems
  }
  
  // In filesystem mode, combine database notas with filesystem-only notas
  const filesystemOnlyNotas = getFilesystemOnlyNotas(store.rootItems)
  return [...store.rootItems, ...filesystemOnlyNotas]
})

// Enhanced loading and error handling
const loadNotas = async (showToast = false) => {
  try {
    if (showToast) {
      isRefreshing.value = true
    } else {
      isLoading.value = true
    }
    
    await store.loadNotas()
    
    // Also load filesystem notas if in filesystem mode
    if (isFilesystemMode.value) {
      await checkDirectoryAccess()
      await loadFilesystemNotas()
    }

    // A previous error remains visible until a complete replacement read has
    // succeeded, so a failed refresh cannot masquerade as an empty library.
    loadError.value = null
    
    if (showToast) {
      toast('Notas refreshed successfully')
    }
  } catch (error) {
    console.error('Failed to load notas:', error)
    loadError.value = error instanceof Error ? error.message : 'Failed to load notas'
    toast('Failed to load notas. Use retry to try again.')
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

const handleRetry = () => {
  void loadNotas()
}

const handleSelectDirectory = async () => {
  const success = await selectDirectory()
  if (success) {
    // Refresh to show new notas
    await loadNotas(true)
  }
}

// Lifecycle
onMounted(() => {
  void loadNotas()
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
  <div class="flex h-screen w-full flex-col overflow-hidden bg-background">
    <!-- Main Content Area with proper overflow handling for desktop vs mobile -->
    <main class="h-full w-full flex-1 overflow-auto md:overflow-hidden">
      <div class="container h-full max-w-full px-3 py-4 sm:px-4 sm:py-6 md:overflow-hidden lg:px-6">
        <div class="workspace-grid grid h-full w-full max-w-full grid-cols-1 gap-4 sm:gap-5 md:grid-cols-[14.5rem_minmax(0,1fr)] md:overflow-hidden lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
          <!-- Mobile: Full width, Desktop: Left Column with HomeHeader -->
          <div class="flex h-auto min-w-0 flex-col md:h-full md:min-h-0">
            <div class="w-full flex-1 md:overflow-x-hidden md:overflow-y-auto md:scrollbar-thin md:scrollbar-track-background md:scrollbar-thumb-muted">
              <HomeHeader 
                @create-nota="createNewNota"
                @select-directory="handleSelectDirectory"
                :is-filesystem-mode="isFilesystemMode"
                :has-directory-access="hasDirectoryAccess"
                :directory-name="directoryName"
              />
            </div>
          </div>

          <!-- Mobile: Full width below header, Desktop: Right Column with HomeNotaList -->
          <div class="flex h-auto min-w-0 flex-col md:h-full md:min-h-0">
            
            <!-- Error State -->
            <Alert v-if="loadError" variant="destructive" class="mb-4" aria-live="assertive">
              <AlertCircle class="h-4 w-4" />
              <AlertDescription class="flex items-center justify-between w-full">
                <span>Unable to load your nota library: {{ loadError }}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  @click="handleRetry"
                  :disabled="isLoading || isRefreshing"
                  aria-label="Retry loading nota library"
                  class="ml-4"
                >
                  <RefreshCw class="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>

            <!-- HomeNotaList -->
            <div class="flex h-auto w-full min-w-0 flex-col md:h-full">
              <HomeNotaList
                :is-loading="isLoading || isLoadingFilesystem"
                :show-favorites="showFavorites"
                :search-query="searchQuery"
                :selected-tag="selectedTag"
                :notas="allNotas"
                :filesystem-notas="filesystemNotas"
                :is-filesystem-mode="isFilesystemMode"
                @update:selectedTag="selectedTag = $event"
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

/* Treat compact laptops as workspaces too. The legacy tablet rules above keep
   touch devices stacked, while this restores the two-pane desktop hierarchy. */
@media (min-width: 960px) and (max-width: 1024px) {
  main,
  .container,
  .workspace-grid {
    height: 100% !important;
    overflow: hidden !important;
    min-height: 0 !important;
  }

  .workspace-grid {
    grid-template-columns: 15rem minmax(0, 1fr) !important;
  }

  .workspace-grid > div {
    height: 100% !important;
    min-height: 0 !important;
  }
}
</style>
