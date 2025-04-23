<template>
  <div 
    class="sidebar-container h-full border flex-shrink-0 flex flex-col bg-background"
    :class="[
      position === 'right' ? 'border-l' : 'border-r',
      className
    ]"
    :style="{ width: `${constrainedWidth}px` }"
  >
    <!-- Resize handle -->
    <div 
      v-if="resizable"
      :class="[
        'sidebar-resize-handle',
        { 'resizing': isResizing },
        position === 'right' ? 'left-0' : 'right-0'
      ]" 
      @mousedown="startResizing"
    ></div>

    <!-- Custom Header Slot if provided -->
    <slot name="customHeader"></slot>
    
    <!-- Sidebar Content - Now with max-height and scrollable -->
    <div class="sidebar-content flex-1 flex flex-col relative overflow-y-auto">
      <slot></slot>
    </div>
    
    <!-- Sidebar Footer -->
    <div v-if="$slots.footer" class="sidebar-footer p-3 border-t flex-shrink-0">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import type { Component } from 'vue'

export interface BaseSidebarProps {
  icon?: Component
  position?: 'left' | 'right'
  width?: number
  className?: string
  resizable?: boolean
  minWidth?: number
  maxWidth?: number
  storageKey?: string
  defaultWidth?: number
}

const props = withDefaults(defineProps<BaseSidebarProps>(), {
  position: 'right',
  width: 350,
  className: '',
  resizable: true,
  minWidth: 240,
  maxWidth: 600,
  storageKey: '',
  defaultWidth: 350
})

const emit = defineEmits<{
  resize: [number]
}>()

// Generate storage key if not provided
const getStorageKey = computed(() => {
  return props.storageKey || `sidebar-width-${Date.now()}`
})

// Resizable sidebar implementation
const sidebarWidth = ref(props.width || props.defaultWidth)
const isResizing = ref(false)
const resizeStartX = ref(0)
const startWidth = ref(0)
const hasLoadedFromStorage = ref(false)

// Use computed for actual width to apply constraints
const constrainedWidth = computed(() => {
  return Math.max(props.minWidth, Math.min(props.maxWidth, sidebarWidth.value))
})

// Load sidebar width from localStorage
const loadSidebarWidth = () => {
  if (!props.resizable || hasLoadedFromStorage.value || !props.storageKey) return
  
  try {
    const savedWidth = localStorage.getItem(getStorageKey.value)
    if (savedWidth) {
      const width = parseInt(savedWidth, 10)
      if (!isNaN(width) && width >= props.minWidth && width <= props.maxWidth) {
        sidebarWidth.value = width
        hasLoadedFromStorage.value = true
        emit('resize', width)
      }
    }
  } catch (error) {
    console.error(`Error loading sidebar width from localStorage (${getStorageKey.value}):`, error)
  }
}

// Set sidebar width and save to localStorage
const setSidebarWidth = (width: number) => {
  if (!props.resizable) return
  
  const newWidth = Math.max(props.minWidth, Math.min(props.maxWidth, width))
  sidebarWidth.value = newWidth
  
  // Save to localStorage if storageKey is provided
  if (props.storageKey) {
    try {
      localStorage.setItem(getStorageKey.value, newWidth.toString())
    } catch (error) {
      console.error(`Error saving sidebar width to localStorage (${getStorageKey.value}):`, error)
    }
  }
  
  emit('resize', newWidth)
}

// Start resizing
const startResizing = (event: MouseEvent) => {
  if (!props.resizable) return
  
  event.preventDefault()
  isResizing.value = true
  resizeStartX.value = event.clientX
  startWidth.value = sidebarWidth.value
  
  // Add event listeners for mousemove and mouseup
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', stopResizing)
  
  // Disable text selection during resize
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'ew-resize'
  
  // Add a class to the body to indicate resizing is happening
  document.body.classList.add('sidebar-resizing')
}

// Handle mouse move during resize
const onMouseMove = (event: MouseEvent) => {
  if (!isResizing.value) return
  
  // Calculate the delta movement from the start position
  const deltaX = event.clientX - resizeStartX.value
  
  // Calculate new width based on the sidebar position
  let newWidth: number
  
  if (props.position === 'left') {
    newWidth = startWidth.value + deltaX
  } else { // right sidebar (default)
    newWidth = startWidth.value - deltaX
  }
  
  setSidebarWidth(newWidth)
}

// Stop resizing
const stopResizing = () => {
  if (!isResizing.value) return
  
  isResizing.value = false
  
  // Remove event listeners
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', stopResizing)
  
  // Restore text selection and cursor
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  document.body.classList.remove('sidebar-resizing')
}

// Clean up event listeners
const cleanupResizeListeners = () => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', stopResizing)
  
  // Restore text selection and cursor
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  document.body.classList.remove('sidebar-resizing')
}

// Setup responsive design
const setupResponsiveDesign = () => {
  const mediaQuery = window.matchMedia('(max-width: 768px)')
  
  const handleMediaQueryChange = (e: MediaQueryListEvent | MediaQueryList) => {
    if (!props.resizable) return
    
    if (e.matches) {
      // On mobile, set to minimum width
      sidebarWidth.value = props.minWidth
    } else {
      // On desktop, restore saved width
      loadSidebarWidth()
    }
  }
  
  // Initial check
  handleMediaQueryChange(mediaQuery)
  
  // Add listener for changes
  mediaQuery.addEventListener('change', handleMediaQueryChange)
  
  // Cleanup function
  return () => {
    mediaQuery.removeEventListener('change', handleMediaQueryChange)
  }
}

// Lifecycle hooks
onMounted(() => {
  if (props.resizable) {
    // Load saved width on mount
    loadSidebarWidth()
    
    // Setup responsive design
    const cleanup = setupResponsiveDesign()
    
    // Cleanup on unmount
    onBeforeUnmount(() => {
      cleanup()
      cleanupResizeListeners()
    })
  }
})

// Watch for width prop changes
watch(() => props.width, (newWidth) => {
  if (newWidth && sidebarWidth.value !== newWidth) {
    sidebarWidth.value = newWidth
  }
}, { immediate: true })
</script>

<style scoped>
.sidebar-container {
  min-width: v-bind('props.minWidth + "px"');
  max-width: v-bind('props.maxWidth + "px"');
  max-height: 100vh; /* Ensure sidebar doesn't exceed viewport height */
  position: relative;
}

/* Ensure content scrolls properly with consistent spacing */
.sidebar-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
}

.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 3px;
}

/* Resize handle styling */
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

/* Global styles for resize handling */
:global(body.sidebar-resizing) {
  cursor: ew-resize !important;
  user-select: none !important;
}
</style>