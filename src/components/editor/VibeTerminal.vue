<template>
  <div 
    ref="terminalContainer" 
    class="vibe-terminal"
    :class="{ 
      'vibe-terminal-visible': isVisible,
      'vibe-terminal-bottom': position === 'bottom',
      'vibe-terminal-side': position === 'side',
      'vibe-terminal-fullscreen': isFullscreen
    }"
    :style="getTerminalStyle()"
    role="region"
    aria-label="Vibe Terminal"
  >
    <!-- Resize handles -->
    <div 
      v-if="position === 'bottom' && !isFullscreen"
      class="vibe-terminal-resize-handle vibe-terminal-resize-handle-top" 
      @mousedown="startResizeHeight"
      @mouseenter="isResizeHovered = true"
      @mouseleave="isResizeHovered = false"
      :class="{ 'resize-hover': isResizeHovered || isResizing }"
      aria-label="Resize terminal height"
      role="separator"
    >
      <div class="handle-indicator">
        <div class="handle-line"></div>
        <div class="handle-line"></div>
      </div>
    </div>
    
    <div 
      v-if="position === 'side' && !isFullscreen"
      class="vibe-terminal-resize-handle vibe-terminal-resize-handle-side" 
      @mousedown="startResizeWidth"
      @mouseenter="isResizeHovered = true"
      @mouseleave="isResizeHovered = false"
      :class="{ 'resize-hover': isResizeHovered || isResizing }"
      aria-label="Resize terminal width"
      role="separator"
    >
      <div class="handle-indicator-vertical">
        <div class="handle-line-vertical"></div>
        <div class="handle-line-vertical"></div>
      </div>
    </div>
    
    <!-- Terminal header with shadcn components -->
    <div class="border-b bg-card vibe-terminal-header">
      <Tabs :defaultValue="`vibe-${activeTabIndex + 1}`" class="w-full">
        <div class="flex justify-between items-center border-b px-1">
          <TabsList class="vibe-tabs overflow-x-auto flex-1 max-w-[calc(100%-9rem)]">
            <TabsTrigger 
              v-for="(tab, index) in tabs" 
              :key="index"
              :value="`vibe-${index + 1}`"
              class="relative pr-8 whitespace-nowrap"
              @click="setActiveTab(index)"
              :class="{ 'active-tab': activeTabIndex === index }"
              :aria-label="`Switch to tab: ${tab.title}`"
            >
              <div class="flex items-center gap-1 max-w-xs truncate">
                <Zap v-if="isActiveTab(tab)" class="h-3 w-3 text-primary" />
                <span class="truncate">{{ tab.title }}</span>
              </div>
              <Button
                v-if="tabs.length > 1"
                variant="ghost" 
                size="icon" 
                class="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full p-0 opacity-60 hover:opacity-100 transition-opacity"
                @click.stop="closeTab(index)"
                :aria-label="`Close tab: ${tab.title}`"
              >
                <X class="h-3 w-3" />
              </Button>
            </TabsTrigger>
            
            <!-- New tab button -->
            <Button
              variant="ghost"
              size="sm"
              class="h-7 px-2 ml-1"
              @click="createNewTab"
              aria-label="Create new tab"
            >
              <Plus class="h-3.5 w-3.5" />
            </Button>
          </TabsList>
          
          <!-- Terminal controls -->
          <div class="flex gap-1 ml-1">
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              :aria-label="position === 'bottom' ? 'Switch to side panel' : 'Switch to bottom panel'"
              @click="togglePosition"
            >
              <LayoutTemplate v-if="position === 'bottom'" class="h-3.5 w-3.5" />
              <AlignJustify v-else class="h-3.5 w-3.5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              :aria-label="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
              @click="toggleFullscreen"
            >
              <Expand v-if="!isFullscreen" class="h-3.5 w-3.5" />
              <Shrink v-else class="h-3.5 w-3.5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              :aria-label="isMaximized ? 'Restore terminal size' : 'Maximize terminal'"
              @click="toggleMaximize"
              v-if="!isFullscreen"
            >
              <Maximize2 v-if="!isMaximized" class="h-3.5 w-3.5" />
              <Minimize2 v-else class="h-3.5 w-3.5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              aria-label="Minimize terminal"
              @click="toggleTerminal"
            >
              <Minus class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        <!-- Terminal content -->
        <div class="vibe-terminal-content bg-background">
          <TabsContent 
            v-for="(tab, index) in tabs" 
            :key="index"
            :value="`vibe-${index + 1}`"
            class="p-0 m-0 data-[state=active]:h-full focus:outline-none vibe-tab-content"
            :tabindex="activeTabIndex === index ? 0 : -1"
          >
            <Card class="border-0 shadow-none rounded-none h-full overflow-auto bg-card">
              <CardContent class="p-0 h-full bg-card">
                <VibeBlock 
                  v-if="tab.vibeBlock"
                  :ref="(el: any) => { if (el) tabRefs[index] = el }"
                  :node="tab.vibeBlock.node"
                  :editor="tab.vibeBlock.editor"
                  :updateAttributes="tab.vibeBlock.updateAttributes"
                  :deleteNode="tab.vibeBlock.deleteNode"
                  :getPos="tab.vibeBlock.getPos"
                  :terminalMode="true"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import VibeBlock from './blocks/vibe-block/VibeBlock.vue'
