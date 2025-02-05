<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useRouter } from 'vue-router'
import PageTreeItem from './PageTreeItem.vue'
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, TrashIcon, PencilIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  notaId: string
}>()

const store = useNotaStore()
const router = useRouter()
const isExpanded = ref(true)
const isEditing = ref(false)
const newTitle = ref('')

const openNota = () => {
  if (!isEditing.value && nota.value) {
    router.push(`/nota/${nota.value.id}`)
  }
}

const deleteNota = async (event: Event) => {
  event.stopPropagation()
  if (confirm('Are you sure you want to delete this nota?')) {
    await store.deleteNota(props.notaId)
    router.push('/')
  }
}

const nota = computed(() => {
  const notas = store.notas
  return notas.find(n => n.id === props.notaId)
})

const pages = computed(() => {
  if (!nota.value) return []
  return store.getNotaPages(props.notaId)
})

const startEditing = (event: Event) => {
  event.stopPropagation()
  newTitle.value = nota.value?.title || ''
  isEditing.value = true
  // Focus the input in the next tick after it's rendered
  nextTick(() => {
    const input = document.getElementById(`nota-rename-${props.notaId}`)
    input?.focus()
  })
}

const handleRename = async () => {
  if (newTitle.value.trim() && nota.value) {
    await store.renameNota(props.notaId, newTitle.value.trim())
    isEditing.value = false
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleRename()
  } else if (event.key === 'Escape') {
    isEditing.value = false
  }
}
</script>

<template>
  <div class="nota-tree-item" v-if="nota">
    <div 
      class="nota-item"
      :class="{ 'active': $route.params.id === nota.id }"
      @click="openNota"
    >
      <div class="nota-content">
        <button 
          v-if="pages.length"
          class="expand-button"
          @click.stop="isExpanded = !isExpanded"
        >
          <ChevronDownIcon v-if="isExpanded" style="width: 10px; height: 10px;" />
          <ChevronRightIcon v-else style="width: 10px; height: 10px;" />
        </button>
        <FolderIcon class="text-yellow-500" style="width: 12px; height: 12px;" />
        <div class="nota-title">
          <input
            v-if="isEditing"
            :id="`nota-rename-${notaId}`"
            v-model="newTitle"
            class="rename-input"
            @keydown="handleKeydown"
            @blur="handleRename"
            @click.stop
          />
          <span v-else>{{ nota.title }}</span>
        </div>
      </div>
      <div class="nota-actions">
        <button 
          class="action-button"
          @click="startEditing"
          title="Rename nota"
        >
          <PencilIcon style="width: 10px; height: 10px;" />
        </button>
        <button 
          class="action-button delete"
          @click="deleteNota"
          title="Delete nota"
        >
          <TrashIcon style="width: 10px; height: 10px;" />
        </button>
      </div>
    </div>
    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div v-if="isExpanded && pages.length" class="pages">
        <page-tree-item
          v-for="page in pages"
          :key="page.id"
          :page-id="page.id"
        />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.nota-tree-item {
  margin-bottom: 0.25rem;
}

.nota-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.nota-item:hover {
  background: var(--color-background-mute);
}

.nota-item.active {
  background: var(--color-background-mute);
}

.nota-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.nota-title {
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pages {
  margin-left: 1.75rem;
  border-left: 1px solid var(--color-border);
}

.expand-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.125rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-light);
  opacity: 0.75;
  transition: opacity 0.2s;
}

.expand-button:hover {
  opacity: 1;
}

.nota-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.nota-item:hover .nota-actions {
  opacity: 1;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--color-text-light);
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover {
  background: var(--color-background);
  color: var(--color-text);
}

.action-button.delete:hover {
  color: var(--color-danger);
}

.rename-input {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  width: 100%;
  min-width: 0;
}

.rename-input:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style> 