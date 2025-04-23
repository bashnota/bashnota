<template>
  <div class="keyboard-shortcut px-3 py-2 text-[10px] text-muted-foreground border-t bg-background">
    Press 
    <template v-for="(key, index) in displayKeys" :key="index">
      <kbd class="px-1 py-0.5 rounded bg-muted">{{ key }}</kbd>
      <template v-if="index < displayKeys.length - 1"> + </template>
    </template>
    to {{ action }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface KeyboardShortcutProps {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  keyName: string  // Changed from 'key' to 'keyName' to avoid using reserved property name
  action: string
}

const props = withDefaults(defineProps<KeyboardShortcutProps>(), {
  ctrl: false,
  shift: false,
  alt: false,
  action: 'toggle'
})

const displayKeys = computed(() => {
  const keys: string[] = []
  if (props.ctrl) keys.push('Ctrl')
  if (props.shift) keys.push('Shift')
  if (props.alt) keys.push('Alt')
  
  // Check if props.keyName is defined before calling toUpperCase()
  if (props.keyName) {
    keys.push(props.keyName.toUpperCase())
  }
  return keys
})
</script>