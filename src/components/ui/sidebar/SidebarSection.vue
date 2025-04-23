<template>
  <div :class="['sidebar-section', className]">
    <div v-if="title || $slots.header" class="sidebar-section-header mb-2">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium">
          <slot name="header">{{ title }}</slot>
        </h4>
        <slot name="headerActions"></slot>
      </div>
      <slot name="description"></slot>
    </div>
    <div class="sidebar-section-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface SidebarSectionProps {
  title?: string
  className?: string
}

const props = withDefaults(defineProps<SidebarSectionProps>(), {
  title: '',
  className: 'space-y-3 mb-4',
})
</script>