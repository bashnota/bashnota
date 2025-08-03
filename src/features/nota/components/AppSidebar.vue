<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount, nextTick } from 'vue'
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
  Settings2,
  ChevronDown,
  BookOpen,
  Home,
  Star,
  Clock,
  HelpCircle,
  Keyboard,
  Palette,
  User,
  Database,
  Code2,
  Terminal,
  X
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import NotaTree from '@/features/nota/components/NotaTree.vue'
import { RouterLink } from 'vue-router'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { logger } from '@/services/logger'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import NewNotaModal from '@/features/nota/components/NewNotaModal.vue'
import SearchModal from '@/features/nota/components/SearchModal.vue'
import { useQuickNotaCreation } from '@/features/nota/composables/useQuickNotaCreation'
import { generateRandomTitle } from '@/utils/randomTitleGenerator'
import SidebarAuthStatus from '@/features/nota/components/SidebarAuthStatus.vue'

const router = useRouter()
const notaStore = useNotaStore()
const authStore = useAuthStore()
const { createQuickNota } = useQuickNotaCreation()
const { state: sidebarState } = useSidebar()
const newNotaTitle = ref('')
const searchQuery = ref('')
const showNewNotaInput = ref<boolean>(false)
const expandedItems = ref<Set<string>>(new Set())
const showShortcutsDialog = ref(false)
const activeView = ref<'all' | 'favorites' | 'recent'>('all')
const showSearchModal = ref(false)
const showNewNotaModal = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(15)

// Collapsible sections state
const notasOpen = ref(true)
const docsOpen = ref(true)
const settingsOpen = ref(true)

// Watch sidebar state and collapse all sections when sidebar is collapsed
watch(sidebarState, (newState) => {
  if (newState === 'collapsed') {
    // Collapse all sections when sidebar is collapsed
    notasOpen.value = false
    docsOpen.value = false
    settingsOpen.value = false
  } else if (newState === 'expanded') {
    // Restore previous states when sidebar is expanded
    notasOpen.value = localStorage.getItem('sidebar-notas-collapsed') !== 'true'
    docsOpen.value = localStorage.getItem('sidebar-docs-collapsed') !== 'true'
    settingsOpen.value = localStorage.getItem('sidebar-settings-collapsed') !== 'true'
  }
})

// Navigation menu items
const navigationItems = [
  {
    title: "All Notas",
    icon: Home,
    action: () => { activeView.value = 'all' },
    isActive: computed(() => activeView.value === 'all'),
    shortcut: "⌘1"
  },
  {
    title: "Favorites",
    icon: Star,
    action: () => { activeView.value = 'favorites' },
    isActive: computed(() => activeView.value === 'favorites'),
    shortcut: "⌘2"
  },
  {
    title: "Recent",
    icon: Clock,
    action: () => { activeView.value = 'recent' },
    isActive: computed(() => activeView.value === 'recent'),
    shortcut: "⌘3"
  }
]

// Documentation menu items
const documentationItems = [
  {
    title: "Getting Started",
    icon: BookOpen,
    url: "/docs/getting-started"
  },
  {
    title: "Keyboard Shortcuts",
    icon: Keyboard,
    action: () => { showShortcutsDialog.value = true }
  },
  {
    title: "API Reference",
    icon: Code2,
    url: "/docs/api"
  },
  {
    title: "Help & Support",
    icon: HelpCircle,
    url: "/help"
  }
]

// Settings menu items
const settingsItems = [
  {
    title: "General",
    icon: Settings,
    url: "/settings"
  },
  {
    title: "Appearance",
    icon: Palette,
    url: "/settings/appearance"
  },
  {
    title: "Account",
    icon: User,
    action: () => handleAuthNavigation()
  },
  {
    title: "Data & Storage",
    icon: Database,
    url: "/settings/data"
  },
  {
    title: "Developer",
    icon: Terminal,
    url: "/settings/developer"
  }
]

// Load last used view from localStorage
onMounted(async () => {
  await notaStore.loadNotas()
  const savedView = localStorage.getItem('sidebar-view')
  if (savedView) {
    activeView.value = savedView as 'all' | 'favorites' | 'recent'
  }
  
  // Load collapsible states
  notasOpen.value = localStorage.getItem('sidebar-notas-collapsed') !== 'true'
  docsOpen.value = localStorage.getItem('sidebar-docs-collapsed') !== 'true'
  settingsOpen.value = localStorage.getItem('sidebar-settings-collapsed') !== 'true'
})

// Save collapsible states (only when sidebar is expanded)
watch(notasOpen, (value) => {
  if (sidebarState.value === 'expanded') {
    localStorage.setItem('sidebar-notas-collapsed', (!value).toString())
  }
})

