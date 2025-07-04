<template>
  <div class="h-full w-full flex overflow-hidden">
    <!-- Left Sidebar (TOC) -->
    <div v-if="sidebars.toc.isOpen" class="left-sidebar-container">
      <div class="py-1 px-2 border-b flex items-center justify-between">
        <div class="flex items-center">
          <svg class="h-3.5 w-3.5 text-primary mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 12h6M9 16h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3 class="text-sm font-medium">{{ sidebars.toc.title }}</h3>
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
    
    <div class="h-full w-full flex flex-col bg-background flex-1">
      <UnifiedToolbar 
        @toggle-sidebar="toggleSidebar"
        @run-all="activePaneComponent?.executeAllCells"
        @toggle-favorite="activePaneComponent?.toggleFavorite"
        @open-config="activePaneComponent?.toggleConfigModal"
        @share="activePaneComponent?.toggleShareDialog"
        @export-nota="activePaneComponent?.exportNota"
        :is-favorite="activeNota?.favorite || false"
        :can-run-all="!!(activeNota && activeNota.config?.savedSessions && activeNota.config?.savedSessions.length > 0)"
      />
      <SplitViewContainer class="flex-1" ref="splitViewContainerRef" />
    </div>

    <!-- Right-side Sidebars -->
    <template v-for="(config, id) in sidebars" :key="id">
      <div v-if="id !== 'toc' && config.isOpen" class="right-sidebar-container">
        <div class="py-1 px-2 border-b flex items-center justify-between">
          <div class="flex items-center ">
            <component :is="config.icon" v-if="config.icon" class="h-3.5 w-3.5 text-primary" />
            <h3 class="text-sm font-medium">{{ config.title }}</h3>
          </div>
          <Button variant="ghost" size="icon" class="h-5 w-5 -mr-1" @click="toggleSidebar(id)">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </Button>
        </div>
        <div class="flex-1 flex flex-col relative overflow-hidden w-full h-full p-0 m-0">
          <component 
            v-if="activeNota"
            :is="{
              'references': ReferencesSidebar,
              'jupyter': JupyterServersSidebar,
              'ai': AIAssistantSidebar,
              'metadata': MetadataSidebar,
              'favorites': FavoriteBlocksSidebar
            }[id]" 
            :editor="editorStore.activeEditor as Editor" 
            :notaId="activeNota.id"
            :hideHeader="id === 'ai'"
            class="h-full w-full flex-1 overflow-hidden"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import SplitViewContainer from '@/features/nota/components/SplitViewContainer.vue'
import UnifiedToolbar from '@/features/editor/components/ui/UnifiedToolbar.vue'
import { useLayoutStore } from '@/stores/layoutStore'
import { useRoute } from 'vue-router'
import { watch, onMounted, reactive, computed, ref } from 'vue'
import { useEditorStore } from '@/features/editor/stores/editorStore'
import { useNotaStore } from '@/features/nota/stores/nota'
import { Button } from '@/ui/button'
import type { Editor } from '@tiptap/vue-3'

import TableOfContents from '@/features/editor/components/ui/TableOfContents.vue'
import ReferencesSidebar from '@/features/nota/components/ReferencesSidebar.vue'
import JupyterServersSidebar from '@/features/jupyter/components/JupyterServersSidebar.vue'
import AIAssistantSidebar from '@/features/ai/components/AIAssistantSidebar.vue'
import MetadataSidebar from '@/features/nota/components/MetadataSidebar.vue'
import FavoriteBlocksSidebar from '@/features/nota/components/FavoriteBlocksSidebar.vue'
import { BookIcon, ServerIcon, BrainIcon, Tag, Star } from 'lucide-vue-next'

const layoutStore = useLayoutStore()
const editorStore = useEditorStore()
const notaStore = useNotaStore()
const route = useRoute()
const splitViewContainerRef = ref<any>(null)

const activeNota = computed(() => {
  const activePane = layoutStore.activePaneObj
  if (activePane && activePane.notaId) {
    return notaStore.getItem(activePane.notaId)
  }
  return null
})

const activePaneComponent = computed(() => {
  if (!splitViewContainerRef.value || !layoutStore.activePaneObj) {
    return null
  }
  const panes = Array.isArray(splitViewContainerRef.value.paneRefs)
    ? splitViewContainerRef.value.paneRefs
    : [splitViewContainerRef.value.paneRefs];
    
  const paneComponent = panes.find(
    (p: any) => p && p.pane && p.pane.id === layoutStore.activePaneObj?.id
  )
  return paneComponent
})

// --- Sidebar Management ---
type SidebarPosition = 'left' | 'right';
type SidebarId = 'toc' | 'references' | 'jupyter' | 'ai' | 'metadata' | 'favorites';

interface SidebarConfig {
  isOpen: boolean;
  position: SidebarPosition;
  title: string;
  icon?: any;
}

type SidebarsConfig = Record<SidebarId, SidebarConfig>;

const sidebars = reactive<SidebarsConfig>({
  toc: { isOpen: false, position: 'left', title: 'Table of Contents', icon: null },
  references: { isOpen: false, position: 'right', title: 'References', icon: BookIcon },
  jupyter: { isOpen: false, position: 'right', title: 'Jupyter Servers', icon: ServerIcon },
  ai: { isOpen: false, position: 'right', title: 'AI Assistant', icon: BrainIcon },
  metadata: { isOpen: false, position: 'right', title: 'Metadata', icon: Tag },
  favorites: { isOpen: false, position: 'right', title: 'Favorite Blocks', icon: Star }
});

const toggleSidebar = (id: SidebarId): void => {
  const currentState = sidebars[id].isOpen;
  (Object.keys(sidebars) as SidebarId[]).forEach(key => {
    sidebars[key].isOpen = false;
  });
  sidebars[id].isOpen = !currentState;
};

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
/* Right sidebar container styles */
.right-sidebar-container {
  min-width: 300px;
  max-width: 800px;
  position: relative;
  border-left: 1px solid hsl(var(--border));
}

.left-sidebar-container {
  min-width: 300px;
  max-width: 800px;
  position: relative;
  border-right: 1px solid hsl(var(--border));
}
</style> 