<script setup lang="ts">
import { RouterView, useRouter, useRoute } from 'vue-router'
import AppSidebar from '@/features/nota/components/AppSidebar.vue'
import AppTabs from '@/features/nota/components/AppTabs.vue'
import CitationPicker from '@/features/editor/components/blocks/citation-block/CitationPicker.vue'
import SubNotaDialog from '@/features/editor/components/blocks/SubNotaDialog.vue'


import ServerSelectionDialogWrapper from '@/features/editor/components/jupyter/ServerSelectionDialogWrapper.vue'
import { onMounted, computed, ref } from 'vue'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'

import { useAuthStore } from '@/features/auth/stores/auth'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { useEditorStore } from '@/features/editor/stores/editorStore'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useBlockEditor } from '@/features/nota/composables/useBlockEditor'

import MenubarSidebars from '@/components/MenubarSidebars.vue'
import PinnedSidebars from '@/components/PinnedSidebars.vue'
import { useSidebarManager } from '@/composables/useSidebarManager'
import RightSidebarContainer from '@/components/RightSidebarContainer.vue'
import EditorToolbar from '@/features/editor/components/ui/EditorToolbar.vue'
import ExportDialog from '@/features/editor/components/dialogs/ExportDialog.vue'
import { toast } from 'vue-sonner'

import { useLayoutStore } from '@/stores/layoutStore'

// NEW: Feature flag support for gradual migration
import { useFeatureFlags } from '@/composables/useFeatureFlags'
import ThreePanelLayout from '@/components/ThreePanelLayout.vue'
import SimplifiedMenubar from '@/components/SimplifiedMenubar.vue'
import CommandPalette from '@/components/CommandPalette.vue'

// Help system
import { HelpDialog } from '@/features/help'
import { useHelp } from '@/features/help'

const { useSimplifiedNavigation } = useFeatureFlags()
const { isHelpOpen, currentTopicId, openHelp } = useHelp()

const authStore = useAuthStore()
const jupyterStore = useJupyterStore()
const editorStore = useEditorStore()
const notaStore = useNotaStore()
const layoutStore = useLayoutStore()
const sidebarManager = useSidebarManager()

// Export dialog state
const showExportDialog = ref(false)
const exportTargetNota = ref<any>(null)

// Helper function to extract text from Tiptap JSON content
const extractTextFromTiptapContent = (content: any): string => {
  if (!content || typeof content !== 'object') return ''
  
  let text = ''
  
  // Recursively extract text from Tiptap content structure
  const extractText = (node: any) => {
    if (node.text) {
      text += node.text
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(extractText)
    }
  }
  
  if (content.content && Array.isArray(content.content)) {
    content.content.forEach(extractText)
  }
  
  return text
}

// Computed properties for toolbar
const activeNota = computed(() => {
  const activePane = layoutStore.activePaneObj
  if (activePane && activePane.notaId) {
    return notaStore.getItem(activePane.notaId)
  }
  return null
})

