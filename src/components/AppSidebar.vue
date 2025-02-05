<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { onKeyStroke } from '@vueuse/core'
import PageTree from './PageTree.vue'
import DarkModeToggle from './DarkModeToggle.vue'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/solid'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'

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
  return notaStore.notas.filter(nota => 
    nota.title.toLowerCase().includes(query)
  )
})

const notaPages = computed(() => {
  return notaStore.notas.map(nota => ({
    nota,
    pages: notaStore.getNotaPages(nota.id)
  })).filter(item => item.pages.length > 0)
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

const openNota = (id: string) => {
  router.push(`/nota/${id}`)
}

const toggleNota = (notaId: string) => {
  if (expandedNotas.value.has(notaId)) {
    expandedNotas.value.delete(notaId)
  } else {
    expandedNotas.value.add(notaId)
  }
}

const startRename = (nota: { id: string, title: string }) => {
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
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="header-top">
        <h1 class="app-title">BashNota</h1>
        <DarkModeToggle />
      </div>
      
      <!-- Search Bar -->
      <div class="search-bar">
        <MagnifyingGlassIcon class="search-icon" style="width: 12px; height: 12px;" />
        <input
          v-model="searchQuery"
          placeholder="Search notas..."
          class="search-input"
        />
      </div>
      
      <!-- New Nota Button/Input -->
      <div class="new-nota-section">
        <template v-if="showNewNotaInput">
          <input
            v-model="newNotaTitle"
            placeholder="New nota title..."
            class="new-nota-input"
            @keyup.enter="createNewNota"
            @keydown="handleKeydown"
            ref="newNotaInput"
            autofocus
          />
        </template>
        <button 
          v-else
          class="new-nota-button"
          @click="showNewNotaInput = true"
        >
          <PlusIcon style="width: 12px; height: 12px;" />
          <span>New Nota</span>
        </button>
      </div>
    </div>

    <!-- Nota List -->
    <div class="nota-list">
      <div v-for="nota in filteredNotas" :key="nota.id" class="nota-item">
        <div class="nota-header">
          <button 
            class="expand-button"
            @click="toggleNota(nota.id)"
            v-if="notaStore.getNotaPages(nota.id)?.length"
          >
            <ChevronDownIcon v-if="expandedNotas.has(nota.id)" class="icon" />
            <ChevronRightIcon v-else class="icon" />
          </button>
          <span v-else class="indent"></span>
          <template v-if="showRenameInput === nota.id">
            <input
              v-model="renameTitle"
              class="rename-input"
              @keyup.enter="handleRename(nota.id)"
              @keyup.esc="showRenameInput = null"
              @blur="handleRename(nota.id)"
              ref="renameInput"
              autofocus
            />
          </template>
          <template v-else>
            <RouterLink :to="`/nota/${nota.id}`" class="nota-link">
              {{ nota.title }}
            </RouterLink>
            <div class="nota-actions">
              <button 
                class="action-button"
                @click="startRename(nota)"
                title="Rename"
              >
                <PencilIcon class="icon" />
              </button>
              <button 
                class="action-button"
                @click="handleDelete(nota.id)"
                title="Delete"
              >
                <TrashIcon class="icon" />
              </button>
            </div>
          </template>
        </div>
        <div v-if="expandedNotas.has(nota.id)" class="page-list">
          <PageTree :pages="notaStore.getNotaPages(nota.id)" />
        </div>
      </div>
      <div v-if="filteredNotas.length === 0" class="empty-state">
        <p v-if="searchQuery">No notas found</p>
        <p v-else>Create your first nota</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-background-soft);
  height: 100%;
  width: 300px;
  border-right: 1px solid var(--color-border);
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
}

.search-bar {
  position: relative;
  margin-bottom: 1rem;
}

.search-icon {
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-light);
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 1.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  font-size: 0.875rem;
}

.new-nota-section {
  margin-bottom: 1rem;
}

.new-nota-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.new-nota-button:hover {
  background: var(--color-primary-dark);
}

.new-nota-input {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.875rem;
}

.nota-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-light);
}

/* Custom scrollbar */
.nota-list::-webkit-scrollbar {
  width: 6px;
}

.nota-list::-webkit-scrollbar-track {
  background: transparent;
}

.nota-list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.nota-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-light);
}

.nota-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  border-radius: 4px;
}

.nota-header:hover {
  background: var(--color-background-mute);
}

.nota-header:hover .nota-actions {
  opacity: 1;
}

.nota-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.action-button {
  padding: 0.25rem;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--color-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-button:hover {
  color: var(--color-text);
  background: var(--color-background);
}

.action-button .icon {
  width: 1rem;
  height: 1rem;
}

.rename-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: 0.875rem;
  background: var(--color-background);
}

.expand-button {
  padding: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-button:hover {
  color: var(--color-text);
}

.expand-button .icon {
  width: 1rem;
  height: 1rem;
}

.nota-item {
  margin-bottom: 0.5rem;
}

.nota-link {
  flex: 1;
  display: block;
  padding: 0.25rem 0.5rem;
  color: var(--color-text);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.nota-link:hover {
  background: var(--color-background-mute);
}

.page-list {
  margin-left: 1.5rem;
  margin-top: 0.25rem;
}
</style>
