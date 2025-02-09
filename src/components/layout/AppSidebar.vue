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

const router = useRouter()
const route = useRoute()
const notaStore = useNotaStore()
const newNotaTitle = ref('')
const searchQuery = ref('')
const showNewNotaInput = ref(false)
const expandedNotas = ref<Set<string>>(new Set())
const showRenameInput = ref<string | null>(null)
const renameTitle = ref('')

onMounted(async () => {
  await notaStore.loadNotas()
  await notaStore.loadPages()
})

const currentNotaId = computed(() => route.params.id as string)

const filteredNotas = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return notaStore.notas
  return notaStore.notas.filter((nota) => nota.title.toLowerCase().includes(query))
})

const createNewNota = async () => {
  if (!newNotaTitle.value.trim()) return
  const nota = await notaStore.createNota(newNotaTitle.value)
  newNotaTitle.value = ''
  showNewNotaInput.value = false
  router.push(`/nota/${nota.id}`)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    showNewNotaInput.value = false
    newNotaTitle.value = ''
  }
}

const toggleNota = (notaId: string) => {
  if (expandedNotas.value.has(notaId)) {
    expandedNotas.value.delete(notaId)
  } else {
    expandedNotas.value.add(notaId)
  }
}

const startRename = (nota: { id: string; title: string }) => {
  showRenameInput.value = nota.id
  renameTitle.value = nota.title
}

const handleRename = async (notaId: string) => {
  if (!renameTitle.value.trim()) return
  await notaStore.renameNota(notaId, renameTitle.value)
  showRenameInput.value = null
}

const handleDelete = async (notaId: string) => {
  if (confirm('Are you sure you want to delete this nota?')) {
    await notaStore.deleteNota(notaId)
    if (currentNotaId.value === notaId) {
      router.push('/')
    }
  }
}

// Keyboard shortcuts
onKeyStroke('n', (e) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    showNewNotaInput.value = true
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

      <!-- New Nota Button/Input -->
      <div>
        <Input
          v-if="showNewNotaInput"
          v-model="newNotaTitle"
          placeholder="New nota title..."
          class="text-sm"
          @keyup.enter="createNewNota"
          @keydown="handleKeydown"
          ref="newNotaInput"
          autofocus
        />
        <Button
          v-else
          @click="showNewNotaInput = true"
          class="w-full justify-start gap-2 text-sm"
          variant="default"
        >
          <PlusIcon class="h-3 w-3" />
          New Nota
        </Button>
      </div>
    </div>

    <!-- Nota List -->
    <div class="flex-1 overflow-y-auto p-4 space-y-1">
      <div v-for="nota in filteredNotas" :key="nota.id" class="group">
        <div class="flex items-center gap-1 rounded-md py-1.5 text-sm">
          <!-- Expand/Indent Button -->
          <button
            v-if="notaStore.getNotaPages(nota.id)?.length"
            @click="toggleNota(nota.id)"
            class="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ChevronDownIcon v-if="expandedNotas.has(nota.id)" class="h-4 w-4" />
            <ChevronRightIcon v-else class="h-4 w-4" />
          </button>
          <div v-else class="w-5"></div>

          <!-- Title/Rename Input -->
          <Input
            v-if="showRenameInput === nota.id"
            v-model="renameTitle"
            class="h-7 text-sm"
            @keyup.enter="handleRename(nota.id)"
            @keyup.esc="showRenameInput = null"
            @blur="handleRename(nota.id)"
            ref="renameInput"
            autofocus
          />
          <RouterLink
            v-else
            :to="`/nota/${nota.id}`"
            class="flex items-center gap-2 flex-1 px-2 py-2 rounded-md hover:bg-slate-200"
          >
            <!-- Nota Icon -->
            <FolderIcon
              v-if="notaStore.getNotaPages(nota.id)?.length"
              class="h-4 w-4 text-muted-foreground"
            />
            <DocumentTextIcon v-else class="h-4 w-4 text-muted-foreground" />
            {{ nota.title }}
          </RouterLink>

          <!-- Actions -->
          <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1 pr-1">
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              @click="startRename(nota)"
              title="Rename"
            >
              <PencilIcon class="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 hover:text-red-500"
              @click="handleDelete(nota.id)"
              title="Delete"
            >
              <TrashIcon class="h-3 w-3" />
            </Button>
          </div>
        </div>

        <!-- Page Tree -->
        <div v-if="expandedNotas.has(nota.id)" class="ml-6 mt-1">
          <PageTree :pages="notaStore.getNotaPages(nota.id)" />
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="filteredNotas.length === 0"
        class="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground gap-3"
      >
        <div class="rounded-full bg-muted/50 p-3">
          <FolderIcon v-if="!searchQuery" class="w-5 h-5" />
          <MagnifyingGlassIcon v-else class="w-5 h-5" />
        </div>
        {{ searchQuery ? 'No notas found' : 'Create your first nota' }}
      </div>
    </div>
  </div>
</template>
