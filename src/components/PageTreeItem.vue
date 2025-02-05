<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useRouter } from 'vue-router'
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  DocumentTextIcon,
  TrashIcon,
  PlusIcon,
  PencilIcon
} from '@heroicons/vue/24/outline'
import {
  ChevronDownIcon as ChevronDownIconSolid,
  ChevronRightIcon as ChevronRightIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  TrashIcon as TrashIconSolid,
  PlusIcon as PlusIconSolid
} from '@heroicons/vue/24/solid'

const props = defineProps<{
  pageId: string
}>()

const store = useNotaStore()
const router = useRouter()
const isExpanded = ref(true)
const showNewPageInput = ref(false)
const newPageTitle = ref('')
const isEditing = ref(false)
const newTitle = ref('')

const page = computed(() => store.getCurrentPage(props.pageId))
const children = computed(() => store.getPageChildren(props.pageId))

const openPage = () => {
  if (page.value) {
    router.push(`/page/${page.value.id}`)
  }
}

const deletePage = async (event: Event) => {
  event.stopPropagation()
  if (page.value && confirm('Are you sure you want to delete this page?')) {
    await store.deletePage(page.value.id)
    router.push('/')
  }
}

const createNewPage = async () => {
  if (!newPageTitle.value.trim() || !page.value) return
  
  const newPage = await store.createPage(newPageTitle.value, page.value.id)
  newPageTitle.value = ''
  showNewPageInput.value = false
  isExpanded.value = true
  router.push(`/page/${newPage.id}`)
}

const startEditing = (event: Event) => {
  event.stopPropagation()
  newTitle.value = page.value?.title || ''
  isEditing.value = true
  nextTick(() => {
    const input = document.getElementById(`page-rename-${props.pageId}`)
    input?.focus()
  })
}

const handleRename = async () => {
  if (newTitle.value.trim() && page.value) {
    await store.renamePage(props.pageId, newTitle.value.trim())
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
  <div class="page-tree-item" v-if="page">
    <div 
      class="page-item"
      :class="{ 'active': $route.params.id === page.id }"
      @click="openPage"
    >
      <div class="page-content">
        <button 
          v-if="children.length"
          class="expand-button"
          @click.stop="isExpanded = !isExpanded"
        >
          <ChevronDownIcon v-if="isExpanded" style="width: 10px; height: 10px;" />
          <ChevronRightIcon v-else style="width: 10px; height: 10px;" />
        </button>
        <DocumentTextIcon class="text-blue-500" style="width: 12px; height: 12px;" />
        <div class="page-title">
          <input
            v-if="isEditing"
            :id="`page-rename-${pageId}`"
            v-model="newTitle"
            class="rename-input"
            @keydown="handleKeydown"
            @blur="handleRename"
            @click.stop
          />
          <span v-else>{{ page.title }}</span>
        </div>
      </div>
      <div class="page-actions">
        <button 
          class="action-button"
          @click.stop="showNewPageInput = true"
          title="Add sub-page"
        >
          <PlusIcon style="width: 10px; height: 10px;" />
        </button>
        <button 
          class="action-button delete"
          @click="deletePage"
          title="Delete page"
        >
          <TrashIcon style="width: 10px; height: 10px;" />
        </button>
        <button 
          class="action-button"
          @click="startEditing"
          title="Rename page"
        >
          <PencilIcon style="width: 10px; height: 10px;" />
        </button>
      </div>
    </div>

    <!-- New Page Input -->
    <div v-if="showNewPageInput" class="new-page-input-container" @click.stop>
      <input
        v-model="newPageTitle"
        placeholder="New page title..."
        class="new-page-input"
        @keyup.enter="createNewPage"
        @keydown="handleKeydown"
        ref="newPageInput"
        autofocus
      />
    </div>

    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div v-if="isExpanded && children.length" class="children">
        <page-tree-item
          v-for="child in children"
          :key="child.id"
          :page-id="child.id"
        />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.page-tree-item {
  margin-bottom: 0.25rem;
}

.page-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.page-item:hover {
  background: var(--color-background-mute);
}

.page-item.active {
  background: var(--color-background-mute);
}

.page-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.page-title {
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.children {
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

.page-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.page-item:hover .page-actions {
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

.new-page-input-container {
  padding: 0.5rem 0.5rem 0.5rem 2.25rem;
}

.new-page-input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 2px solid var(--color-primary);
  border-radius: 4px;
  font-size: 0.875rem;
  background: var(--color-background);
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