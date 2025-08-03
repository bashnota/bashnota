<template>
  <!-- Right Sidebar -->
  <div
    v-if="isOpen"
    class="fixed top-0 right-0 z-50 h-full bg-background border-l border-border shadow-lg transition-transform duration-200 ease-in-out"
    :class="{
      'w-full max-w-sm': isMobile,
      'translate-x-0': isOpen,
      'translate-x-full': !isOpen,
    }"
    :style="!isMobile ? sidebarStyles : undefined"
  >
    <!-- Backdrop for mobile -->
    <div 
      v-if="isMobile"
      class="fixed inset-0 -z-10 bg-black/50"
      @click="toggle(false)"
    />
    
    <!-- Resize Handle -->
    <div
      v-if="!isMobile && resizable"
      class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-border/60 transition-colors"
      :class="{ 'bg-border': isResizing }"
      @mousedown="startResize"
    />
    
    <!-- Sidebar Content -->
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-border bg-muted/20">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <component :is="icon" v-if="icon" class="w-4 h-4 flex-shrink-0" />
          <h2 class="text-sm font-semibold truncate">{{ title }}</h2>
        </div>
        
        <!-- Header Actions -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <slot name="headerActions" />
          
          <!-- Close Button -->
          <Button
            variant="ghost"
            size="sm"
            class="h-7 w-7 p-0"
            @click="toggle(false)"
          >
            <X class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      
      <!-- Header Subtitle -->
      <div v-if="$slots.headerSubtitle" class="px-4 py-2 border-b border-border/50 bg-muted/10">
        <slot name="headerSubtitle" />
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-hidden">
        <slot />
      </div>
      
      <!-- Footer -->
      <div v-if="$slots.footer" class="border-t border-border bg-muted/20">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-vue-next'
import { useSidebarManager } from '@/composables/useSidebarManager'

interface Props {
  id: string
  title: string
  icon?: any
  resizable?: boolean
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  resizable: true,
  defaultWidth: 350,
  minWidth: 280,
  maxWidth: 600
})

const emit = defineEmits<{
  close: []
  toggle: [isOpen: boolean]
  resize: [width: number]
}>()

// Media query for mobile detection
const isMobile = useMediaQuery('(max-width: 768px)')

// Use the global sidebar manager
const { sidebarStates, closeSidebar } = useSidebarManager()

// Get the sidebar state for this specific sidebar
const isOpen = computed(() => {
  return sidebarStates[props.id as keyof typeof sidebarStates]?.isOpen || false
})

// For now, use a fixed width - we can add width management later
const width = computed(() => props.defaultWidth)
const isResizing = computed(() => false) // Placeholder for resize functionality

const sidebarStyles = computed(() => ({
  '--right-sidebar-width': `${width.value}px`
}))

const toggle = (forceState?: boolean) => {
  const newState = forceState !== undefined ? forceState : !isOpen.value
  if (!newState) {
    closeSidebar(props.id as any)
    emit('close')
  }
  emit('toggle', newState)
}

// Placeholder for resize functionality - can be implemented later
const startResize = (event: MouseEvent) => {
  // TODO: Implement resize functionality if needed
  console.log('Resize started', event)
}

// Expose methods for parent components
defineExpose({
  isOpen,
  width,
  toggle
})
</script>

<style scoped>
/* Ensure proper stacking and smooth transitions */
.sidebar-enter-active,
.sidebar-leave-active {
  transition: transform 0.2s ease-in-out;
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(100%);
}
</style>
