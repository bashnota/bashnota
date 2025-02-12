<template>
  <span 
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
  >
    <slot></slot>
    <button 
      v-if="onRemove" 
      @click.stop="onRemove"
      class="ml-1.5 hover:text-primary/80"
      title="Remove tag"
    >
      ×
    </button>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  onRemove?: () => void
}>()
</script> 