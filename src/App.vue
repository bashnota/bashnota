<script setup lang="ts">
import { RouterView, useRouter, useRoute } from 'vue-router'
import AppSidebar from '@/features/nota/components/AppSidebar.vue'
import AppTabs from '@/features/nota/components/AppTabs.vue'


import ServerSelectionDialogWrapper from '@/features/editor/components/jupyter/ServerSelectionDialogWrapper.vue'
import { onMounted, computed } from 'vue'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'

import { useAuthStore } from '@/features/auth/stores/auth'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { useEditorStore } from '@/features/editor/stores/editorStore'
import { useNotaStore } from '@/features/nota/stores/nota'

import MenubarSidebars from '@/components/MenubarSidebars.vue'
import PinnedSidebars from '@/components/PinnedSidebars.vue'
import { useSidebarManager } from '@/composables/useSidebarManager'
import RightSidebarContainer from '@/components/RightSidebarContainer.vue'
import EditorToolbar from '@/features/editor/components/ui/EditorToolbar.vue'
import { toast } from 'vue-sonner'

import { useLayoutStore } from '@/stores/layoutStore'

const authStore = useAuthStore()
const jupyterStore = useJupyterStore()
const editorStore = useEditorStore()
const notaStore = useNotaStore()
const layoutStore = useLayoutStore()
const sidebarManager = useSidebarManager()

// Computed properties for toolbar
const activeNota = computed(() => {
  const activePane = layoutStore.activePaneObj
  if (activePane && activePane.notaId) {
    return notaStore.getItem(activePane.notaId)
  }
  return null
})

const wordCount = computed(() => {
  if (!activeNota.value?.content) return 0
  
  // Remove HTML tags and count words
  const textContent = activeNota.value.content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
  
  return textContent ? textContent.split(' ').length : 0
})

const canRunAll = computed(() => {
  return !!(activeNota.value && activeNota.value.config?.savedSessions && activeNota.value.config?.savedSessions.length > 0)
})

// Toolbar event handlers
const handleRunAll = () => {
  // Implement run all logic
  console.log('Run all triggered')
}

const handleToggleFavorite = async () => {
  if (activeNota.value) {
    await notaStore.toggleFavorite(activeNota.value.id)
  }
}

const handleShare = () => {
  // Implement share logic
  console.log('Share triggered')
}

const handleOpenConfig = () => {
  // Implement config modal logic
  console.log('Config triggered')
}

const handleExportNota = () => {
  // Implement export logic
  console.log('Export triggered')
}

const handleSaveVersion = async () => {
  try {
    // Try to use the active editor component first (for split view)
    if (editorStore.activeEditorComponent) {
      await editorStore.saveVersion()
    } else if (activeNota.value) {
      // Fallback for cases where no active editor component is available
      await notaStore.saveNotaVersion({
        id: activeNota.value.id,
        content: activeNota.value.content || '',
        versionName: `Version ${new Date().toLocaleString()}`,
        createdAt: new Date()
      })
      toast('Version saved successfully', {
        description: 'A new version of your document has been created.',
        duration: 3000
      })
    } else {
      toast('Unable to save version', {
        description: 'No document is currently active.',
        duration: 3000
      })
    }
  } catch (error) {
    console.error('Error saving version:', error)
    toast('Failed to save version', {
      description: 'An error occurred while saving the document version.',
      duration: 3000
    })
  }
}

const handleOpenHistory = () => {
  try {
    // Use the editor store to open history for the active editor component
    if (editorStore.activeEditorComponent) {
      editorStore.openHistory()
    } else {
      toast('Unable to open history', {
        description: 'No document is currently active.',
        duration: 3000
      })
    }
  } catch (error) {
    console.error('Error opening history:', error)
    toast('Failed to open version history', {
      description: 'An error occurred while opening the version history.',
      duration: 3000
    })
  }
}

const handleToggleSidebar = (sidebarId: any) => {
  sidebarManager.toggleSidebar(sidebarId)
}


onMounted(async () => {
  // Initialize auth state
  await authStore.init()
  
  // Initialize Jupyter servers from localStorage
  jupyterStore.loadServers()
  
  // Initialize sidebar manager
  sidebarManager.initialize()
})


</script>

<template>
  <TooltipProvider>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <!-- Top Bar -->
        <div class="sticky top-0 z-10 border-b bg-background text-foreground backdrop-blur-sm">
          <div class="flex items-center justify-between px-4 h-14">
            <div class="flex items-center gap-4">
              <SidebarTrigger />
              
              <!-- Pinned Sidebars -->
              <PinnedSidebars />
              
              <!-- Sidebar Menubar -->
              <MenubarSidebars />
            </div>
            
            <!-- Actions and Editor Toolbar -->
            <div class="flex items-center gap-2">
              <!-- Editor Toolbar Navigation Menu -->
              <EditorToolbar
                :can-run-all="canRunAll"
                :is-executing-all="false"
                :is-favorite="activeNota?.favorite || false"
                :word-count="wordCount"
                @run-all="handleRunAll"
                @toggle-favorite="handleToggleFavorite"
                @share="handleShare"
                @open-config="handleOpenConfig"
                @export-nota="handleExportNota"
                @save-version="handleSaveVersion"
                @open-history="handleOpenHistory"
                @toggle-sidebar="handleToggleSidebar"
              />
            </div>
          </div>
        </div>

        <!-- Global Split Creation Zone (only when dragging) -->
        <AppTabs />

        <!-- Main content area with right sidebar -->
        <div class="flex flex-1 min-h-0 overflow-hidden">
          <!-- Content Area: Use RouterView for all routes -->
          <div class="flex-1 min-h-0 flex flex-col overflow-auto">
            <RouterView class="flex-1 h-full" />
          </div>
          
          <!-- Right Sidebars Container -->
          <RightSidebarContainer :editor="editorStore.activeEditor as any" />
        </div>
      </SidebarInset>
    </SidebarProvider>
    
    <!-- Global components that need to be available anywhere -->
    <ServerSelectionDialogWrapper />
  </TooltipProvider>
</template>

<style>
/* Custom Scrollbar Styles */
* {
  /* For Firefox */
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground)/0.2) transparent;
}

/* For Webkit browsers (Chrome, Safari, etc) */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground)/0.2);
  border-radius: 9999px;
  border: 2px solid transparent;
}

::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground)/0.3);
}

/* Hide scrollbars for components using ScrollArea */
.scrollarea-content::-webkit-scrollbar {
  display: none;
}

.scrollarea-content {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>








