<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useAuthStore } from '@/features/auth/stores/auth'
import { onKeyStroke } from '@vueuse/core'
import DarkModeToggle from '@/features/nota/components/DarkModeToggle.vue'
import {
  FileText,
  Settings,
  Plus,
  Search,
  Settings2
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import NotaTree from '@/features/nota/components/NotaTree.vue'
import { RouterLink } from 'vue-router'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { logger } from '@/services/logger'

// Import our new modular components
import SidebarSearch from '@/features/nota/components/SidebarSearch.vue'
import SidebarViewSelector from '@/features/nota/components/SidebarViewSelector.vue'
import SidebarNewNotaButton from '@/features/nota/components/SidebarNewNotaButton.vue'
import SidebarPagination from '@/features/nota/components/SidebarPagination.vue'
import SidebarAuthStatus from '@/features/nota/components/SidebarAuthStatus.vue'
import NewNotaModal from '@/features/nota/components/NewNotaModal.vue'
import { useQuickNotaCreation } from '@/features/nota/composables/useQuickNotaCreation'
import { generateRandomTitle } from '@/utils/randomTitleGenerator'

const router = useRouter()
const notaStore = useNotaStore()
const authStore = useAuthStore()
const { createQuickNota } = useQuickNotaCreation()
const newNotaTitle = ref('')
const searchQuery = ref('')
const showNewNotaInput = ref<boolean>(false)
const expandedItems = ref<Set<string>>(new Set())
const showShortcutsDialog = ref(false)
const activeView = ref<'all' | 'favorites' | 'recent'>('all')
const showSearch = ref(false)
const debouncedSearchQuery = ref('')
const showNewNotaModal = ref(false)

// Responsive state
const isMobile = ref(false)

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(15)

// Responsive breakpoint check
const updateScreenSize = () => {
  isMobile.value = window.innerWidth < 768
}

// Load last used view from localStorage
onMounted(async () => {
  await notaStore.loadNotas()
  const savedView = localStorage.getItem('sidebar-view')
  if (savedView) {
    activeView.value = savedView as 'all' | 'favorites' | 'recent'
  }
  
  // Set up responsive design
  updateScreenSize()
  window.addEventListener('resize', updateScreenSize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScreenSize)
})

// Debounce search input for better performance
let searchTimeout: NodeJS.Timeout
watch(searchQuery, (newQuery) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearchQuery.value = newQuery
  }, 300)
})

// Reset pagination when view or search changes
watch([activeView, debouncedSearchQuery], () => {
  currentPage.value = 1
})

const filteredNotas = computed(() => {
  const query = debouncedSearchQuery.value.toLowerCase()
  let items = notaStore.rootItems

  // Filter based on active view
  switch (activeView.value) {
    case 'favorites':
      items = items.filter((nota) => nota.favorite)
      break
    case 'recent':
      items = items
        .slice()
        .sort((a, b) => {
          const dateA = new Date(a.updatedAt)
          const dateB = new Date(b.updatedAt)
          return dateB.getTime() - dateA.getTime()
        })
      break
  }

  // Apply search filter if query exists
  if (query) {
    items = items.filter(
      (nota) =>
        nota.title.toLowerCase().includes(query) || nota.content?.toLowerCase().includes(query),
    )
  }

  return items
})

// Paginated items
const paginatedNotas = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value
  const endIndex = startIndex + itemsPerPage.value
  return filteredNotas.value.slice(startIndex, endIndex)
})

// Total pages for pagination
const totalPages = computed(() => {
  return Math.ceil(filteredNotas.value.length / itemsPerPage.value) || 1
})

const createNewNota = async (parentId: string | null = null) => {
  // If title is empty, use a default title
  const title = newNotaTitle.value.trim() || 'Untitled Nota'

  try {
    // For root-level notas, parentId should be null
    const actualParentId = parentId === '' ? null : parentId
    
    const result = await createQuickNota(title, actualParentId)
    
    if (result.success) {
      newNotaTitle.value = ''
      showNewNotaInput.value = false

      if (actualParentId) {
        expandedItems.value.add(actualParentId)
      }
    }
  } catch (error) {
    logger.error('Failed to create nota:', error)
  }
}

