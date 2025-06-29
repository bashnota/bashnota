<template>
  <div class="sidebar-section mb-4">
    <div v-if="title" class="sidebar-section-header mb-2">
      <h4 class="text-sm font-medium flex items-center gap-1.5">
        <component :is="icon" v-if="icon" class="h-3.5 w-3.5 text-muted-foreground" />
        {{ title }}
      </h4>
    </div>
    <div class="sidebar-section-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

export interface SidebarSectionProps {
  title?: string
  icon?: Component
  collapsible?: boolean
  initiallyCollapsed?: boolean
}

const props = withDefaults(defineProps<SidebarSectionProps>(), {
  title: '',
  icon: undefined,
  collapsible: false,
  initiallyCollapsed: false
})
</script>

<style scoped>
.sidebar-section-header {
  border-bottom: 1px solid rgba(var(--border), 0.5);
  padding-bottom: 0.5rem;
}
</style>








