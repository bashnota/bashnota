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
    
    <!-- Sidebar Content -->
    <div class="sidebar-content flex-1 flex flex-col relative">
      <slot></slot>
    </div>
    
    <!-- Sidebar Footer -->
    <div v-if="$slots.footer" class="sidebar-footer p-3 border-t">
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
}
</style>