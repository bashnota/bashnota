<script setup lang="ts">
import { RouterView, useRouter, useRoute } from 'vue-router'
import AppSidebar from '@/features/nota/components/AppSidebar.vue'
import BreadcrumbNav from '@/features/nota/components/BreadcrumbNav.vue'
import AppTabs from '@/features/nota/components/AppTabs.vue'
import ServerSelectionDialogWrapper from '@/features/editor/components/jupyter/ServerSelectionDialogWrapper.vue'
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import { Button } from '@/ui/button'
import { cn } from '@/lib/utils'
import Toaster from '@/ui/toast/Toaster.vue'
import { useAuthStore } from '@/features/auth/stores/auth'
import { Menu, Home, Globe } from 'lucide-vue-next'
import { logger } from '@/services/logger'
import { useNotaImport } from '@/features/nota/composables/useNotaImport'

const isSidebarOpen = ref(false)
const sidebarWidth = ref(300)
const isResizing = ref(false)
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// Check if we're in BashHub view
const isInBashHub = computed(() => route.name === 'bashhub')

onMounted(async () => {
  // Initialize auth state
  await authStore.init()
  
  const savedState = localStorage.getItem('sidebar-state')
  if (savedState) {
    isSidebarOpen.value = JSON.parse(savedState)
  }
  
  // Load sidebar width from interface settings
  const savedInterfaceSettings = localStorage.getItem('interface-settings')
  if (savedInterfaceSettings) {
    try {
      const settings = JSON.parse(savedInterfaceSettings)
      if (settings.sidebarWidth && settings.sidebarWidth[0]) {
        sidebarWidth.value = settings.sidebarWidth[0]
      }
    } catch (e) {
      logger.error('Failed to parse saved interface settings', e)
    }
  } else {
    const savedWidth = localStorage.getItem('sidebar-width')
    if (savedWidth) {
      sidebarWidth.value = parseInt(savedWidth)
    }
  }

  // Listen for settings changes
  window.addEventListener('interface-settings-changed', ((event: CustomEvent) => {
    if (event.detail?.sidebarWidth && event.detail.sidebarWidth[0]) {
      sidebarWidth.value = event.detail.sidebarWidth[0]
    }
  }) as EventListener)

  // Setup resize handling
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
})

// Clean up event listeners on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
})

watch(isSidebarOpen, (newState) => {
  localStorage.setItem('sidebar-state', JSON.stringify(newState))
})

// Resize functionality
const startResize = () => {
  isResizing.value = true
  document.body.classList.add('select-none')
  document.body.classList.add('cursor-col-resize')
}

const stopResize = () => {
  isResizing.value = false
  document.body.classList.remove('select-none')
  document.body.classList.remove('cursor-col-resize')
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isResizing.value) return

  const newWidth = Math.max(200, Math.min(400, event.clientX))
  sidebarWidth.value = newWidth
  localStorage.setItem('sidebar-width', newWidth.toString())
}

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
  <div class="flex h-screen w-screen overflow-hidden bg-background">
    <!-- Sidebar -->
    <div
      :style="{ width: `${sidebarWidth}px` }"
      :class="
        cn(
          'transition-transform duration-300 ease-in-out relative shrink-0',
          !isSidebarOpen && '-translate-x-full',
        )
      "
    >
      <AppSidebar />

      <!-- Resize Handle -->
      <div
        class="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors"
        @mousedown="startResize"
      ></div>
    </div>

    <!-- Main Content -->
    <div
      class="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out max-h-[100vh]"
      :style="{ marginLeft: !isSidebarOpen ? `-${sidebarWidth}px` : '0' }"
    >
      <!-- Top Bar -->
      <div class="sticky top-0 z-10 border-b bg-background text-foreground backdrop-blur-sm">
        <div class="flex items-center justify-between px-4 h-14">
          <div class="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              @click="isSidebarOpen = !isSidebarOpen"
              :title="isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
            >
              <Menu class="h-5 w-5" />
            </Button>
            <BreadcrumbNav />
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

      <!-- Tabs Navigation (only show when not in BashHub) -->
      <AppTabs v-if="!isInBashHub" />

      <!-- Content Area: Use RouterView for all routes -->
      <div class="flex-1 min-h-0 flex flex-col overflow-auto">
        <RouterView class="flex-1 h-full" />
      </div>
    </div>
  </div>
  
  <!-- Toast notifications -->
  <Toaster />
  
  <!-- Global components that need to be available anywhere -->
  <ServerSelectionDialogWrapper />
  
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








