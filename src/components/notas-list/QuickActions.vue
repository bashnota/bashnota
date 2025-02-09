<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogPanel } from '@headlessui/vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import {
  DocumentPlusIcon,
  FolderPlusIcon,
  Cog6ToothIcon,
  KeyIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const router = useRouter()
const store = useNotaStore()
const searchQuery = ref('')
const selectedIndex = ref(0)

const actions = [
  {
    id: 'new-nota',
    name: 'New Nota',
    icon: FolderPlusIcon,
    shortcut: '⌘N',
    action: async () => {
      const nota = await store.createNota('Untitled Nota')
      router.push(`/nota/${nota.id}`)
      emit('close')
    },
  },
  {
    id: 'new-page',
    name: 'New Page',
    icon: DocumentPlusIcon,
    shortcut: '⌘P',
    action: () => {
      // Implement new page creation
      emit('close')
    },
  },
  {
    id: 'toggle-theme',
    name: 'Toggle Theme',
    icon: computed(() => (isDark.value ? SunIcon : MoonIcon)),
    shortcut: '⌘K ⌘T',
    action: () => {
      // Implement theme toggle
      emit('close')
    },
  },
  {
    id: 'keyboard-shortcuts',
    name: 'Keyboard Shortcuts',
    icon: KeyIcon,
    shortcut: '⌘/',
    action: () => {
      // Show keyboard shortcuts
      emit('close')
    },
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Cog6ToothIcon,
    shortcut: '⌘,',
    action: () => {
      // Open settings
      emit('close')
    },
  },
]

const filteredActions = computed(() => {
  if (!searchQuery.value) return actions
  const query = searchQuery.value.toLowerCase()
  return actions.filter((action) => action.name.toLowerCase().includes(query))
})

const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % filteredActions.value.length
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value =
        selectedIndex.value - 1 < 0 ? filteredActions.value.length - 1 : selectedIndex.value - 1
      break
    case 'Enter':
      event.preventDefault()
      const selected = filteredActions.value[selectedIndex.value]
      if (selected) selected.action()
      break
    case 'Escape':
      event.preventDefault()
      emit('close')
      break
  }
}
</script>

<template>
  <Dialog :open="isOpen" @close="emit('close')" class="quick-actions">
    <div class="dialog-backdrop" aria-hidden="true" />
    <DialogPanel class="dialog-panel">
      <input
        v-model="searchQuery"
        placeholder="Type a command or search..."
        class="search-input"
        @keydown="handleKeydown"
        autofocus
      />
      <div class="actions-list">
        <button
          v-for="(action, index) in filteredActions"
          :key="action.id"
          class="action-item"
          :class="{ selected: index === selectedIndex }"
          @click="action.action"
        >
          <component :is="action.icon" class="icon" />
          <span class="name">{{ action.name }}</span>
          <span class="shortcut">{{ action.shortcut }}</span>
        </button>
      </div>
    </DialogPanel>
  </Dialog>
</template>

<style scoped>
.quick-actions {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: start;
  justify-content: center;
  padding-top: 10vh;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
}

.dialog-panel {
  position: relative;
  background: var(--color-background);
  width: 90%;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.search-input {
  width: 100%;
  padding: 1rem;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
  font-size: 1rem;
}

.search-input:focus {
  outline: none;
}

.actions-list {
  max-height: 300px;
  overflow-y: auto;
}

.action-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.action-item:hover,
.action-item.selected {
  background: var(--color-background-mute);
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-text-light);
  margin-right: 0.75rem;
}

.name {
  flex: 1;
  text-align: left;
}

.shortcut {
  font-size: 0.875rem;
  color: var(--color-text-light);
  font-family: monospace;
}
</style>
