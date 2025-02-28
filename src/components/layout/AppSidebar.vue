<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { onKeyStroke } from '@vueuse/core'
import DarkModeToggle from './DarkModeToggle.vue'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  StarIcon,
  ClockIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/solid'
import { Input } from '@/components/ui/input'
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
import { Transition } from 'vue'

const router = useRouter()
const notaStore = useNotaStore()
const newNotaTitle = ref('')
const searchQuery = ref('')
const showNewNotaInput = ref<string | null>(null)
const expandedItems = ref<Set<string>>(new Set())
const shortcutsDialog = ref<{ isOpen: boolean }>({ isOpen: false })
const activeView = ref<'all' | 'favorites' | 'recent'>('all')
const showSearch = ref(false)

// Load last used view from localStorage
onMounted(async () => {
  await notaStore.loadNotas()
  const savedView = localStorage.getItem('sidebar-view')
  if (savedView) {
    activeView.value = savedView as 'all' | 'favorites' | 'recent'
  }
})

// Save view preference
watch(activeView, (newView) => {
  localStorage.setItem('sidebar-view', newView)
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
        .slice(0, 10) // Show only 10 most recent
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

const createNewNota = async (parentId: string | null = null) => {
  // If title is empty, use a default title
  const title = newNotaTitle.value.trim() || 'Untitled Nota'

  try {
    // For root-level notas, parentId should be null
    const actualParentId = parentId === '' ? null : parentId
    const nota = await notaStore.createItem(title, actualParentId)
    newNotaTitle.value = ''
    showNewNotaInput.value = null

    if (actualParentId) {
      expandedItems.value.add(actualParentId)
    }

    await router.push(`/nota/${nota.id}`)
  } catch (error) {
    console.error('Failed to create nota:', error)
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    showNewNotaInput.value = null
    newNotaTitle.value = ''
  }
}

// Keyboard shortcuts
onKeyStroke('n', (e) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    showNewNotaInput.value = null
  }
})

onKeyStroke('k', (e) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    showSearch.value = true
    // Use nextTick to ensure the input is mounted before focusing
    nextTick(() => {
      document.querySelector<HTMLInputElement>('.search-input')?.focus()
    })
  }
})

// Add escape handler to close search
onKeyStroke('Escape', () => {
  if (showSearch.value) {
    showSearch.value = false
    searchQuery.value = ''
  }
})

const viewOptions = [
  { id: 'all', label: 'All Notes', icon: FolderIcon },
  { id: 'favorites', label: 'Favorites', icon: StarIcon },
  { id: 'recent', label: 'Recent', icon: ClockIcon },
]
</script>

<template>
  <div class="w-full h-full flex flex-col border-e bg-slate-100 dark:bg-slate-900">
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
              <Button variant="ghost" size="sm" class="h-6 w-6">
                <Cog6ToothIcon class="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="shortcutsDialog.isOpen = true">
                <QuestionMarkCircleIcon class="h-4 w-4 mr-2" />
                <span>Shortcuts</span>
              </DropdownMenuItem>
              <DropdownMenuItem @click="router.push('/settings')">
                <Cog6ToothIcon class="h-4 w-4 mr-2" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <!-- Search and View Controls -->
      <div class="space-y-1.5">
        <div class="flex items-center gap-1">
          <!-- Search Button/Bar -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="showSearch" class="relative w-full">
              <div class="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <MagnifyingGlassIcon class="h-3 w-3 text-muted-foreground" />
              </div>
              <Input
                v-model="searchQuery"
                placeholder="Search..."
                class="pl-7 pr-7 h-6 text-xs w-full bg-background search-input"
                @blur="showSearch = false"
                autofocus
              />
              <Button
                variant="ghost"
                size="sm"
                class="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4"
                @click="() => {
                  showSearch = false
                  searchQuery = ''
                }"
              >
                <XMarkIcon class="h-3 w-3" />
              </Button>
            </div>
            <div v-else class="flex items-center gap-1 w-full">
              <Button
                variant="ghost"
                size="sm"
                class="h-6 w-6 flex-shrink-0"
                @click="showSearch = true"
                title="Search (⌘K)"
              >
                <MagnifyingGlassIcon class="h-3.5 w-3.5" />
              </Button>

              <!-- View Controls -->
              <div class="flex gap-1">
                <Button
                  v-for="option in viewOptions"
                  :key="option.id"
                  variant="ghost"
                  size="sm"
                  :class="[
                    'h-6 w-6',
                    activeView === option.id && 'bg-primary/10 text-primary hover:bg-primary/20',
                  ]"
                  @click="activeView = option.id as 'all' | 'favorites' | 'recent'"
                  :title="option.label"
                >
                  <component :is="option.icon" class="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button
                @click="showNewNotaInput = ''"
                class="h-6 text-xs px-2 gap-1 ml-auto"
                variant="default"
                size="sm"
              >
                <PlusIcon class="h-3.5 w-3.5" />
                <span>New Nota</span>
              </Button>
            </div>
          </Transition>
        </div>

        <!-- New Nota Input -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="showNewNotaInput !== null" class="relative">
            <div class="flex gap-1">
              <Input
                v-model="newNotaTitle"
                placeholder="Enter nota title..."
                class="h-6 text-xs flex-1"
                @keydown="handleKeydown"
                @keydown.enter="createNewNota(showNewNotaInput)"
                autofocus
              />
              <Button 
                @click="createNewNota(showNewNotaInput)" 
                variant="default" 
                size="sm" 
                class="h-6 text-xs"
              >
                Create
              </Button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Tree View -->
    <ScrollArea class="flex-1">
      <div class="py-1">
        <NotaTree
          :items="filteredNotas"
          :expanded-items="expandedItems"
          :show-new-input="showNewNotaInput"
          :new-nota-title="newNotaTitle"
          @toggle="(id) => (expandedItems.has(id) ? expandedItems.delete(id) : expandedItems.add(id))"
          @create="createNewNota"
          @show-new-input="(id) => {
            showNewNotaInput = id
            newNotaTitle = ''
          }"
          @update:new-nota-title="(value) => (newNotaTitle = value)"
        />

        <!-- Empty State -->
        <div
          v-if="filteredNotas.length === 0"
          class="flex flex-col items-center justify-center h-16 text-sm text-muted-foreground gap-1.5"
        >
          <div class="rounded-full bg-muted/50 p-1.5">
            <component :is="searchQuery ? MagnifyingGlassIcon : FolderIcon" class="w-3 h-3" />
          </div>
          {{ searchQuery ? 'No items found' : 'Create your first nota' }}
        </div>
      </div>
    </ScrollArea>

    <ShortcutsDialog ref="shortcutsDialog" />
  </div>
</template>
