<script setup lang="ts">
import { useNotaStore } from '@/stores/nota'
import { ref, onMounted, onUnmounted } from 'vue'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
  DocumentTextIcon,
  PlusIcon,
  StarIcon,
} from '@heroicons/vue/24/solid'
import { useRouter } from 'vue-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { withDefaults } from 'vue'
import type { Nota } from '@/types/nota'
import { useFavoriteBlocksStore } from '@/stores/favoriteBlocksStore'
import Modal from './Modal.vue'
import type { Editor } from '@tiptap/vue-3'

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

const handleDelete = async (id: string) => {
  if (confirm('Are you sure you want to delete this item?')) {
    await store.deleteItem(id)
    router.push('/')
  }
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
    console.error('Editor is not initialized')
    return
  }
  const selectedContent = editor.value.getJSON()
  const content = selectedContent ? JSON.stringify(selectedContent) : ''
  favoriteBlocksStore.addBlock({
    name,
    content,
    type: 'block',
    tags: []
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
          <ChevronDownIcon v-if="expandedItems.has(item.id)" class="h-3 w-3" />
          <ChevronRightIcon v-else class="h-3 w-3" />
        </button>
        <div v-else class="w-4 flex-shrink-0"></div>

        <Input
          v-if="showRenameInput === item.id"
          :value="renameTitle"
          @input="(e: Event) => (renameTitle = (e.target as HTMLInputElement).value)"
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
          class="flex items-center gap-1.5 flex-1 px-1.5 py-0.5 rounded-sm hover:bg-slate-200/50 mr-1"
        >
          <FolderIcon
            v-if="hasChildren(item.id)"
            class="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"
          />
          <DocumentTextIcon v-else class="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span class="truncate min-w-0 flex-1">{{ item.title }}</span>
        </RouterLink>

        <div class="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            @click="emit('show-new-input', item.id)"
            title="Add Sub-Nota"
          >
            <PlusIcon class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            @click="startRename(item)"
            title="Rename"
          >
            <PencilIcon class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            @click="handleDelete(item.id)"
            title="Delete"
          >
            <TrashIcon class="h-3 w-3" />
          </Button>
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
              icon: PlusIcon,
              action: () => emit('show-new-input', item.id),
            },
            { label: 'Rename', icon: PencilIcon, action: () => startRename(item) },
            { label: 'Delete', icon: TrashIcon, action: () => handleDelete(item.id) },
            {
              label: item.favorite ? 'Remove Favorite' : 'Add Favorite',
              icon: StarIcon,
              action: () => store.toggleFavorite(item.id),
            },
            {
              label: 'Add to Favorites',
              icon: StarIcon,
              action: () => {
                isModalOpen = true
              }
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
          @input="(e: Event) => emit('update:newNotaTitle', (e.target as HTMLInputElement).value)"
          placeholder="New sub-nota title..."
          class="h-6 text-sm"
          @keyup.enter="emit('create', item.id)"
          @keyup.esc="emit('show-new-input', null)"
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
        />
      </div>
    </div>
  </div>

  <Modal
    :isOpen="isModalOpen"
    title="Enter a name for this block"
    @close="isModalOpen = false"
    @submit="handleModalSubmit"
  />
</template>

<style scoped>
.drag-over {
  @apply bg-accent/20;
}
</style>
