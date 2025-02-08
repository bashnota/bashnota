<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import BreadcrumbNav from './components/BreadcrumbNav.vue'
import GlobalSearch from './components/GlobalSearch.vue'
import KeyboardShortcuts from './components/KeyboardShortcuts.vue'
import ShortcutsDialog from './components/ShortcutsDialog.vue'
import ColorSchemeToggle from './components/ColorSchemeToggle.vue'
import { Bars3Icon as MenuIcon } from '@heroicons/vue/24/solid'
import { ref, onMounted, watch } from 'vue'
import { useNotaStore } from '@/stores/nota'

const shortcutsDialog = ref()
const isSidebarOpen = ref(true)
const sidebarWidth = ref(250)
const isResizing = ref(false)
const store = useNotaStore()

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

// Load saved sidebar state
onMounted(() => {
  // Load data
  store.loadNotas()
  store.loadPages()

  const savedState = localStorage.getItem('sidebar-state')
  if (savedState) {
    isSidebarOpen.value = JSON.parse(savedState)
  }
  const savedWidth = localStorage.getItem('sidebar-width')
  if (savedWidth) {
    sidebarWidth.value = parseInt(savedWidth)
  }
})

// Save sidebar state when changed
watch(isSidebarOpen, (newState) => {
  localStorage.setItem('sidebar-state', JSON.stringify(newState))
})

const showShortcuts = () => {
  shortcutsDialog.value.isOpen = true
}

const startResize = (event: MouseEvent) => {
  isResizing.value = true
  document.body.classList.add('resizing')
  const startX = event.clientX
  const startWidth = sidebarWidth.value

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return
    const newWidth = startWidth + (e.clientX - startX)
    sidebarWidth.value = Math.max(200, Math.min(400, newWidth))
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth.value}px`)
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.body.classList.remove('resizing')
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    localStorage.setItem('sidebar-width', sidebarWidth.value.toString())
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const resetWidth = () => {
  sidebarWidth.value = 250
  document.documentElement.style.setProperty('--sidebar-width', '250px')
  localStorage.setItem('sidebar-width', '250')
}
</script>

<template>
  <div class="app-container">
    <AppSidebar
      class="sidebar"
      :class="{ closed: !isSidebarOpen }"
      :style="{ width: sidebarWidth + 'px' }"
    />
    <div
      v-if="isSidebarOpen"
      class="resize-handle"
      @mousedown="startResize"
      @dblclick="resetWidth"
    ></div>
    <div class="main-content">
      <div class="top-bar">
        <button
          class="menu-button"
          @click="isSidebarOpen = !isSidebarOpen"
          :title="`${isSidebarOpen ? 'Hide' : 'Show'} sidebar (⌘B)`"
        >
          <MenuIcon class="icon" />
        </button>
        <BreadcrumbNav />
        <div class="top-bar-right">
          <GlobalSearch />
          <ColorSchemeToggle />
          <button class="icon-button" @click="showShortcuts" title="Keyboard shortcuts">
            <KeyIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
      <RouterView />
    </div>
    <KeyboardShortcuts />
    <ShortcutsDialog ref="shortcutsDialog" @toggleSidebar="toggleSidebar" />
  </div>
</template>

<style>
:root {
  --sidebar-width: 250px;
  --sidebar-min-width: 200px;
  --sidebar-max-width: 400px;
  --resize-handle-width: 4px;
}

.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.sidebar {
  width: var(--sidebar-width);
  border-right: 1px solid var(--color-border);
  transition: all 0.3s ease;
  transform: translateX(0);
}

.sidebar.closed {
  width: 0;
  transform: translateX(-100%);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 0;
}

.sidebar.closed + .main-content {
  margin-left: -250px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  gap: 1rem;
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon-button {
  padding: 0.5rem;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--color-text-light);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-button:hover {
  background: var(--color-background-mute);
  color: var(--color-text);
}

.menu-button {
  padding: 0.5rem;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--color-text-light);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-button:hover {
  background: var(--color-background-mute);
  color: var(--color-text);
}

.menu-button .icon {
  width: 1.25rem;
  height: 1.25rem;
}

.resize-handle {
  width: 4px;
  cursor: col-resize;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  transform: translateX(calc(var(--sidebar-width) - 2px));
  background: transparent;
  transition: all 0.3s ease;
}

.resize-handle:hover,
.resize-handle:active {
  background: var(--color-primary);
  transform: translateX(calc(var(--sidebar-width) - 2px)) scaleX(2);
}

body.resizing {
  cursor: col-resize;
  user-select: none;
}
</style>
