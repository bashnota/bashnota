<template>
  <div 
    class="sidebar-container h-full w-full border flex-shrink-0 flex flex-col bg-background"
    :class="[
      position === 'right' ? 'border-l' : 'border-r',
      className
    ]"
    :style="{ width: width ? `${width}px` : '100%' }"
  >
    <!-- Header Section -->
    <slot v-if="$slots.header" name="header"></slot>
    <SidebarHeader
      v-else-if="title"
      :title="title"
      :icon="icon"
      :closable="true"
      @close="$emit('close')"
    >
      <template v-if="$slots.headerSubtitle" #subtitle>
        <slot name="headerSubtitle"></slot>
      </template>
      <template v-if="$slots.headerActions" #actions>
        <slot name="headerActions"></slot>
      </template>
    </SidebarHeader>
    
    <!-- Sidebar Content -->
    <div class="sidebar-content flex-1 flex flex-col relative overflow-y-auto w-full h-full">
      <slot></slot>
    </div>
    
    <!-- Sidebar Footer -->
    <div v-if="$slots.footer" class="sidebar-footer p-3 border-t flex-shrink-0">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { Component } from 'vue'
import { useSidebarStore } from '@/stores/sidebarStore'
import SidebarHeader from './components/SidebarHeader.vue'

export interface BaseSidebarProps {
  // Basic sidebar properties
  id?: string
  title?: string 
  icon?: Component
  position?: 'left' | 'right'
  className?: string
  
  // Width configurations
  width?: number
}

const props = withDefaults(defineProps<BaseSidebarProps>(), {
  id: '',
  title: '',
  position: 'right',
  width: undefined, // Remove default width to allow natural sizing
  className: ''
})

const emit = defineEmits<{
  close: []
}>()

// Initialize sidebar store if needed
const sidebarStore = useSidebarStore()

// No width loading or setting logic

// Lifecycle hooks
onMounted(() => {
  // No resize logic
})

// Watch for width prop changes
watch(() => props.width, (newWidth) => {
  // No width setting logic
}, { immediate: true })

// No methods to expose
</script>

<style scoped>
.sidebar-container {
  max-height: 100vh; /* Ensure sidebar doesn't exceed viewport height */
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

/* Ensure content scrolls properly with consistent spacing */
.sidebar-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
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

/* No resize handle styling */
</style>