import { v4 as uuidv4 } from 'uuid'
import { useVibeStore } from '@/stores/vibeStore'
import { Editor } from '@tiptap/vue-3'
import { 
  X, 
  Plus, 
  Maximize2, 
  Minimize2, 
  Minus, 
  Zap,
  LayoutTemplate,
  AlignJustify,
  Expand,
  Shrink
} from 'lucide-vue-next'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  editor: Editor | null
}

const props = defineProps<Props>()

const emit = defineEmits(['toggle', 'resize'])

const vibeStore = useVibeStore()
const isVisible = ref(false)
const isMaximized = ref(false)
const isFullscreen = ref(false)
const isResizing = ref(false)
const isResizeHovered = ref(false)
const position = ref<'bottom' | 'side'>('bottom')
const previousHeight = ref(300) // Store height before maximizing
const previousWidth = ref(400) // Store width before maximizing
const terminalHeight = ref(300)
const terminalWidth = ref(400)
const terminalContainer = ref<HTMLElement | null>(null)
const minHeight = 150
const maxHeight = 800
const minWidth = 300
const maxWidth = 800
const activeTabIndex = ref(0)
const tabs = ref<{title: string, vibeBlock: any}[]>([])
const tabRefs = ref<Record<number, any>>({})

// Start with an initial tab
onMounted(() => {
  // Create a default tab
  createNewTab()
  
  // Set up event listeners for resize
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
  
  // Restore previous terminal state if available
  const savedHeight = localStorage.getItem('vibe-terminal-height')
  if (savedHeight) {
    terminalHeight.value = parseInt(savedHeight)
    previousHeight.value = terminalHeight.value
  }
  
  const savedWidth = localStorage.getItem('vibe-terminal-width')
  if (savedWidth) {
    terminalWidth.value = parseInt(savedWidth)
    previousWidth.value = terminalWidth.value
  }
  
  // Restore position if available
  const savedPosition = localStorage.getItem('vibe-terminal-position')
  if (savedPosition === 'side' || savedPosition === 'bottom') {
    position.value = savedPosition as 'bottom' | 'side'
  }
  
  // Restore maximized state if available
  const savedMaximized = localStorage.getItem('vibe-terminal-maximized')
  if (savedMaximized) {
    isMaximized.value = savedMaximized === 'true'
  }
  
  // Restore fullscreen state if available
  const savedFullscreen = localStorage.getItem('vibe-terminal-fullscreen')
  if (savedFullscreen) {
    isFullscreen.value = savedFullscreen === 'true'
  }
  
  // Listen for vibe command
  if (props.editor) {
    props.editor.on('vibe:command', handleVibeCommand)
  }

  // Set initial position
  if (isVisible.value) {
    applyTerminalPosition()
  }
  
  // Add window resize listener
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
  window.removeEventListener('resize', handleWindowResize)
  
  if (props.editor) {
    props.editor.off('vibe:command', handleVibeCommand)
  }
})

// Handle window resize
const handleWindowResize = () => {
  // Prevent terminal from being too big when window is resized
  if (position.value === 'bottom') {
    if (terminalHeight.value > window.innerHeight * 0.8) {
      terminalHeight.value = Math.round(window.innerHeight * 0.5)
      applyTerminalPosition()
    }
  } else if (position.value === 'side') {
    if (terminalWidth.value > window.innerWidth * 0.8) {
      terminalWidth.value = Math.round(window.innerWidth * 0.3)
      applyTerminalPosition()
    }
  }
  
  // Always reapply position on window resize
  applyTerminalPosition()
}

// Handle vibe command from the editor
const handleVibeCommand = (details: { query: string, isActive: boolean }) => {
  // Show the terminal
  if (!isVisible.value) {
    isVisible.value = true
    nextTick(() => {
      applyTerminalPosition()
    })
  }
  
  // If the active tab is empty, use it, otherwise create a new tab
  const activeTab = tabs.value[activeTabIndex.value]
  if (!activeTab.vibeBlock || !activeTab.vibeBlock.node.attrs.isActive) {
    activeTab.vibeBlock = createVibeBlock(details.query)
  } else {
    createNewTab(details.query)
  }
}

