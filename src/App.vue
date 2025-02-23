<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import BreadcrumbNav from './components/layout/BreadcrumbNav.vue'
import { Bars3Icon as MenuIcon } from '@heroicons/vue/24/solid'
import { ref, onMounted, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Toaster from '@/components/ui/toast/Toaster.vue'

const isSidebarOpen = ref(true)
const sidebarWidth = ref(300)
const isResizing = ref(false)

onMounted(() => {
  const savedState = localStorage.getItem('sidebar-state')
  if (savedState) {
    isSidebarOpen.value = JSON.parse(savedState)
  }
  const savedWidth = localStorage.getItem('sidebar-width')
  if (savedWidth) {
    sidebarWidth.value = parseInt(savedWidth)
  }

  // Setup resize handling
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
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
      class="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
      :style="{ marginLeft: !isSidebarOpen ? `-${sidebarWidth}px` : '0' }"
    >
      <!-- Top Bar -->
      <div class="sticky top-0 z-10 border-b bg-slate-100 dark:bg-slate-900 backdrop-blur-sm">
        <div class="flex items-center justify-between px-4 h-14">
          <div class="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              @click="isSidebarOpen = !isSidebarOpen"
              :title="isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
            >
              <MenuIcon class="h-5 w-5" />
            </Button>
            <BreadcrumbNav />
          </div>
        </div>
      </div>

      <!-- Router View -->
      <div class="flex-1 overflow-auto">
        <RouterView />
      </div>
    </div>
  </div>
  <Toaster />
</template>
