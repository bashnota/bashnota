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

defineExpose({ isOpen })
</script>

<template>
  <Dialog :open="isOpen" @close="isOpen = false" class="shortcuts-dialog">
    <div class="dialog-backdrop" aria-hidden="true" />
    <DialogPanel class="dialog-panel">
      <h2>Keyboard Shortcuts</h2>
      <div class="shortcuts-grid">
        <div v-for="shortcut in shortcuts" :key="shortcut.key" class="shortcut">
          <kbd>{{ shortcut.key }}</kbd>
          <span>{{ shortcut.description }}</span>
        </div>
      </div>
      <button @click="isOpen = false" class="close-button">Close</button>
    </DialogPanel>
  </Dialog>
</template>

<style scoped>
.shortcuts-dialog {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--color-heading);
}

.shortcuts-grid {
  display: grid;
  gap: 1rem;
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
  margin-top: 1.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
}

.close-button:hover {
  background: var(--color-background-mute);
}
</style>