// Check if a tab has an active vibe block
const isActiveTab = (tab: {title: string, vibeBlock: any}) => {
  return tab.vibeBlock && tab.vibeBlock.node.attrs.isActive
}

// Get terminal style based on position and size
const getTerminalStyle = () => {
  if (isFullscreen.value) {
    return {
      height: '100vh',
      width: '100vw'
    }
  }
  
  if (position.value === 'bottom') {
    return {
      height: `${terminalHeight.value}px`,
      width: '100%'
    }
  } else {
    return {
      height: '100vh',
      width: `${terminalWidth.value}px`
    }
  }
}

// Toggle between bottom and side position
const togglePosition = () => {
  position.value = position.value === 'bottom' ? 'side' : 'bottom'
  localStorage.setItem('vibe-terminal-position', position.value)
  
  // When changing position, reset maximized state
  isMaximized.value = false
  
  // Use appropriate previous dimensions
  if (position.value === 'bottom') {
    terminalHeight.value = previousHeight.value
  } else {
    terminalWidth.value = previousWidth.value
  }
  
  nextTick(() => {
    applyTerminalPosition()
  })
}

// Toggle fullscreen mode
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  
  // Save state
  localStorage.setItem('vibe-terminal-fullscreen', isFullscreen.value.toString())
  
  // When entering fullscreen, set maximized to false
  if (isFullscreen.value) {
    isMaximized.value = false
  }
  
  nextTick(() => {
    applyTerminalPosition()
  })
}

// Create a vibe block for a tab
const createVibeBlock = (query = '') => {
  // Create a new vibe block with UUIDs
  const sessionId = uuidv4()
  const taskBoardId = uuidv4()
  
  // Create an actual board in the vibeStore to prevent "board not found" errors
  try {
    // Create a board with our specific ID
    const board = vibeStore.createBoard({
      query: query || 'New Vibe Session',
      jupyterConfig: null
    })
    
    // Make sure we're using the created board's ID for our vibe block
    return {
      node: {
        attrs: {
          query,
          sessionId,
          taskBoardId: board.id, // Use the board's ID
          isActive: false,
          isLoading: false,
          error: '',
        },
        type: 'vibe',
      },
      editor: props.editor,
      updateAttributes: (attrs: Record<string, any>) => {
        // Update attributes in the current tab's vibe block
        const currentTab = tabs.value[activeTabIndex.value]
        if (currentTab && currentTab.vibeBlock) {
          Object.assign(currentTab.vibeBlock.node.attrs, attrs)
        }
      },
      deleteNode: () => {
        // Close the current tab
        closeTab(activeTabIndex.value)
      },
      getPos: () => {
        // Return dummy position
        return 0
      }
    }
  } catch (error) {
    console.error('Error creating vibe board:', error)
    
    // Return a fallback block even if board creation fails
    return {
      node: {
        attrs: {
          query,
          sessionId,
          taskBoardId,
          isActive: false,
          isLoading: false,
          error: 'Failed to create board: ' + (error instanceof Error ? error.message : String(error)),
        },
        type: 'vibe',
      },
      editor: props.editor,
      updateAttributes: (attrs: Record<string, any>) => {
        const currentTab = tabs.value[activeTabIndex.value]
        if (currentTab && currentTab.vibeBlock) {
          Object.assign(currentTab.vibeBlock.node.attrs, attrs)
        }
      },
      deleteNode: () => {
        closeTab(activeTabIndex.value)
      },
      getPos: () => {
        return 0
      }
    }
  }
}

// Create a new tab
const createNewTab = (queryOrEvent?: string | MouseEvent) => {
  // Determine if the parameter is a query string or an event
  const query = typeof queryOrEvent === 'string' ? queryOrEvent : ''
  
  // Create a descriptive title based on the query
  const tabTitle = query 
    ? `${query.substring(0, 25)}${query.length > 25 ? '...' : ''}`
    : `Vibe ${tabs.value.length + 1}`
    
  const newTab = {
    title: tabTitle,
    vibeBlock: createVibeBlock(query)
  }
  
  tabs.value.push(newTab)
  activeTabIndex.value = tabs.value.length - 1
}

// Set the active tab
const setActiveTab = (index: number) => {
  activeTabIndex.value = index
  
  // Focus the tab content for better accessibility
  nextTick(() => {
    const tabContentElement = document.querySelector(`[value="vibe-${index + 1}"][role="tabpanel"]`)
    if (tabContentElement) {
      (tabContentElement as HTMLElement).focus()
    }
  })
}

