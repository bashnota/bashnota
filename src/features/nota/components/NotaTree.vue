<script setup lang="ts">
import { useNotaStore } from '@/features/nota/stores/nota'
import { ref, onMounted, onUnmounted } from 'vue'
import {
  ChevronRight,
  FileText,
  Star,
  Plus
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { withDefaults } from 'vue'
import type { Nota } from '@/features/nota/types/nota'
import { useFavoriteBlocksStore } from '@/features/nota/stores/favoriteBlocksStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Editor } from '@tiptap/vue-3'
import { logger } from '@/services/logger'
import NotaEditMenu from '@/features/nota/components/NotaEditMenu.vue'

interface Props {
  items: Nota[]
  level?: number
  parentId?: string | null
  expandedItems: Set<string>
  showNewInput: string | null
  newNotaTitle: string
}

const emit = defineEmits<{
  toggle: [id: string]
  create: [parentId: string | null]
  'show-new-input': [id: string | null]
  'update:newNotaTitle': [value: string]
  'nota-updated': [nota: Nota]
  'nota-deleted': [id: string]
}>()

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  parentId: null,
  expandedItems: () => new Set(),
  showNewInput: null,
  newNotaTitle: '',
})

const router = useRouter()
const store = useNotaStore()
const favoriteBlocksStore = useFavoriteBlocksStore()
const showRenameInput = ref<string | null>(null)
const renameTitle = ref('')
const itemContextMenu = ref<string | null>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })
const editor = ref<Editor | null>(null)
const isModalOpen = ref(false)
const blockName = ref('')

const hasChildren = (id: string) => {
  return store.getChildren(id).length > 0
}

const toggleItem = (id: string) => {
  if (props.expandedItems.has(id)) {
    props.expandedItems.delete(id)
  } else {
    props.expandedItems.add(id)
  }
}

const startRename = (item: Nota) => {
  showRenameInput.value = item.id
  renameTitle.value = item.title
}

const handleRename = async (id: string) => {
  if (!renameTitle.value.trim()) return
  await store.renameItem(id, renameTitle.value)
  showRenameInput.value = null
}

const showContextMenu = (event: MouseEvent, item: Nota) => {
  event.preventDefault()
  itemContextMenu.value = item.id
  contextMenuPosition.value = {
    x: event.clientX,
    y: event.clientY,
  }
}

const closeContextMenu = () => {
  itemContextMenu.value = null
}

const handleModalSubmit = (name: string) => {
  if (!editor.value) {
    logger.error('Editor is not initialized')
    return
  }
  const selectedContent = editor.value.getJSON()
  const content = selectedContent ? JSON.stringify(selectedContent) : ''
  favoriteBlocksStore.addBlock({
    name,
    content,
    type: 'block',
    tags: [],
  })
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})
</script>

<template>
  <div :class="{ 'ml-3': level > 0 }">
    <div v-for="item in items" :key="item.id" class="group" draggable="true">
      <div
        class="flex items-center gap-1 rounded-sm py-1 text-sm hover:bg-muted/50 transition-colors"
        @contextmenu="showContextMenu($event, item)"
      >
        <button
          v-if="hasChildren(item.id)"
          @click="toggleItem(item.id)"
          class="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
        <div v-else class="w-4 flex-shrink-0"></div>

        <Input
          v-if="showRenameInput === item.id"
          :value="renameTitle"
          @input="renameTitle = ($event.target as HTMLInputElement).value"
          class="h-6 text-sm"
          @keyup.enter="handleRename(item.id)"
          @keyup.esc="showRenameInput = null"
          @blur="handleRename(item.id)"
          ref="renameInput"
          autofocus
        />
        <RouterLink
          v-else
          :to="`/nota/${item.id}`"
          class="flex items-center gap-1.5 min-w-0 flex-1 px-1.5 py-0.5 rounded-sm hover:bg-slate-200/50"
        >
          <FileText
            v-if="hasChildren(item.id)"
            class="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"
          />
          <span class="truncate overflow-hidden min-w-0 max-w-full">
            {{ item.title }}
          </span>
        </RouterLink>

        <div
          class="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 ml-auto"
        >
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            @click="emit('show-new-input', item.id)"
            title="Add Sub-Nota"
          >
            <Plus class="h-4 w-4" />
          </Button>
          <NotaEditMenu 
            :nota="item"
            size="sm"
            variant="ghost"
            @nota-updated="(nota) => emit('nota-updated', nota)"
            @nota-deleted="(id) => emit('nota-deleted', id)"
          />
        </div>
      </div>

      <!-- Context Menu -->
      <div
        v-if="itemContextMenu === item.id"
        class="fixed z-50 w-48 bg-popover rounded-md shadow-md border p-1"
        :style="{
          left: `${contextMenuPosition.x}px`,
          top: `${contextMenuPosition.y}px`,
        }"
      >
        <button
          v-for="action in [
            {
              label: 'New Sub-Nota',
              icon: Plus,
              action: () => emit('show-new-input', item.id),
            },
            {
              label: item.favorite ? 'Remove Favorite' : 'Add Favorite',
              icon: Star,
              action: () => store.toggleFavorite(item.id),
            },
          ]"
          :key="action.label"
          class="flex items-center text-start w-full gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent"
          @click="action.action"
        >
          <component :is="action.icon" class="h-4 w-4" />
          {{ action.label }}
        </button>
      </div>

      <!-- New Sub-Nota Input -->
      <div v-if="showNewInput === item.id" class="ml-7 mt-0.5">
        <Input
          :value="newNotaTitle"
          @input="$emit('update:newNotaTitle', ($event.target as HTMLInputElement).value)"
          placeholder="New sub-nota title..."
          class="h-6 text-sm"
          @keyup.enter="$emit('create', item.id)"
          @keyup.esc="$emit('show-new-input', null)"
          autofocus
        />
      </div>

      <div v-if="expandedItems.has(item.id)" class="ml-3">
        <NotaTree
          :items="store.getChildren(item.id)"
          :level="level + 1"
          :parent-id="item.id"
          :expanded-items="expandedItems"
          :show-new-input="showNewInput"
          :new-nota-title="newNotaTitle"
          @toggle="(id) => emit('toggle', id)"
          @create="(id) => emit('create', id)"
          @show-new-input="(id) => emit('show-new-input', id)"
          @update:new-nota-title="(value) => emit('update:newNotaTitle', value)"
          @nota-updated="(nota) => emit('nota-updated', nota)"
          @nota-deleted="(id) => emit('nota-deleted', id)"
        />
      </div>
    </div>
  </div>

  <Dialog :open="isModalOpen" @update:open="isModalOpen = $event">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Enter a name for this block</DialogTitle>
      </DialogHeader>
      <div class="space-y-4">
        <Input
          v-model="blockName"
          placeholder="Block name"
          @keyup.enter="handleModalSubmit(blockName)"
        />
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="isModalOpen = false">Cancel</Button>
          <Button @click="handleModalSubmit(blockName)">Submit</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.drag-over {
  background-color: hsl(var(--accent) / 0.2);
}
</style>









