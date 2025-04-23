<template>
  <div 
    class="sidebar-container h-full border flex-shrink-0 flex flex-col bg-background"
    :class="[
      position === 'right' ? 'border-l' : 'border-r',
      width ? `w-${width}` : 'w-72',
      className
    ]"
  >
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
import type { Component } from 'vue'

export interface BaseSidebarProps {
  icon?: Component
  position?: 'left' | 'right'
  width?: string | number
  className?: string
}

const props = withDefaults(defineProps<BaseSidebarProps>(), {
  position: 'right',
  width: undefined,
  className: '',
})
</script>

<style scoped>
.sidebar-container {
  min-width: 240px;
  max-width: 480px;
  max-height: 100vh; /* Ensure sidebar doesn't exceed viewport height */
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
</style>