<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useResizableSidebar } from '@/composables/useResizableSidebar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BaseSidebar } from '@/components/ui/sidebar'

const props = defineProps<{
  title?: string;
  storageKey?: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: 'left' | 'right';
  icon?: any;
}>()

const emit = defineEmits<{
  close: [],
  resize: [number]
}>()

// Default values
const storageKey = props.storageKey || `sidebar-${props.title?.toLowerCase() || 'default'}`
const defaultWidth = props.defaultWidth || 350
const minWidth = props.minWidth || 250
const maxWidth = props.maxWidth || 800
const position = props.position || 'right'

// Use our existing sidebar composable with proper configuration
const { 
  constrainedWidth, 
  startResizing,
  isResizing,
  sidebarWidth
} = useResizableSidebar({
  defaultWidth,
  minWidth,
  maxWidth,
  storageKey,
  position,
  onWidthChange: (width) => emit('resize', width)
})

// Position-based classes and styles
const handlePosition = computed(() => position === 'left' ? 'right' : 'left')
const sidebarClasses = computed(() => ({
  'h-full flex-shrink-0 flex flex-col bg-background': true,
  'border-l': position === 'right',
  'border-r': position === 'left'
}))

const handleClasses = computed(() => ({
  'sidebar-resize-handle': true,
  'resizing': isResizing,
  'left-0': position === 'right', 
  'right-0': position === 'left'
}))

const onClose = () => emit('close')

// Watch for props change and update the width
watch(() => props.defaultWidth, (newWidth) => {
  if (newWidth && sidebarWidth.value !== newWidth) {
    // Only update if different to avoid loops
    sidebarWidth.value = newWidth
  }
}, { immediate: true })
</script>

<template>
  <BaseSidebar 
    :position="position"
    :width="constrainedWidth"
    :className="position === 'right' ? 'border-l' : 'border-r'"
    :icon="icon"
  >
    <!-- Resize handle -->
    <div 
      :class="handleClasses" 
      @mousedown="startResizing"
    ></div>
    
    <slot></slot>
  </BaseSidebar>
</template>

<style>
.sidebar-resize-handle {
  position: absolute;
  top: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
  background-color: transparent;
  transition: background-color 0.2s;
  z-index: 10;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle.resizing {
  background-color: rgba(0, 0, 0, 0.1);
}
</style>