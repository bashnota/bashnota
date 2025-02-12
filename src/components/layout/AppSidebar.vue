<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { onKeyStroke } from '@vueuse/core'
import DarkModeToggle from './DarkModeToggle.vue'
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FolderIcon, 
  CommandLineIcon,
  StarIcon,
  ClockIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon
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

const router = useRouter()
const notaStore = useNotaStore()
const newNotaTitle = ref('')
const searchQuery = ref('')
const showNewNotaInput = ref<string | null>(null)
const expandedItems = ref<Set<string>>(new Set())
const shortcutsDialog = ref<{ isOpen: boolean }>({ isOpen: false })
const activeView = ref<'all' | 'favorites' | 'recent'>('all')

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
      items = items.filter(nota => nota.favorite)
      break
    case 'recent':
      items = items.slice().sort((a, b) => {
        const dateA = new Date(a.updatedAt)
        const dateB = new Date(b.updatedAt)
        return dateB.getTime() - dateA.getTime()
      }).slice(0, 10) // Show only 10 most recent
      break
  }

  // Apply search filter if query exists
  if (query) {
    items = items.filter(nota => 
      nota.title.toLowerCase().includes(query) ||
      nota.content?.toLowerCase().includes(query)
    )
  }

  return items
})

const createNewNota = async (parentId: string | null = null) => {
  if (!newNotaTitle.value.trim()) return

  try {
    const nota = await notaStore.createItem(newNotaTitle.value, parentId)
    newNotaTitle.value = ''
    showNewNotaInput.value = null

    if (parentId) {
      expandedItems.value.add(parentId)
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

onKeyStroke('/', (e) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    document.querySelector<HTMLInputElement>('.search-input')?.focus()
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
    <div class="p-6 border-b space-y-4">
      <div class="flex items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 rounded-lg transition-colors">
          <div class="flex items-center gap-2">
            <CommandLineIcon class="h-6 w-6 text-primary" />
            <span class="font-bold text-xl">BashNota</span>
          </div>
        </RouterLink>
        
        <div class="flex items-center gap-2">
          <DarkModeToggle />
          
          <!-- Settings Dropdown -->
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Cog6ToothIcon class="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem @click="shortcutsDialog.isOpen = true">
                <QuestionMarkCircleIcon class="h-4 w-4" />
                <span>Keyboard Shortcuts</span>
              </DropdownMenuItem>
              <DropdownMenuItem @click="router.push('/settings')">
                <Cog6ToothIcon class="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <!-- Search -->
      <div class="relative">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input 
          v-model="searchQuery" 
          placeholder="Search notas..." 
          class="pl-8 text-sm search-input" 
        />
      </div>

      <!-- View Selector -->
      <div class="flex gap-2">
        <Button
          v-for="option in viewOptions"
          :key="option.id"
          variant="ghost"
          size="icon"
          :class="[
            'h-8 w-8',
            activeView === option.id && 'bg-primary/10 text-primary hover:bg-primary/20'
          ]"
          @click="activeView = option.id as 'all' | 'favorites' | 'recent'"
          :title="option.label"
        >
          <component :is="option.icon" class="h-4 w-4" />
        </Button>
      </div>

      <!-- New Nota Button/Input -->
      <div>
        <Input
          v-if="showNewNotaInput === null"
          v-model="newNotaTitle"
          placeholder="New nota title..."
          class="text-sm"
          @keyup.enter="createNewNota()"
          @keydown="handleKeydown"
          ref="newNotaInput"
          autofocus
        />
        <Button
          v-else
          @click="showNewNotaInput = null"
          class="h-8 w-8"
          variant="default"
          title="New Nota"
        >
          <PlusIcon class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Tree View -->
    <ScrollArea class="flex-1">
      <div class="p-4">
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
          class="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground gap-3"
        >
          <div class="rounded-full bg-muted/50 p-3">
            <component :is="searchQuery ? MagnifyingGlassIcon : FolderIcon" class="w-5 h-5" />
          </div>
          {{ searchQuery ? 'No items found' : 'Create your first nota' }}
        </div>
      </div>
    </ScrollArea>

    <!-- Shortcuts Dialog -->
    <ShortcutsDialog ref="shortcutsDialog" />
  </div>
</template>
