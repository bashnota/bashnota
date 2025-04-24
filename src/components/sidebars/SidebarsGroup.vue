<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  position?: 'left' | 'right';
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  icon?: any;
}>()

const emit = defineEmits<{
  close: [],
  resize: [number]
}>()

// Default values if not provided in props
const DEFAULT_MIN_WIDTH = 250;
const DEFAULT_MAX_WIDTH = 600;

// Use computed for actual width to apply constraints if needed
const effectiveWidth = computed(() => {
  // Don't use a default width - let the parent control it
  if (!props.width) return null;
  const min = props.minWidth || DEFAULT_MIN_WIDTH;
  const max = props.maxWidth || DEFAULT_MAX_WIDTH;
  return Math.max(min, Math.min(max, props.width));
})

// Resize functionality
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);
const containerRef = ref<HTMLElement | null>(null);

const onResizeStart = (e: MouseEvent) => {
  isResizing.value = true;
  startX.value = e.clientX;
  startWidth.value = containerRef.value?.offsetWidth || effectiveWidth.value || DEFAULT_MIN_WIDTH;
  document.body.classList.add('sidebar-resizing');
  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
};

const onResizeMove = (e: MouseEvent) => {
  if (!isResizing.value) return;
  
  const delta = props.position === 'right' 
    ? startX.value - e.clientX 
    : e.clientX - startX.value;
  
  const newWidth = startWidth.value + delta;
  // Only apply constraints if min/max are provided
  let constrainedWidth = newWidth;
  
  if (props.minWidth || props.maxWidth) {
    const min = props.minWidth || DEFAULT_MIN_WIDTH;
    const max = props.maxWidth || DEFAULT_MAX_WIDTH;
    constrainedWidth = Math.max(min, Math.min(max, newWidth));
  }
  
  // Emit the new width for parent to store
  emit('resize', constrainedWidth);
};

const onResizeEnd = () => {
  isResizing.value = false;
  document.body.classList.remove('sidebar-resizing');
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
};

onMounted(() => {
  // No need to set width directly - let the template binding handle it
});

onBeforeUnmount(() => {
  // Clean up event listeners
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
  document.body.classList.remove('sidebar-resizing');
});
</script>

<template>
  <div 
    ref="containerRef"
    class="sidebars-group h-full border flex-shrink-0 flex flex-col bg-background relative p-0 m-0 overflow-hidden"
    :class="[
      position === 'right' ? 'border-l' : 'border-r',
      className
    ]"
    :style="effectiveWidth ? { width: `${effectiveWidth}px` } : { width: '100%' }"
  >
    <!-- Resize handle -->
    <div 
      class="resize-handle" 
      :class="{
        'resize-handle-left': position === 'right',
        'resize-handle-right': position === 'left',
        'resizing': isResizing
      }"
      @mousedown="onResizeStart"
    ></div>
    
    <!-- Pass all content directly to the slot with full height and width -->
    <div class="sidebar-content-wrapper h-full w-full flex flex-col overflow-hidden">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.sidebars-group {
  position: relative;
  max-height: 100vh;
  box-sizing: border-box;
}

.sidebar-content-wrapper {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebars-group > :deep(*) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

/* Make sure all direct children of the sidebar take full height and width */
.sidebars-group > :deep(*) {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.sidebars-group > :deep(.flex-1) {
  flex: 1 1 auto;
  height: 100%;
  width: 100%;
}

/* Ensure all content containers fill their space */
.sidebars-group :deep(.flex-col) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Make scrollable areas take remaining space */
.sidebars-group :deep(.overflow-auto),
.sidebars-group :deep(.overflow-y-auto) {
  flex: 1;
  min-height: 0;
}

.resize-handle {
  position: absolute;
  top: 0;
  height: 100%;
  width: 4px;
  cursor: ew-resize;
  background-color: transparent;
  z-index: 10;
  transition: background-color 0.2s;
}

.resize-handle-left {
  left: 0;
}

.resize-handle-right {
  right: 0;
}

.resize-handle:hover,
.resize-handle.resizing {
  background-color: rgba(0, 0, 0, 0.1);
}

:global(body.sidebar-resizing) {
  cursor: ew-resize !important;
  user-select: none !important;
}
</style>
