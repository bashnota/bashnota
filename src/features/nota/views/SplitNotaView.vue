<template>
  <div class="h-full w-full flex overflow-hidden">
    <!-- Left Sidebar (TOC) -->
    <div v-if="sidebarStates.toc.isOpen" class="left-sidebar-container">
      <div class="py-1 px-2 border-b flex items-center justify-between">
        <div class="flex items-center">
          <svg class="h-3.5 w-3.5 text-primary mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 12h6M9 16h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3 class="text-sm font-medium">Table of Contents</h3>
        </div>
        <Button variant="ghost" size="icon" class="h-5 w-5 -mr-1" @click="toggleSidebar('toc')">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </Button>
      </div>
      <div class="flex-1 flex flex-col relative overflow-hidden w-full h-full p-0 m-0">
        <TableOfContents v-if="editorStore.activeEditor" :editor="editorStore.activeEditor as Editor" />
      </div>
    </div>
    
    <!-- Main Content Area -->
    <div class="h-full w-full flex flex-col bg-background flex-1">
      <SplitViewContainer class="flex-1" ref="splitViewContainerRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import SplitViewContainer from '@/features/nota/components/SplitViewContainer.vue'
import { useLayoutStore } from '@/stores/layoutStore'
import { useRoute } from 'vue-router'
import { watch, onMounted, computed, ref } from 'vue'
import { useEditorStore } from '@/features/editor/stores/editorStore'
import { useNotaStore } from '@/features/nota/stores/nota'
import { Button } from '@/components/ui/button'
import type { Editor } from '@tiptap/vue-3'

import TableOfContents from '@/features/editor/components/ui/TableOfContents.vue'
import { useSidebarManager, type SidebarId } from '@/composables/useSidebarManager'

const layoutStore = useLayoutStore()
const editorStore = useEditorStore()
const notaStore = useNotaStore()
const route = useRoute()
const splitViewContainerRef = ref<any>(null)

// Use sidebar manager
const { sidebarStates, toggleSidebar } = useSidebarManager()

const activeNota = computed(() => {
  const activePane = layoutStore.activePaneObj
  if (activePane && activePane.notaId) {
    return notaStore.getItem(activePane.notaId)
  }
  return null
})

// Calculate word count from nota content
const wordCount = computed(() => {
  if (!activeNota.value?.content) return 0
  
  // Remove HTML tags and count words
  const textContent = activeNota.value.content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
  
  return textContent ? textContent.split(' ').length : 0
})

// Get the active pane component reference
const activePaneComponent = computed(() => {
  return splitViewContainerRef.value?.getActivePaneComponent?.()
})

// Initialize layout store when this view is mounted
onMounted(() => {
  layoutStore.initializeLayout()
})

// Watch for route changes to open nota in current pane
watch(
  () => route.params.id,
  (newId) => {
    if (newId && typeof newId === 'string') {
      const existingPane = layoutStore.getPaneByNotaId(newId)
      if (existingPane) {
        layoutStore.setActivePane(existingPane.id)
      } else {
        layoutStore.openNotaInPane(newId)
      }
    }
  },
  { immediate: true }
)
</script>

<style>
/* Left sidebar container styles */
.left-sidebar-container {
  min-width: 300px;
  max-width: 800px;
  position: relative;
  border-right: 1px solid hsl(var(--border));
}
</style> 