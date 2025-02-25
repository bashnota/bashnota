<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogPanel } from '@headlessui/vue'

const isOpen = ref(false)

const shortcuts = [
  { key: '⌘ K', description: 'Open global search' },
  { key: '⌘ N', description: 'Create new nota' },
  { key: '⌘ /', description: 'Focus editor' },
  { key: '/', description: 'Open commands menu (in editor)' },
  { key: '⌘ B', description: 'Bold text (in editor)' },
  { key: '⌘ I', description: 'Italic text (in editor)' },
  { key: 'Esc', description: 'Close dialogs / Cancel editing' },
]

const blockShortcuts = [
  { key: 'Ctrl+Shift+Alt+C', description: 'Insert code block' },
  { key: 'Ctrl+Shift+Alt+T', description: 'Insert table' },
  { key: 'Ctrl+Shift+Alt+I', description: 'Insert image' },
  { key: 'Ctrl+Shift+Alt+M', description: 'Insert math block' },
  { key: 'Ctrl+Shift+Alt+D', description: 'Insert Mermaid diagram' },
  { key: 'Ctrl+Shift+Alt+Y', description: 'Insert YouTube video' },
  { key: 'Ctrl+Shift+Alt+S', description: 'Insert scatter plot' },
  { key: 'Ctrl+Shift+Alt+F', description: 'Insert subfigures' },
  { key: 'Ctrl+Shift+Alt+H', description: 'Insert horizontal rule' },
  { key: 'Ctrl+Shift+Alt+Q', description: 'Insert blockquote' },
  { key: 'Ctrl+Shift+Alt+K', description: 'Insert task list' },
  { key: 'Ctrl+Shift+Alt+G', description: 'Insert Draw.io diagram' },
  { key: 'Ctrl+Shift+Alt+B', description: 'Insert data table' },
]

defineExpose({ isOpen })
</script>

<template>
  <Dialog :open="isOpen" @close="isOpen = false" class="shortcuts-dialog">
    <div class="dialog-backdrop" aria-hidden="true" />
    <DialogPanel class="dialog-panel">
      <h2>Keyboard Shortcuts</h2>
      
      <h3 class="text-lg font-medium mt-4 mb-2">General</h3>
      <div class="shortcuts-grid">
        <div v-for="shortcut in shortcuts" :key="shortcut.key" class="shortcut">
          <kbd>{{ shortcut.key }}</kbd>
          <span>{{ shortcut.description }}</span>
        </div>
      </div>
      
      <h3 class="text-lg font-medium mt-6 mb-2">Insert Blocks</h3>
      <div class="shortcuts-grid">
        <div v-for="shortcut in blockShortcuts" :key="shortcut.key" class="shortcut">
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