// Close a tab
const closeTab = (index: number) => {
  if (tabs.value.length <= 1) {
    // Don't close the last tab, just hide the terminal
    isVisible.value = false
    return
  }
  
  // Remove the tab
  tabs.value.splice(index, 1)
  
  // Adjust active tab index if needed
  if (activeTabIndex.value >= tabs.value.length) {
    activeTabIndex.value = tabs.value.length - 1
  }
}

// Toggle terminal visibility
const toggleTerminal = () => {
  isVisible.value = !isVisible.value
  emit('toggle', isVisible.value)
  
  if (isVisible.value) {
    nextTick(() => {
      applyTerminalPosition()
    })
  }
}

// Toggle maximize state
const toggleMaximize = () => {
  if (isMaximized.value) {
    // Restore previous dimensions
    if (position.value === 'bottom') {
      terminalHeight.value = previousHeight.value
    } else {
      terminalWidth.value = previousWidth.value
    }
    isMaximized.value = false
  } else {
    // Store current dimensions and maximize
    if (position.value === 'bottom') {
      previousHeight.value = terminalHeight.value
      terminalHeight.value = window.innerHeight - 100 // Leave space for the top bar
    } else {
      previousWidth.value = terminalWidth.value
      terminalWidth.value = Math.min(800, window.innerWidth - 200) // Leave space for the editor
    }
    isMaximized.value = true
  }
  
  // Apply the new position and save state
  applyTerminalPosition()
  localStorage.setItem('vibe-terminal-maximized', isMaximized.value.toString())
  
  if (position.value === 'bottom') {
    localStorage.setItem('vibe-terminal-height', terminalHeight.value.toString())
  } else {
    localStorage.setItem('vibe-terminal-width', terminalWidth.value.toString())
  }
  
  emit('resize', { 
    height: terminalHeight.value, 
    width: terminalWidth.value,
    isMaximized: isMaximized.value,
    position: position.value
  })
}

// Apply terminal position based on current state
const applyTerminalPosition = () => {
  // If fullscreen, don't adjust anything else
  if (isFullscreen.value) {
    document.body.classList.add('vibe-fullscreen-active')
    return
  } else {
    document.body.classList.remove('vibe-fullscreen-active')
  }
  
  // Find key elements
  const editorContent = document.querySelector('.editor-content') as HTMLElement
  const editorContainer = document.querySelector('.flex-1.relative.overflow-auto') as HTMLElement
  const sidebar = document.querySelector('.sidebar') as HTMLElement
  
  if (position.value === 'bottom') {
    // Bottom position adjustments
    if (editorContent && terminalContainer.value) {
      // Adjust editor height to make room for terminal
      const mainOffset = isMaximized.value ? 120 : 50
      editorContent.style.height = `calc(100vh - ${terminalHeight.value + mainOffset}px)`
    }
    
    if (editorContainer) {
      editorContainer.style.paddingBottom = `${terminalHeight.value}px`
      editorContainer.style.paddingRight = '0'
    }
    
    if (sidebar) {
      sidebar.style.paddingBottom = `${terminalHeight.value}px`
    }
  } else {
    // Side position adjustments
    if (editorContent) {
      // Reset height adjustment
      editorContent.style.height = 'calc(100vh - 50px)'
    }
    
    if (editorContainer) {
      editorContainer.style.paddingBottom = '0'
      editorContainer.style.paddingRight = `${terminalWidth.value}px`
    }
    
    if (sidebar) {
      // Make sure sidebar is visible
      sidebar.style.paddingBottom = '0'
      sidebar.style.zIndex = '51' // Above terminal
    }
  }
}

// Resize height functionality
const startResizeHeight = (event: MouseEvent) => {
  isResizing.value = true
  event.preventDefault()
  document.body.classList.add('select-none')
  document.body.classList.add('cursor-row-resize')
}

// Resize width functionality
const startResizeWidth = (event: MouseEvent) => {
  isResizing.value = true
  event.preventDefault()
  document.body.classList.add('select-none')
  document.body.classList.add('cursor-col-resize')
}