watch(docsOpen, (value) => {
  if (sidebarState.value === 'expanded') {
    localStorage.setItem('sidebar-docs-collapsed', (!value).toString())
  }
})

watch(settingsOpen, (value) => {
  if (sidebarState.value === 'expanded') {
    localStorage.setItem('sidebar-settings-collapsed', (!value).toString())
  }
})

// Auto-focus search when opened - removed, now handled by SearchModal

onBeforeUnmount(() => {
  // Cleanup if needed
})

// Reset pagination when view changes
watch(activeView, () => {
  currentPage.value = 1
})

const filteredNotas = computed(() => {
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

// Clear search shortcut - no longer needed for inline search
onKeyStroke('Escape', () => {
  if (showSearchModal.value) {
    showSearchModal.value = false
  }
})

// Open search shortcut
onKeyStroke('f', (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    showSearchModal.value = true
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
  <Sidebar collapsible="icon" class="border-r min-h-screen max-h-screen flex flex-col">
    <!-- Header - Logo Only -->
    <SidebarHeader class="flex-shrink-0 border-b">
      <div class="flex items-center justify-center py-2">
        <RouterLink
          to="/"
          class="flex items-center gap-2 px-3 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-all duration-300 ease-in-out group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:gap-0"
        >
          <img 
            src="@/assets/logo.svg" 
            alt="BashNota Logo" 
            class="h-6 w-auto text-primary group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 transition-all duration-500 ease-out" 
          />
          <span class="font-bold text-lg group-data-[collapsible=icon]:hidden transition-opacity duration-300 ease-in-out">BashNota</span>
        </RouterLink>
      </div>
    </SidebarHeader>

    <!-- Main Content with max height and scrolling -->
    <SidebarContent class="flex-1 min-h-0 overflow-hidden">
      <div class="h-full flex flex-col">
        <!-- Quick Actions Section -->
        <SidebarGroup class="flex-shrink-0 px-2 py-3 border-b">
          <div class="space-y-2">
            <!-- Search Button -->
            <Button 
              variant="ghost" 
              size="sm" 
              @click="showSearchModal = true"
              class="w-full h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 justify-start gap-2"
              title="Search all notas (Ctrl/⌘ + F)"
            >
              <Search class="h-4 w-4 flex-shrink-0" />
              <span class="group-data-[collapsible=icon]:hidden text-muted-foreground">Search notas...</span>
            </Button>

            <!-- New Nota Button -->
            <Button 
              variant="default" 
              size="sm" 
              @click="showNewNotaModal = true"
              class="w-full h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Create new nota (Ctrl/⌘ + N)"
            >
              <Plus class="h-4 w-4 flex-shrink-0" />
              <span class="group-data-[collapsible=icon]:hidden font-medium">New Nota</span>
            </Button>
          </div>
        </SidebarGroup>
        <!-- Navigation Section with Scrollable Content -->
        <div class="flex-1 min-h-0 overflow-y-auto">
          <!-- Navigation Section -->
          <Collapsible v-model:open="notasOpen" class="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger 
                  class="flex w-full items-center justify-between p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:mx-auto"
                  :title="sidebarState === 'collapsed' ? 'My Notas' : undefined"
                >
                  <span class="flex items-center gap-2">
                    <FileText class="h-4 w-4" />
                    <span class="group-data-[collapsible=icon]:hidden">My Notas</span>
                  </span>
                  <ChevronDown class="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180 group-data-[collapsible=icon]:hidden" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <!-- View Selector Menu - Side by Side with Icons in Collapsed Mode -->
                  <div class="group-data-[collapsible=icon]:hidden">
                    <!-- Full Layout - Side by Side Buttons -->
                    <div class="flex gap-1 mb-3">
                      <Button
                        v-for="item in navigationItems"
                        :key="item.title"
                        @click="item.action"
                        :variant="item.isActive.value ? 'default' : 'ghost'"
                        size="sm"
                        :class="[
                          'flex items-center gap-1.5 text-xs transition-all duration-200',
                          item.isActive.value ? 'flex-1' : 'px-2'
                        ]"
                        :title="`${item.title} (${item.shortcut})`"
                      >
                        <component :is="item.icon" class="h-3.5 w-3.5 flex-shrink-0" />
                        <span 
                          v-if="item.isActive.value" 
                          class="animate-in fade-in-0 slide-in-from-left-2 duration-200"
                        >
                          {{ item.title }}
                        </span>
                        <Badge v-if="item.isActive.value" variant="secondary" class="ml-auto text-[10px] px-1">
                          {{ filteredNotas.length }}
                        </Badge>
                      </Button>
                    </div>
                  </div>
                  
                  <!-- Collapsed Mode - Icon Only Buttons -->
                  <div class="group-data-[collapsible=icon]:block hidden">
                    <div class="flex flex-col gap-1 mb-3">
                      <Button
                        v-for="item in navigationItems"
                        :key="item.title"
                        @click="item.action"
                        :variant="item.isActive.value ? 'default' : 'ghost'"
                        size="sm"
                        class="w-8 h-8 p-0 flex items-center justify-center"
                        :title="`${item.title} (${item.shortcut}) - ${filteredNotas.length} notas`"
                      >
                        <component :is="item.icon" class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <SidebarSeparator class="my-2 group-data-[collapsible=icon]:hidden" />

                  <!-- Nota Tree with improved scrolling -->
                  <div class="flex flex-col min-h-0">
                    <!-- Scrollable nota list with max height -->
                    <div class="flex-1 min-h-0 overflow-y-auto max-h-[400px] space-y-1 pr-1">
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
                        class="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground gap-1.5"
                      >
                        <div class="animate-spin rounded-full bg-muted/50 p-2">
                          <div class="h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        </div>
                        <p class="group-data-[collapsible=icon]:hidden">Loading notes...</p>
                      </div>

                      <!-- Empty State -->
                      <div
                        v-else-if="filteredNotas.length === 0"
                        class="flex flex-col items-center justify-center h-24 text-sm text-muted-foreground gap-1.5"
                      >
                        <div class="rounded-full bg-muted/50 p-2">
                          <FileText class="h-4 w-4" />
                        </div>
                        <p class="group-data-[collapsible=icon]:hidden">Create your first nota</p>
                        <Button 
                          @click="handleQuickCreate" 
                          variant="outline" 
                          size="sm" 
                          class="mt-1 group-data-[collapsible=icon]:hidden"
                        >
                          <Plus class="h-4 w-4 mr-1" />
                          New Nota
                        </Button>
                      </div>
                    </div>

                    <!-- Improved Pagination -->
                    <div v-if="filteredNotas.length > 0 && totalPages > 1" class="mt-3 pt-3 border-t group-data-[collapsible=icon]:hidden">
                      <div class="flex items-center justify-between gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          @click="currentPage = Math.max(1, currentPage - 1)"
                          :disabled="currentPage === 1"
                          class="h-7 px-2 flex-1"
                        >
                          <ChevronDown class="h-3 w-3 rotate-90" />
                          <span class="text-xs ml-1">Prev</span>
                        </Button>

                        <div class="flex items-center px-2">
                          <span class="text-xs text-muted-foreground whitespace-nowrap">
                            {{ currentPage }}/{{ totalPages }}
                          </span>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          @click="currentPage = Math.min(totalPages, currentPage + 1)"
                          :disabled="currentPage === totalPages"
                          class="h-7 px-2 flex-1"
                        >
                          <span class="text-xs mr-1">Next</span>
                          <ChevronDown class="h-3 w-3 -rotate-90" />
                        </Button>
                      </div>

                      <!-- Items count -->
                      <div class="text-center mt-2">
                        <span class="text-xs text-muted-foreground">
                          {{ filteredNotas.length }} {{ filteredNotas.length === 1 ? 'nota' : 'notas' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

          <!-- Documentation Section -->
          <Collapsible v-model:open="docsOpen" class="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger 
                  class="flex w-full items-center justify-between p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:mx-auto"
                  :title="sidebarState === 'collapsed' ? 'Documentation' : undefined"
                >
                  <span class="flex items-center gap-2">
                    <BookOpen class="h-4 w-4" />
                    <span class="group-data-[collapsible=icon]:hidden">Documentation</span>
                  </span>
                  <ChevronDown class="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180 group-data-[collapsible=icon]:hidden" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem v-for="item in documentationItems" :key="item.title">
                      <SidebarMenuButton 
                        v-if="item.url"
                        asChild
                        class="w-full group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                      >
                        <RouterLink :to="item.url" class="flex items-center gap-2">
                          <component :is="item.icon" class="h-4 w-4 flex-shrink-0" />
                          <span class="group-data-[collapsible=icon]:hidden">{{ item.title }}</span>
                        </RouterLink>
                      </SidebarMenuButton>
                      <SidebarMenuButton 
                        v-else
                        @click="item.action"
                        class="flex items-center gap-2 w-full group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                      >
                        <component :is="item.icon" class="h-4 w-4 flex-shrink-0" />
                        <span class="group-data-[collapsible=icon]:hidden">{{ item.title }}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

          <!-- Settings Section -->
          <Collapsible v-model:open="settingsOpen" class="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger 
                  class="flex w-full items-center justify-between p-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:mx-auto"
                  :title="sidebarState === 'collapsed' ? 'Settings' : undefined"
                >
                  <span class="flex items-center gap-2">
                    <Settings class="h-4 w-4" />
                    <span class="group-data-[collapsible=icon]:hidden">Settings</span>
                  </span>
                  <ChevronDown class="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180 group-data-[collapsible=icon]:hidden" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem v-for="item in settingsItems" :key="item.title">
                      <SidebarMenuButton 
                        v-if="item.url"
                        asChild
                        class="w-full group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                      >
                        <RouterLink :to="item.url" class="flex items-center gap-2">
                          <component :is="item.icon" class="h-4 w-4 flex-shrink-0" />
                          <span class="group-data-[collapsible=icon]:hidden">{{ item.title }}</span>
                        </RouterLink>
                      </SidebarMenuButton>
                      <SidebarMenuButton 
                        v-else
                        @click="item.action"
                        class="flex items-center gap-2 w-full group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                      >
                        <component :is="item.icon" class="h-4 w-4 flex-shrink-0" />
                        <span class="group-data-[collapsible=icon]:hidden">{{ item.title }}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        </div>
      </div>
    </SidebarContent>

    <!-- Enhanced Footer with User Controls and Actions -->
    <SidebarFooter class="flex-shrink-0 border-t">
      <!-- User Authentication Status -->
      <SidebarAuthStatus />
      
      <!-- Action Buttons Row -->
      <div class="px-2 py-2 border-t">
        <div class="flex items-center gap-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:flex-col">
          <!-- Theme Toggle -->
          <DarkModeToggle class="group-data-[collapsible=icon]:mb-1" />
          
          <!-- Settings/Shortcuts -->
          <Button 
            variant="ghost" 
            size="sm" 
            @click="showShortcutsDialog = true"
            class="h-8 w-8 p-0 group-data-[collapsible=icon]:mb-1"
            title="Keyboard Shortcuts (Shift + ?)"
          >
            <Settings2 class="h-4 w-4" />
          </Button>
          
          <!-- Version Info (hidden when collapsed) -->
          <div class="group-data-[collapsible=icon]:hidden ml-auto">
            <span class="text-xs text-muted-foreground">v1.0</span>
          </div>
        </div>
      </div>
    </SidebarFooter>

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
                <span>Open search</span>
                <Badge variant="outline" class="text-xs">Ctrl/⌘ + F</Badge>
              </div>
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

    <!-- Search Modal -->
    <SearchModal
      :open="showSearchModal"
      @update:open="showSearchModal = $event"
    />
  </Sidebar>
</template>

<style scoped>
/* Sidebar Layout Improvements */
[data-sidebar="sidebar"] {
  --sidebar-width: 300px;
  --sidebar-width-icon: 60px;
  width: var(--sidebar-width);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

[data-sidebar="sidebar"][data-state="collapsed"] {
  width: var(--sidebar-width-icon);
}

/* Ensure proper centering in collapsed mode */
[data-sidebar="sidebar"][data-state="collapsed"] .group-data-\[collapsible\=icon\]\:justify-center {
  justify-content: center !important;
}

[data-sidebar="sidebar"][data-state="collapsed"] .group-data-\[collapsible\=icon\]\:flex-col {
  flex-direction: column !important;
}

/* Ensure sidebar takes full height */
.min-h-screen {
  min-height: 100vh;
}

.max-h-screen {
  max-height: 100vh;
}

/* Enhanced transitions for custom components */
.transition-colors {
  transition: background-color 0.3s ease-in-out, color 0.3s ease-in-out;
}

.transition-all {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Smooth logo scaling animation */
img[alt="BashNota Logo"] {
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}

/* Logo scale enhancement on collapsed state */
[data-sidebar="sidebar"][data-state="collapsed"] img[alt="BashNota Logo"] {
  transform: scale(1.1);
}

/* New Nota Button Enhancement */
.bg-primary {
  background-color: hsl(var(--primary)) !important;
}

.text-primary-foreground {
  color: hsl(var(--primary-foreground)) !important;
}

.hover\:bg-primary\/90:hover {
  background-color: hsl(var(--primary) / 0.9) !important;
}

/* Enhanced button hover effects */
Button[title*="Create new nota"]:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px hsl(var(--primary) / 0.3);
}

/* Subtle pulse animation for attention */
@keyframes pulse-primary {
  0%, 100% {
    box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px hsl(var(--primary) / 0.1);
  }
}

Button[title*="Create new nota"] {
  animation: pulse-primary 3s ease-in-out infinite;
}

/* Loading animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Better focus states for accessibility */
button:focus-visible,
a:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Custom hover effects for collapsible triggers */
.group\/collapsible [data-collapsible="trigger"]:hover {
  background-color: hsl(var(--sidebar-accent));
  color: hsl(var(--sidebar-accent-foreground));
}

/* Smooth transitions for collapsible content */
.group\/collapsible [data-collapsible="content"] {
  overflow: hidden;
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Active state styling for navigation items */
[data-active="true"] {
  background-color: hsl(var(--sidebar-accent));
  color: hsl(var(--sidebar-accent-foreground));
  font-weight: 500;
}

/* Enhanced sidebar section spacing */
.group\/collapsible + .group\/collapsible {
  margin-top: 0.5rem;
}

/* Subtle animation for chevron icons */
.group-data-\[state\=open\]\/collapsible\:rotate-180 {
  transform-origin: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Better visual hierarchy for group labels */
[data-sidebar="group-label"] {
  font-weight: 600;
  letter-spacing: 0.025em;
}

/* Custom scrollbar for nota tree and content */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}

/* Smooth transitions for buttons */
.h-7, .h-8 {
  transition: all 0.2s ease;
}

.h-7:hover:not(:disabled),
.h-8:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px hsl(var(--foreground) / 0.1);
}

/* Responsive design improvements */
@media (max-width: 768px) {
  [data-sidebar="sidebar"] {
    --sidebar-width: 280px;
  }
}

/* Improved button layouts for better UX */
.w-full.justify-start {
  text-align: left;
}

/* Enhanced collapsible icon behavior */
.group-data-\[collapsible\=icon\]\:hidden {
  transition: opacity 0.2s ease;
}

/* Collapsed mode specific styles */
[data-sidebar="sidebar"][data-state="collapsed"] .group-data-\[collapsible\=icon\]\:block {
  display: block !important;
}

[data-sidebar="sidebar"][data-state="collapsed"] .group-data-\[collapsible\=icon\]\:hidden {
  display: none !important;
}

[data-sidebar="sidebar"][data-state="collapsed"] .group-data-\[collapsible\=icon\]\:w-8 {
  width: 2rem !important;
}

[data-sidebar="sidebar"][data-state="collapsed"] .group-data-\[collapsible\=icon\]\:h-8 {
  height: 2rem !important;
}

[data-sidebar="sidebar"][data-state="collapsed"] .group-data-\[collapsible\=icon\]\:p-0 {
  padding: 0 !important;
}

[data-sidebar="sidebar"][data-state="collapsed"] .group-data-\[collapsible\=icon\]\:px-0 {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

[data-sidebar="sidebar"][data-state="collapsed"] .group-data-\[collapsible\=icon\]\:mb-1 {
  margin-bottom: 0.25rem !important;
}

/* Hide collapsible content when sidebar is collapsed */
[data-sidebar="sidebar"][data-state="collapsed"] .group\/collapsible [data-collapsible="content"] {
  display: none !important;
}

/* Show only trigger icons in collapsed mode */
[data-sidebar="sidebar"][data-state="collapsed"] .group\/collapsible [data-collapsible="trigger"] {
  justify-content: center !important;
  padding: 0.5rem !important;
  width: 2rem !important;
  height: 2rem !important;
  margin: 0.25rem auto !important;
}

/* Additional collapsed mode refinements */
[data-sidebar="sidebar"][data-state="collapsed"] .group-data-\[collapsible\=icon\]\:mx-auto {
  margin-left: auto !important;
  margin-right: auto !important;
}

/* Better spacing for footer sections */
.border-t + .border-t {
  border-top-width: 1px;
  border-top-color: hsl(var(--border));
}

/* Smooth resizing for adjustable width */
[data-sidebar="sidebar"] {
  resize: horizontal;
  min-width: 240px;
  max-width: 480px;
  overflow: hidden;
}

/* Hide resize handle on collapsed state */
[data-sidebar="sidebar"][data-state="collapsed"] {
  resize: none;
}

/* Enhanced visual feedback for interactive elements */
.hover\:bg-sidebar-accent:hover {
  background-color: hsl(var(--sidebar-accent));
  color: hsl(var(--sidebar-accent-foreground));
}

/* Improved badge styling */
.ml-auto {
  margin-left: auto;
}

/* Better layout for auth status */
.flex.items-center.justify-between {
  align-items: center;
  justify-content: space-between;
}
</style>








