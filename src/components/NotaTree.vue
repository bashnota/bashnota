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
const showRenameInput = ref<string | null>(null)
const renameTitle = ref('')
const itemContextMenu = ref<string | null>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })

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

const handleDrop = (event: DragEvent, targetId: string) => {
  const sourceId = event.dataTransfer?.getData('text/plain')
  if (sourceId && sourceId !== targetId) {
    store.moveItem(sourceId, targetId)
  }
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})
</script>

<template>
  <div :class="{ 'ml-4': level > 0 }">
    <div
      v-for="item in items"
      :key="item.id"
      class="group"
      draggable="true"
      @dragstart="(event) => event.dataTransfer?.setData('text/plain', item.id)"
      @dragover.prevent
      @drop="(event) => handleDrop(event, item.id)"
    >
      <div
        class="flex items-center gap-1 rounded-md py-1.5 text-sm"
        @contextmenu="showContextMenu($event, item)"
      >
        <button
          v-if="hasChildren(item.id)"
          @click="toggleItem(item.id)"
          class="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <ChevronDownIcon v-if="expandedItems.has(item.id)" class="h-4 w-4" />
          <ChevronRightIcon v-else class="h-4 w-4" />
        </button>
        <div v-else class="w-5 flex-shrink-0"></div>

        <Input
          v-if="showRenameInput === item.id"
          :value="renameTitle"
          @input="(e: Event) => (renameTitle = (e.target as HTMLInputElement).value)"
          class="h-7 text-sm"
          @keyup.enter="handleRename(item.id)"
          @keyup.esc="showRenameInput = null"
          @blur="handleRename(item.id)"
          ref="renameInput"
          autofocus
        />
        <RouterLink
          v-else
          :to="`/nota/${item.id}`"
          class="flex items-center gap-2 flex-1 px-2 py-2 rounded-md hover:bg-slate-200 mr-2"
        >
          <FolderIcon
            v-if="hasChildren(item.id)"
            class="h-4 w-4 text-muted-foreground flex-shrink-0"
          />
          <DocumentTextIcon v-else class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span class="truncate min-w-0 flex-1">{{ item.title }}</span>
        </RouterLink>

        <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7"
            @click="emit('show-new-input', item.id)"
            title="Add Sub-Nota"
          >
            <PlusIcon class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7"
            @click="startRename(item)"
            title="Rename"
          >
            <PencilIcon class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7"
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
              label: 'Toggle Favorite',
              icon: StarIcon,
              action: () => store.toggleFavorite(item.id),
            },
          ]"
          :key="action.label"
          class="flex items-center w-full gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent"
          @click="action.action"
        >
          <component :is="action.icon" class="h-4 w-4" />
          {{ action.label }}
        </button>
      </div>

      <!-- New Sub-Nota Input -->
      <div v-if="showNewInput === item.id" class="ml-8 mt-1">
        <Input
          :value="newNotaTitle"
          @input="(e: Event) => emit('update:newNotaTitle', (e.target as HTMLInputElement).value)"
          placeholder="New sub-nota title..."
          class="text-sm"
          @keyup.enter="emit('create', item.id)"
          @keyup.esc="emit('show-new-input', null)"
          autofocus
        />
      </div>

      <div v-if="expandedItems.has(item.id)" class="ml-4">
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
</template>

<style scoped>
.drag-over {
  @apply bg-accent/20;
}
</style>