const wordCount = computed(() => {
  if (!activeNota.value) return 0
  
  // Get content from block-based system
  const { getTiptapContent } = useBlockEditor(activeNota.value.id)
  const blockContent = getTiptapContent.value
  
  if (!blockContent) return 0
  
  // Extract text from Tiptap object directly
  const textContent = extractTextFromTiptapContent(blockContent)
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
  // Get the active nota from either the active editor component or the layout store
  let targetNota: any = null
  
  if (editorStore.activeEditorComponent && editorStore.activeEditorComponent.currentNota) {
    // Use the nota from the active editor component (split view)
    targetNota = editorStore.activeEditorComponent.currentNota
  } else if (activeNota.value) {
    // Fallback to the nota from layout store
    targetNota = activeNota.value
  }

  if (targetNota) {
    await notaStore.toggleFavorite(targetNota.id)
    toast(targetNota.favorite ? 'Removed from favorites' : 'Added to favorites', {
      description: `"${targetNota.title || 'Untitled'}" ${targetNota.favorite ? 'removed from' : 'added to'} your favorites`,
      duration: 3000
    })
  } else {
    toast('Unable to toggle favorite', {
      description: 'No document is currently active.',
      duration: 3000
    })
  }
}

const handleShare = () => {
  // Get the active nota from either the active editor component or the layout store
  let targetNota: any = null
  
  if (editorStore.activeEditorComponent && editorStore.activeEditorComponent.currentNota) {
    // Use the nota from the active editor component (split view)
    targetNota = editorStore.activeEditorComponent.currentNota
  } else if (activeNota.value) {
    // Fallback to the nota from layout store
    targetNota = activeNota.value
  }

  if (targetNota) {
    // Implement share logic for the specific nota
    console.log('Share triggered for nota:', targetNota.id, targetNota.title)
    toast('Share feature coming soon', {
      description: `Sharing "${targetNota.title || 'Untitled'}"`,
      duration: 3000
    })
  } else {
    toast('Unable to share', {
      description: 'No document is currently active.',
      duration: 3000
    })
  }
}

const handleOpenConfig = () => {
  // Implement config modal logic
  console.log('Config triggered')
}

const handleExportNota = () => {
  // Get the active nota from either the active editor component or the layout store
  let targetNota: any = null
  
  if (editorStore.activeEditorComponent && editorStore.activeEditorComponent.currentNota) {
    // Use the nota from the active editor component (split view)
    targetNota = editorStore.activeEditorComponent.currentNota
  } else if (activeNota.value) {
    // Fallback to the nota from layout store
    targetNota = activeNota.value
  }

  if (targetNota) {
    // Set the target nota and show the export dialog
    exportTargetNota.value = targetNota
    showExportDialog.value = true
  } else {
    toast('Unable to export', {
      description: 'No document is currently active.',
      duration: 3000
    })
  }
}

const handleSaveVersion = async () => {
  try {
    // Try to use the active editor component first (for split view)
    if (editorStore.activeEditorComponent) {
      await editorStore.saveVersion()
    } else if (activeNota.value) {
      // Fallback for cases where no active editor component is available
      // Get content from block-based system
      const { getTiptapContent } = useBlockEditor(activeNota.value.id)
      const blockContent = getTiptapContent.value
      
      if (blockContent) {
        // Create a version with the full nota object
        const versionNota = {
          ...activeNota.value,
          // Update the blockStructure to reflect current content
          blockStructure: activeNota.value.blockStructure ? {
            ...activeNota.value.blockStructure,
            lastModified: new Date()
          } : {
            notaId: activeNota.value.id,
            blockOrder: [],
            version: 1,
            lastModified: new Date()
          }
        }
        
        await notaStore.saveNotaVersion({
          id: activeNota.value.id,
          nota: versionNota,
          versionName: `Version ${new Date().toLocaleString()}`,
          createdAt: new Date()
        })
        toast('Version saved successfully', {
          description: 'A new version of your document has been created.',
          duration: 3000
        })
      } else {
        toast('Unable to save version', {
          description: 'No content available to save.',
          duration: 3000
        })
      }
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
  
  // Add global keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    // Sub-nota sidebar: Ctrl+Shift+Alt+S
    if (event.ctrlKey && event.shiftKey && event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault()
      sidebarManager.toggleSidebar('subNotas')
    }
  })
})


</script>

<template>
  <TooltipProvider class="h-full">
    <!-- NEW: Simplified Navigation (Feature Flag Controlled) -->
    <div role="status" aria-live="polite" class="sr-only">
      {{ useSimplifiedNavigation ? 'Simplified navigation active' : 'Legacy navigation active' }}
    </div>
    <template v-if="useSimplifiedNavigation">
      <SimplifiedMenubar @open-help="openHelp()" />
      <ThreePanelLayout>
        <template #documents>
          <AppSidebar />
        </template>
        <template #editor>
          <AppTabs />
          <RouterView class="flex-1 h-full" />
        </template>
        <template #ai>
          <RightSidebarContainer :editor="editorStore.activeEditor as any" />
        </template>
      </ThreePanelLayout>
      <CommandPalette />
      
      <!-- Global components that need to be available anywhere -->
      <ServerSelectionDialogWrapper />
      <CitationPicker />
      <SubNotaDialog />
      <ExportDialog v-model:open="showExportDialog" :nota="exportTargetNota" />
      <HelpDialog v-model:open="isHelpOpen" :default-topic-id="currentTopicId" />
    </template>

    <!-- LEGACY: Original 7-Sidebar Navigation -->
    <SidebarProvider v-else class="h-full">
      <AppSidebar />
      <SidebarInset class="h-full">
        <!-- Top Bar -->
        <div class="sticky top-0 z-10 border-b bg-background text-foreground backdrop-blur-sm">
          <div class="flex items-center justify-between px-4 h-14">
            <div class="flex items-center gap-4">
              <SidebarTrigger />
              
              <!-- Pinned Sidebars -->
              <PinnedSidebars />
              
              <!-- Sidebar Menubar -->
              <MenubarSidebars @open-help="openHelp()" />
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
        <div class="flex flex-1 min-h-0 overflow-hidden h-full">
          <!-- Content Area: Use RouterView for all routes -->
          <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
            <RouterView class="flex-1 h-full" />
          </div>
          
          <!-- Right Sidebars Container -->
          <RightSidebarContainer :editor="editorStore.activeEditor as any" />
        </div>
      </SidebarInset>
      
      <!-- Global components that need to be available anywhere -->
      <ServerSelectionDialogWrapper />
      <CitationPicker />
      <SubNotaDialog />
      
      <!-- Export Dialog -->
      <ExportDialog v-model:open="showExportDialog" :nota="exportTargetNota" />
      
      <!-- Help Dialog -->
      <HelpDialog v-model:open="isHelpOpen" :default-topic-id="currentTopicId" />
    </SidebarProvider>
  </TooltipProvider>
</template>

<style>
/* Prevent root level scrolling */
html, body {
  height: 100%;
  max-height: 100vh;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

#app {
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

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