const handleQuickCreate = async () => {
  const title = generateRandomTitle()
  await createQuickNota(title)
}

// Enhanced keyboard shortcuts
onKeyStroke('n', (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    showNewNotaInput.value = true
  }
})

// View switching shortcuts
onKeyStroke('1', (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    activeView.value = 'all'
  }
})

onKeyStroke('2', (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    activeView.value = 'favorites'
  }
})

onKeyStroke('3', (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    activeView.value = 'recent'
  }
})

// Clear search shortcut
onKeyStroke('Escape', () => {
  if (showSearch.value && searchQuery.value) {
    searchQuery.value = ''
  } else if (showSearch.value) {
    showSearch.value = false
  }
})

// Show shortcuts dialog
onKeyStroke('?', (e: KeyboardEvent) => {
  if (e.shiftKey) {
    e.preventDefault()
    showShortcutsDialog.value = true
  }
})

// Handle login/profile navigation
const handleAuthNavigation = () => {
  if (authStore.isAuthenticated) {
    router.push('/profile')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="w-full h-full flex flex-col border-e bg-background text-foreground" :class="{ 'mobile-sidebar': isMobile }">
    <!-- Header -->
    <div class="p-2 border-b space-y-2">
      <!-- Logo and User Info -->
      <div class="flex items-center justify-between">
        <RouterLink
          to="/"
          class="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded-md transition-colors"
        >
          <img src="@/assets/logo.svg" alt="BashNota Logo" class="h-5 w-auto text-primary" />
          <span class="font-semibold">BashNota</span>
        </RouterLink>

        <div class="flex items-center gap-1">
          <!-- User info in header for better visibility -->
          <SidebarAuthStatus :compact="true" />
          <DarkModeToggle />
          
          <!-- Dedicated Settings Button -->
          <Button 
            variant="ghost" 
            size="sm" 
            @click="router.push('/settings')"
            title="Settings"
          >
            <Settings class="h-4 w-4" />
          </Button>
          
          <!-- Shortcuts Dialog Trigger -->
          <Button 
            variant="ghost" 
            size="sm" 
            @click="showShortcutsDialog = true"
            title="Keyboard Shortcuts (Shift + ?)"
          >
            <Settings2 class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Search and View Controls -->
      <div class="space-y-2">
        <div class="flex items-center gap-1.5">
          <!-- Search Component -->
          <SidebarSearch
            v-model="searchQuery"
            v-model:showSearch="showSearch"
          />

          <!-- View Selector Component - now shows condensed when searching -->
          <SidebarViewSelector
            v-model="activeView"
            :condensed="showSearch"
          />

          <!-- New Nota Button Component -->
          <SidebarNewNotaButton
            v-if="!showSearch"
            @quick-create="handleQuickCreate"
            @open-modal="showNewNotaModal = true"
            class="ml-auto"
          />
        </div>
      </div>
    </div>

    <!-- Tree View with Pagination -->
    <ScrollArea class="flex-1">
      <div class="py-1">
        <NotaTree
          :items="paginatedNotas"
          :expanded-items="expandedItems"
          :show-new-input="null"
          :new-nota-title="newNotaTitle"
          @toggle="(id) => (expandedItems.has(id) ? expandedItems.delete(id) : expandedItems.add(id))"
          @create="createNewNota"
          @show-new-input="(id) => {
            showNewNotaInput = true
            newNotaTitle = ''
          }"
          @update:new-nota-title="(value) => (newNotaTitle = value)"
        />

        <!-- Loading State -->
        <div
          v-if="notaStore.loading"
          class="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground gap-1.5 my-4"
        >
          <div class="animate-spin rounded-full bg-muted/50 p-2">
            <div class="h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
          <p>Loading notes...</p>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="filteredNotas.length === 0"
          class="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground gap-1.5 my-4"
        >
          <div class="rounded-full bg-muted/50 p-2">
            <Search v-if="debouncedSearchQuery" class="h-4 w-4" />
            <FileText v-else class="h-4 w-4" />
          </div>
          <p>{{ debouncedSearchQuery ? 'No items found' : 'Create your first nota' }}</p>
          <div v-if="debouncedSearchQuery" class="text-xs text-center">
            <p>Try adjusting your search terms</p>
            <Button @click="searchQuery = ''" variant="link" size="sm" class="text-xs p-0 h-auto">
              Clear search
            </Button>
          </div>
          <Button 
            v-else
            @click="handleQuickCreate" 
            variant="outline" 
            size="sm" 
            class="mt-1"
          >
            <Plus class="h-4 w-4 mr-1" />
            New Nota
          </Button>
        </div>

        <!-- Pagination Component -->
        <SidebarPagination
          v-if="filteredNotas.length > 0"
          :current-page="currentPage"
          @update:page="currentPage = $event"
          :total-pages="totalPages"
          :items-per-page="itemsPerPage"
          :total-items="filteredNotas.length"
        />
      </div>
    </ScrollArea>

    <!-- Keyboard Shortcuts Dialog -->
    <Dialog :open="showShortcutsDialog" @update:open="showShortcutsDialog = $event">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div class="space-y-4">
          <div class="space-y-2">
            <h4 class="text-sm font-medium">Navigation</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>New nota</span>
                <Badge variant="outline" class="text-xs">Ctrl/⌘ + N</Badge>
              </div>
              <div class="flex justify-between">
                <span>All notas</span>
                <Badge variant="outline" class="text-xs">Ctrl/⌘ + 1</Badge>
              </div>
              <div class="flex justify-between">
                <span>Favorites</span>
                <Badge variant="outline" class="text-xs">Ctrl/⌘ + 2</Badge>
              </div>
              <div class="flex justify-between">
                <span>Recent</span>
                <Badge variant="outline" class="text-xs">Ctrl/⌘ + 3</Badge>
              </div>
            </div>
          </div>
          
          <div class="space-y-2">
            <h4 class="text-sm font-medium">Search</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Clear search</span>
                <Badge variant="outline" class="text-xs">Escape</Badge>
              </div>
            </div>
          </div>
          
          <div class="space-y-2">
            <h4 class="text-sm font-medium">Help</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Show shortcuts</span>
                <Badge variant="outline" class="text-xs">Shift + ?</Badge>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    <!-- New Nota Modal -->
    <NewNotaModal
      :open="showNewNotaModal"
      @update:open="showNewNotaModal = $event"
      @created="(nota) => {
        showNewNotaInput = false
        newNotaTitle = ''
      }"
    />
  </div>
</template>

<style scoped>
/* Mobile optimizations */
.mobile-sidebar {
  font-size: 0.875rem; /* text-sm */
}

.mobile-sidebar .h-7 {
  height: 2rem; /* h-8 */
}

.mobile-sidebar .text-xs {
  font-size: 0.875rem; /* text-sm */
}

/* Enhanced transitions */
.transition-colors {
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Loading animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Smooth layout transitions */
.space-y-2 > * + * {
  transition: margin-top 0.2s ease;
}

/* Better focus states for accessibility */
button:focus-visible,
a:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Mobile touch targets */
@media (max-width: 768px) {
  button, a {
    min-height: 44px;
    min-width: 44px;
  }
  
  .gap-1 {
    gap: 0.375rem; /* gap-1.5 */
  }
  
  .gap-1\.5 {
    gap: 0.5rem; /* gap-2 */
  }
}

/* Responsive text scaling */
@media (max-width: 640px) {
  .text-sm {
    font-size: 1rem; /* text-base */
  }
  
  .text-xs {
    font-size: 0.875rem; /* text-sm */
  }
}
</style>








