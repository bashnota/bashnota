<template>
  <div class="h-full w-full bg-background">
    <SplitViewContainer />
  </div>
</template>

<script setup lang="ts">
import SplitViewContainer from '@/features/nota/components/SplitViewContainer.vue'
import { useLayoutStore } from '@/stores/layoutStore'
import { useRoute } from 'vue-router'
import { watch, onMounted } from 'vue'

const layoutStore = useLayoutStore()
const route = useRoute()

// Initialize layout store when this view is mounted
onMounted(() => {
  layoutStore.initializeLayout()
})

// Watch for route changes to open nota in current pane
watch(
  () => route.params.id,
  (newId) => {
    if (newId && typeof newId === 'string') {
      // Check if this nota is already open in a pane
      const existingPane = layoutStore.getPaneByNotaId(newId)
      if (existingPane) {
        layoutStore.setActivePane(existingPane.id)
      } else {
        // Open in active pane or first available pane
        layoutStore.openNotaInPane(newId)
      }
    }
  },
  { immediate: true }
)
</script> 