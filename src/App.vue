<script setup lang="ts">
import { RouterView, useRouter, useRoute } from 'vue-router'
import AppSidebar from '@/features/nota/components/AppSidebar.vue'
import AppTabs from '@/features/nota/components/AppTabs.vue'


import ServerSelectionDialogWrapper from '@/features/editor/components/jupyter/ServerSelectionDialogWrapper.vue'
import { onMounted, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'

import { useAuthStore } from '@/features/auth/stores/auth'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'

import { Home, Globe } from 'lucide-vue-next'
import MenubarSidebars from '@/components/MenubarSidebars.vue'
import PinnedSidebars from '@/components/PinnedSidebars.vue'
import { useSidebarManager } from '@/composables/useSidebarManager'

const authStore = useAuthStore()
const jupyterStore = useJupyterStore()
const route = useRoute()
const router = useRouter()
const sidebarManager = useSidebarManager()

// Check if we're in BashHub view
const isInBashHub = computed(() => route.name === 'bashhub')
const isNotaView = computed(() => route.name === 'nota')

onMounted(async () => {
  // Initialize auth state
  await authStore.init()
  
  // Initialize Jupyter servers from localStorage
  jupyterStore.loadServers()
  
  // Initialize sidebar manager
  sidebarManager.initialize()
})

// Toggle between main view and BashHub
const toggleBashHub = () => {
  if (isInBashHub.value) {
    router.push('/')
  } else {
    router.push('/bashhub')
  }
}

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
              
              <!-- BashHub Toggle Button -->
              <Button
                variant="outline"
                size="sm"
                @click="toggleBashHub"
                :class="{'bg-primary/10': isInBashHub}"
              >
                <Globe v-if="isInBashHub" class="h-4 w-4 mr-2" />
                <Home v-else class="h-4 w-4 mr-2" />
                {{ isInBashHub ? 'Go to My Notas' : 'Go to Hub' }}
              </Button>
            </div>
          </div>
        </div>

        <!-- Global Split Creation Zone (only when dragging) -->
        <AppTabs v-if="!isInBashHub" />

        <!-- Content Area: Use RouterView for all routes -->
        <div class="flex-1 min-h-0 flex flex-col overflow-auto">
          <RouterView class="flex-1 h-full" />
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








