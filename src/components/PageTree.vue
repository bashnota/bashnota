<script setup lang="ts">
import { useNotaStore } from '@/stores/nota'
import type { Page } from '@/stores/nota'
import { ref } from 'vue'
import { ChevronDownIcon, ChevronRightIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/solid'
import { useRouter } from 'vue-router'

const props = defineProps<{
  pages: Page[]
}>()

const router = useRouter()
const store = useNotaStore()
const expandedPages = ref<Set<string>>(new Set())
const showRenameInput = ref<string | null>(null)
const renameTitle = ref('')

const hasChildren = (pageId: string) => {
  return store.pages.some(p => p.parentId === pageId)
}

const togglePage = (pageId: string) => {
  if (expandedPages.value.has(pageId)) {
    expandedPages.value.delete(pageId)
  } else {
    expandedPages.value.add(pageId)
  }
}

const startRename = (page: Page) => {
  showRenameInput.value = page.id
  renameTitle.value = page.title
}

const handleRename = async (pageId: string) => {
  if (!renameTitle.value.trim()) return
  await store.renamePage(pageId, renameTitle.value)
  showRenameInput.value = null
}

const handleDelete = async (pageId: string) => {
  if (confirm('Are you sure you want to delete this page?')) {
    await store.deletePage(pageId)
    router.push('/')
  }
}
</script>

<template>
  <div class="page-tree">
    <div v-for="page in pages" :key="page.id" class="page-item">
      <div class="page-header">
        <button 
          v-if="hasChildren(page.id)"
          class="expand-button"
          @click="togglePage(page.id)"
        >
          <ChevronDownIcon v-if="expandedPages.has(page.id)" class="icon" />
          <ChevronRightIcon v-else class="icon" />
        </button>
        <span v-else class="indent"></span>
        <template v-if="showRenameInput === page.id">
          <input
            v-model="renameTitle"
            class="rename-input"
            @keyup.enter="handleRename(page.id)"
            @keyup.esc="showRenameInput = null"
            @blur="handleRename(page.id)"
            ref="renameInput"
            autofocus
          />
        </template>
        <template v-else>
          <RouterLink :to="`/page/${page.id}`" class="page-link">
            {{ page.title }}
          </RouterLink>
          <div class="page-actions">
            <button 
              class="action-button"
              @click="startRename(page)"
              title="Rename"
            >
              <PencilIcon class="icon" />
            </button>
            <button 
              class="action-button"
              @click="handleDelete(page.id)"
              title="Delete"
            >
              <TrashIcon class="icon" />
            </button>
          </div>
        </template>
      </div>
      <div v-if="expandedPages.has(page.id)" class="sub-pages">
        <PageTree :pages="store.getPageChildren(page.id)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-tree {
  margin-left: 0.5rem;
}

.page-item {
  margin: 0.25rem 0;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  border-radius: 4px;
}

.page-header:hover {
  background: var(--color-background-mute);
}

.page-header:hover .page-actions {
  opacity: 1;
}

.page-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
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

.indent {
  width: 1.5rem;
}

.page-link {
  flex: 1;
  display: block;
  padding: 0.25rem 0.5rem;
  color: var(--color-text);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.page-link:hover {
  background: var(--color-background-mute);
}

.sub-pages {
  margin-left: 1.5rem;
  margin-top: 0.25rem;
}

.rename-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: 0.875rem;
  background: var(--color-background);
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
</style> 