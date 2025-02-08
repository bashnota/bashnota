<script setup lang="ts">
import { useNotaStore } from '@/stores/nota'
import type { Page } from '@/stores/nota'
import { ref } from 'vue'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
  DocumentTextIcon,
} from '@heroicons/vue/24/solid'
import { useRouter } from 'vue-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

defineProps<{
  pages: Page[]
}>()

const router = useRouter()
const store = useNotaStore()
const expandedPages = ref<Set<string>>(new Set())
const showRenameInput = ref<string | null>(null)
const renameTitle = ref('')

const hasChildren = (pageId: string) => {
  return store.pages.some((p) => p.parentId === pageId)
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
  <div class="ml-1">
    <div v-for="page in pages" :key="page.id" class="group">
      <div class="flex items-center gap-1 rounded-md py-1.5 text-sm">
        <!-- Expand/Indent Button -->
        <button
          v-if="hasChildren(page.id)"
          @click="togglePage(page.id)"
          class="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronDownIcon v-if="expandedPages.has(page.id)" class="h-4 w-4" />
          <ChevronRightIcon v-else class="h-4 w-4" />
        </button>
        <div v-else class="w-5"></div>

        <!-- Title/Rename Input -->
        <Input
          v-if="showRenameInput === page.id"
          v-model="renameTitle"
          class="h-7 text-sm"
          @keyup.enter="handleRename(page.id)"
          @keyup.esc="showRenameInput = null"
          @blur="handleRename(page.id)"
          ref="renameInput"
          autofocus
        />
        <RouterLink
          v-else
          :to="`/page/${page.id}`"
          class="flex items-center gap-2 flex-1 px-2 py-2 rounded-md hover:bg-slate-200"
        >
          <!-- Nota Icon -->
          <FolderIcon v-if="expandedPages.has(page.id)" class="h-4 w-4 text-muted-foreground" />
          <DocumentTextIcon v-else class="h-4 w-4 text-muted-foreground" />
          {{ page.title }}
        </RouterLink>

        <!-- Actions -->
        <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1 pr-1">
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7"
            @click="startRename(page)"
            title="Rename"
          >
            <PencilIcon class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7"
            @click="handleDelete(page.id)"
            title="Delete"
          >
            <TrashIcon class="h-3 w-3" />
          </Button>
        </div>
      </div>

      <!-- Nested Pages -->
      <div v-if="expandedPages.has(page.id)" class="ml-6 mt-1">
        <PageTree :pages="store.getPageChildren(page.id)" />
      </div>
    </div>
  </div>
</template>
