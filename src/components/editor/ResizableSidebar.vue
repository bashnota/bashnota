<script setup lang="ts">
import { computed } from 'vue'
import { BaseSidebar } from '@/components/ui/sidebar'

const props = defineProps<{
  title?: string;
  storageKey?: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: 'left' | 'right';
  icon?: any;
  resizable?: boolean;
}>()

const emit = defineEmits<{
  close: [],
  resize: [number]
}>()

// Generate a consistent storage key
const computedStorageKey = computed(() => {
  return props.storageKey || `sidebar-${props.title?.toLowerCase() || 'default'}`
})

const onClose = () => emit('close')
</script>

<template>
  <BaseSidebar 
    :position="position"
    :width="defaultWidth"
    :className="position === 'right' ? 'border-l' : 'border-r'"
    :icon="icon"
    :resizable="resizable !== false"
    :min-width="minWidth"
    :max-width="maxWidth"
    :storage-key="computedStorageKey"
    :default-width="defaultWidth"
    @resize="(width) => emit('resize', width)"
  >
    <slot></slot>
  </BaseSidebar>
</template>