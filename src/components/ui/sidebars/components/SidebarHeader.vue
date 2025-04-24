<template>
  <div class="sidebar-header border-b px-3 py-2 flex-shrink-0 flex items-center justify-between">
    
    <div class="flex items-center gap-1">
      <slot name="actions"></slot>
      <button 
        v-if="resetWidthFn && showResetButton"
        class="sidebar-reset-button h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground"
        @click="resetWidthFn"
        title="Reset sidebar width"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3v18h18" />
          <path d="M3 17L9 11L13 15L21 7" />
        </svg>
      </button>
      
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

export interface SidebarHeaderProps {
  title: string
  icon?: Component
  closable?: boolean
  showResetButton?: boolean
  resetWidthFn?: () => void
}

const props = withDefaults(defineProps<SidebarHeaderProps>(), {
  title: '',
  icon: undefined,
  closable: true,
  showResetButton: true,
  resetWidthFn: undefined
})

defineEmits(['close'])
</script>

<style scoped>
.sidebar-header {
  background-color: rgba(var(--muted), 0.3);
}
</style>