<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogPanel } from '@headlessui/vue'
import { useShortcutsStore } from '@/stores/shortcutsStore'

const isOpen = ref(false)
const shortcutsStore = useShortcutsStore()

// Use shortcuts directly from the store
const generalShortcuts = computed(() => shortcutsStore.generalShortcuts)
const blockShortcuts = computed(() => shortcutsStore.blockShortcuts)

defineExpose({ isOpen })
</script>

<template>
  <Dialog :open="isOpen" @close="isOpen = false" class="shortcuts-dialog">
    <div class="dialog-backdrop" aria-hidden="true" />
    <DialogPanel class="dialog-panel">
      <h2>Keyboard Shortcuts</h2>
      
      <h3 class="text-lg font-medium mt-4 mb-2">General</h3>
      <div class="shortcuts-grid">
        <div v-for="shortcut in generalShortcuts" :key="shortcut.id" class="shortcut">
          <kbd>{{ shortcut.key }}</kbd>
          <span>{{ shortcut.description }}</span>
        </div>
      </div>
      
      <h3 class="text-lg font-medium mt-6 mb-2">Insert Blocks</h3>
      <div class="shortcuts-grid">
        <div v-for="shortcut in blockShortcuts" :key="shortcut.id" class="shortcut">
          <kbd>{{ shortcut.key }}</kbd>
          <span>{{ shortcut.description }}</span>
        </div>
      </div>
      
      <button @click="isOpen = false" class="close-button mt-6">Close</button>
    </DialogPanel>
  </Dialog>
</template>

<style scoped>
.shortcuts-dialog {
  @apply fixed inset-0 z-50 flex items-center justify-center;
}

.dialog-backdrop {
  @apply fixed inset-0 bg-background/80 backdrop-blur-sm;
}

.dialog-panel {
  @apply w-full max-w-md rounded-lg border bg-card p-6 shadow-lg max-h-[80vh] overflow-y-auto;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--color-heading);
}

.shortcuts-grid {
  display: grid;
  gap: 0.75rem;
}

.shortcut {
  display: flex;
  align-items: center;
  gap: 1rem;
}

kbd {
  padding: 0.25rem 0.5rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-family: monospace;
  min-width: 3rem;
  text-align: center;
}

.close-button {
  @apply mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90;
}
</style>









