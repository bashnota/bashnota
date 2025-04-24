<template>
  <div class="keyboard-shortcut text-xs text-muted-foreground p-2 border-t flex items-center justify-center">
    <span class="flex items-center gap-1">
      <kbd v-if="ctrl" class="keyboard-key">Ctrl</kbd>
      <kbd v-if="shift" class="keyboard-key">Shift</kbd>
      <kbd v-if="alt" class="keyboard-key">Alt</kbd>
      <kbd class="keyboard-key">{{ keyName }}</kbd>
      <span v-if="action">to {{ action }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
export interface KeyboardShortcutProps {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  keyName: string
  action?: string
}

const props = withDefaults(defineProps<KeyboardShortcutProps>(), {
  ctrl: false,
  shift: false,
  alt: false,
  action: ''
})
</script>

<style scoped>
.keyboard-key {
  display: inline-block;
  border: 1px solid rgba(var(--border), 0.8);
  border-radius: 3px;
  padding: 0 4px;
  font-family: monospace;
  font-size: 0.85rem;
  min-width: 1.25rem;
  text-align: center;
  box-shadow: 0 1px 0 rgba(var(--border), 1);
  margin: 0 1px;
}
</style>