<template>
  <button 
    class="sidebar-toggle-button h-8 w-8 flex items-center justify-center rounded-md bg-background border shadow-sm"
    :class="[buttonClass]"
    @click="$emit('toggle')"
    :title="isOpen ? 'Close sidebar' : 'Open sidebar'"
  >
    <component :is="isOpen ? closeIcon : openIcon" class="h-4 w-4" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, X, Menu } from 'lucide-vue-next'
import type { Component } from 'vue'

export interface SidebarToggleButtonProps {
  isOpen: boolean
  position?: 'left' | 'right'
  buttonClass?: string
  openIcon?: Component
  closeIcon?: Component
}

const props = withDefaults(defineProps<SidebarToggleButtonProps>(), {
  isOpen: false,
  position: 'right',
  buttonClass: '',
  openIcon: undefined,
  closeIcon: undefined
})

// Determine icons based on position and what's provided
const effectiveOpenIcon = computed(() => {
  if (props.openIcon) return props.openIcon
  return props.position === 'right' ? ChevronLeft : ChevronRight
})

const effectiveCloseIcon = computed(() => {
  if (props.closeIcon) return props.closeIcon
  return props.position === 'right' ? ChevronRight : ChevronLeft
})

// Define what icons to show based on sidebar state
const openIcon = computed(() => props.isOpen ? X : effectiveOpenIcon.value)
const closeIcon = computed(() => effectiveCloseIcon.value)

// Emit toggle event to parent
defineEmits(['toggle'])
</script>

<style scoped>
.sidebar-toggle-button {
  transition: all 0.2s ease-in-out;
}

.sidebar-toggle-button:hover {
  transform: scale(1.05);
  background-color: var(--muted);
}
</style>








