<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { useAuthStore } from '@/stores/auth'
import { onKeyStroke } from '@vueuse/core'
import DarkModeToggle from './DarkModeToggle.vue'
import {
  ChevronRight,
  FileText,
  Star,
  Settings,
  Plus,
  FolderPlus,
  X,
  Search,
  Menu,
  Settings2
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import NotaTree from '../NotaTree.vue'
import { RouterLink } from 'vue-router'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ShortcutsDialog from '../ShortcutsDialog.vue'
import { logger } from '@/services/logger'

// Import our new modular components
import SidebarSearch from './SidebarSearch.vue'
import SidebarViewSelector from './SidebarViewSelector.vue'
import SidebarNewNotaButton from './SidebarNewNotaButton.vue'
import SidebarPagination from './SidebarPagination.vue'
import SidebarAuthStatus from './SidebarAuthStatus.vue'

const router = useRouter()
const notaStore = useNotaStore()
const authStore = useAuthStore()
const newNotaTitle = ref('')
const searchQuery = ref('')
const showNewNotaInput = ref<boolean>(false)
const expandedItems = ref<Set<string>>(new Set())
const shortcutsDialog = ref<{ isOpen: boolean }>({ isOpen: false })
const activeView = ref<'all' | 'favorites' | 'recent'>('all')
const showSearch = ref(false)

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(15)

// Load last used view from localStorage
onMounted(async () => {
  await notaStore.loadNotas()
  const savedView = localStorage.getItem('sidebar-view')
  if (savedView) {
    activeView.value = savedView as 'all' | 'favorites' | 'recent'
  }
})

// Reset pagination when view or search changes
watch([activeView, searchQuery], () => {
  currentPage.value = 1
})

const filteredNotas = computed(() => {
  const query = searchQuery.value.toLowerCase()
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
    const nota = await notaStore.createItem(title, actualParentId)
    newNotaTitle.value = ''
    showNewNotaInput.value = false

    if (actualParentId) {
      expandedItems.value.add(actualParentId)
    }

    await router.push(`/nota/${nota.id}`)
  } catch (error) {
    logger.error('Failed to create nota:', error)
  }
}

// Keyboard shortcuts
onKeyStroke('n', (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    showNewNotaInput.value = false
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
  <div class="w-full h-full flex flex-col border-e bg-slate-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="p-2 border-b space-y-2">
      <!-- Logo and Controls -->
      <div class="flex items-center justify-between">
        <RouterLink
          to="/"
          class="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded-md transition-colors"
        >
          <img src="@/assets/logo.svg" alt="BashNota Logo" class="h-5 w-auto text-primary" />
          <span class="font-semibold">BashNota</span>
        </RouterLink>

        <div class="flex items-center gap-1">
          <DarkModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings2 class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="shortcutsDialog.isOpen = true">
                <Search class="h-4 w-4 mr-2" />
                <span>Shortcuts</span>
              </DropdownMenuItem>
              <DropdownMenuItem @click="router.push('/settings')">
                <Settings class="h-4 w-4 mr-2" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem @click="handleAuthNavigation">
                <FileText class="h-4 w-4 mr-2" />
                <span>{{ authStore.isAuthenticated ? 'Your Profile' : 'Login' }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

          <!-- View Selector Component -->
          <SidebarViewSelector
            v-model="activeView"
            v-if="!showSearch"
          />

          <!-- New Nota Button Component -->
          <SidebarNewNotaButton
            v-if="!showSearch"
            :show-input="showNewNotaInput"
            :title="newNotaTitle"
            :parent-id="null"
            @update:show-input="showNewNotaInput = $event"
            @update:title="newNotaTitle = $event"
            @create="createNewNota"
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

        <!-- Empty State -->
        <div
          v-if="filteredNotas.length === 0"
          class="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground gap-1.5 my-4"
        >
          <div class="rounded-full bg-muted/50 p-2">
            <Search class="h-4 w-4" />
          </div>
          <p>{{ searchQuery ? 'No items found' : 'Create your first nota' }}</p>
          <Button 
            v-if="!searchQuery" 
            @click="showNewNotaInput = true" 
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

    <!-- Auth Status Component -->
    <SidebarAuthStatus />

    <ShortcutsDialog ref="shortcutsDialog" />
  </div>
</template>
