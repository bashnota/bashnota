<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { onKeyStroke } from '@vueuse/core'
import PageTree from '../PageTree.vue'
import DarkModeToggle from './DarkModeToggle.vue'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/solid'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import NotaTree from '../NotaTree.vue'

const router = useRouter()
const route = useRoute()
const notaStore = useNotaStore()
const newNotaTitle = ref('')
const searchQuery = ref('')
const showNewNotaInput = ref<string | null>(null)
const expandedItems = ref<Set<string>>(new Set())
const showRenameInput = ref<string | null>(null)
const renameTitle = ref('')

onMounted(async () => {
  await notaStore.loadNotas()
})

const currentNotaId = computed(() => route.params.id as string)

const filteredNotas = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return notaStore.rootItems
  return notaStore.items.filter((nota) => 
    nota.title.toLowerCase().includes(query)
  )
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

const toggleNota = (notaId: string) => {
  if (expandedItems.value.has(notaId)) {
    expandedItems.value.delete(notaId)
  } else {
    expandedItems.value.add(notaId)
  }
}

const startRename = (nota: { id: string; title: string }) => {
  showRenameInput.value = nota.id
  renameTitle.value = nota.title
}

const handleRename = async (notaId: string) => {
  if (!renameTitle.value.trim()) return
  await notaStore.renameItem(notaId, renameTitle.value)
  showRenameInput.value = null
}

const handleDelete = async (notaId: string) => {
  if (confirm('Are you sure you want to delete this nota?')) {
    await notaStore.deleteItem(notaId)
    if (currentNotaId.value === notaId) {
      router.push('/')
    }
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
</script>

<template>
  <div class="w-full h-full flex flex-col border-e bg-slate-100 dark:bg-slate-900">
    <!-- Header -->
    <div class="p-6 border-b space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">BashNota</h1>
        <DarkModeToggle />
      </div>

      <!-- Search -->
      <div class="relative">
        <MagnifyingGlassIcon
          class="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground"
        />
        <Input v-model="searchQuery" placeholder="Search notas..." class="pl-8 text-sm" />
      </div>

      <!-- New Root Nota Button/Input -->
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
          class="w-full justify-start gap-2 text-sm"
          variant="default"
        >
          <PlusIcon class="h-3 w-3" />
          New Nota
        </Button>
      </div>
    </div>

    <!-- Unified Tree -->
    <div class="flex-1 overflow-y-auto p-4">
      <NotaTree 
        :items="filteredNotas" 
        :expanded-items="expandedItems"
        :show-new-input="showNewNotaInput"
        :new-nota-title="newNotaTitle"
        @toggle="(id) => expandedItems.has(id) ? expandedItems.delete(id) : expandedItems.add(id)"
        @create="createNewNota"
        @show-new-input="(id) => {
          showNewNotaInput = id
          newNotaTitle = ''
        }"
        @update:new-nota-title="(value) => newNotaTitle = value"
      />
      
      <!-- Empty State -->
      <div
        v-if="filteredNotas.length === 0"
        class="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground gap-3"
      >
        <div class="rounded-full bg-muted/50 p-3">
          <FolderIcon v-if="!searchQuery" class="w-5 h-5" />
          <MagnifyingGlassIcon v-else class="w-5 h-5" />
        </div>
        {{ searchQuery ? 'No items found' : 'Create your first nota' }}
      </div>
    </div>
  </div>
</template>