const stopResize = () => {
  if (isResizing.value) {
    isResizing.value = false
    document.body.classList.remove('select-none')
    document.body.classList.remove('cursor-row-resize')
    document.body.classList.remove('cursor-col-resize')
    
    // Save the terminal dimensions
    if (position.value === 'bottom') {
      localStorage.setItem('vibe-terminal-height', terminalHeight.value.toString())
    } else {
      localStorage.setItem('vibe-terminal-width', terminalWidth.value.toString())
    }
    
    emit('resize', { 
      height: terminalHeight.value, 
      width: terminalWidth.value,
      isMaximized: isMaximized.value,
      position: position.value
    })
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isResizing.value) return
  
  if (position.value === 'bottom') {
    // Height resize
    // Calculate the new height based on mouse position
    // Since the terminal is at the bottom, we need to calculate from the bottom up
    const newHeight = Math.max(minHeight, Math.min(
      isMaximized.value ? window.innerHeight - 100 : maxHeight, 
      window.innerHeight - event.clientY
    ))
    
    terminalHeight.value = newHeight
  } else {
    // Width resize
    // Calculate the new width based on mouse position from right edge
    const newWidth = Math.max(minWidth, Math.min(
      isMaximized.value ? window.innerWidth - 200 : maxWidth,
      window.innerWidth - event.clientX
    ))
    
    terminalWidth.value = newWidth
  }
  
  applyTerminalPosition()
  
  // If user is manually resizing, turn off maximized mode
  if (isMaximized.value) {
    isMaximized.value = false
    localStorage.setItem('vibe-terminal-maximized', 'false')
  }
}
</script>

<style scoped>
.vibe-terminal {
  position: fixed;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  z-index: 49;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease, box-shadow 0.2s ease, height 0.3s ease, width 0.3s ease;
  background-color: hsl(var(--background));
  overflow: hidden;
}

/* Terminal positions */
.vibe-terminal-bottom {
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  transform: translateY(100%);
}

.vibe-terminal-side {
  top: 0;
  right: 0;
  bottom: 0;
  height: 100vh;
  transform: translateX(100%);
}

.vibe-terminal-fullscreen {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
}

.vibe-terminal-visible {
  transform: translate(0);
}

.vibe-terminal-header {
  flex-shrink: 0;
}

.vibe-terminal-content {
  flex-grow: 1;
  overflow: hidden;
  position: relative;
}

.vibe-tab-content {
  height: 100%;
  overflow-y: auto;
}

/* Resize handles */
.vibe-terminal-resize-handle {
  position: absolute;
  z-index: 2;
  transition: background-color 0.2s ease;
}

.vibe-terminal-resize-handle-top {
  top: -6px;
  left: 0;
  right: 0;
  height: 12px;
  cursor: row-resize;
  display: flex;
  justify-content: center;
  align-items: center;
}

.vibe-terminal-resize-handle-side {
  top: 0;
  bottom: 0;
  left: -6px;
  width: 12px;
  cursor: col-resize;
  display: flex;
  justify-content: center;
  align-items: center;
}

.resize-hover .handle-indicator,
.vibe-terminal-resize-handle:hover .handle-indicator {
  opacity: 1;
}

.resize-hover .handle-indicator-vertical,
.vibe-terminal-resize-handle:hover .handle-indicator-vertical {
  opacity: 1;
}

.handle-indicator {
  width: 60px;
  height: 4px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  opacity: 0.3;
  transition: opacity 0.2s ease;
}

.handle-indicator-vertical {
  height: 60px;
  width: 4px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  opacity: 0.3;
  transition: opacity 0.2s ease;
}

.handle-line {
  height: 1px;
  width: 100%;
  background-color: hsl(var(--primary));
  margin: 1px 0;
}

.handle-line-vertical {
  width: 1px;
  height: 100%;
  background-color: hsl(var(--primary));
  margin: 0 1px;
}

/* Override tabs to look more like terminal tabs */
.vibe-tabs {
  background-color: transparent;
  padding: 0;
  height: 36px;
  scrollbar-width: none; /* Firefox */
}

.vibe-tabs::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}

.active-tab {
  font-weight: 500;
  border-bottom-color: hsl(var(--primary)) !important;
}

/* Force backgrounds on shadcn components */
:deep(.shadcn-tab) {
  background-color: hsl(var(--card)) !important;
}

:deep([data-state="active"]) {
  background-color: hsl(var(--background)) !important;
}

:deep(.card) {
  background-color: hsl(var(--card)) !important;
}

:deep(.card-content) {
  background-color: hsl(var(--card)) !important;
}

/* Ensure all content has proper focus outlines */
:deep(*:focus-visible) {
  outline: 2px solid hsl(var(--ring));
  outline-offset: -1px;
}

/* Fullscreen body styles */
:global(body.vibe-fullscreen-active) {
  overflow: hidden;
}

/* Dark mode enhancements */
:global(.dark) .vibe-terminal {
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
}

:global(.dark) .handle-line,
:global(.dark) .handle-line-vertical {
  background-color: hsl(var(--primary));
}
</style> 