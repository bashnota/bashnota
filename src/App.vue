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

import MenubarSidebars from '@/components/MenubarSidebars.vue'
import PinnedSidebars from '@/components/PinnedSidebars.vue'
import { useSidebarManager } from '@/composables/useSidebarManager'
import RightSidebarContainer from '@/components/RightSidebarContainer.vue'

const authStore = useAuthStore()
const jupyterStore = useJupyterStore()
const editorStore = useEditorStore()
const sidebarManager = useSidebarManager()


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
            
            <!-- Actions and BashHub Toggle -->
            <div class="flex items-center gap-2">
              
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








