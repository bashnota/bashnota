<script setup lang="ts">
import { RouterView, useRouter, useRoute } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import BreadcrumbNav from './components/layout/BreadcrumbNav.vue'
import AppTabs from './components/layout/AppTabs.vue'
import ServerSelectionDialogWrapper from './components/editor/jupyter/ServerSelectionDialogWrapper.vue'
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Toaster from '@/components/ui/toast/Toaster.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotaStore } from '@/stores/nota'
import { Menu, Home, Globe, FileUp } from 'lucide-vue-next'
import { logger } from '@/services/logger'
import { toast } from '@/lib/utils'

const isSidebarOpen = ref(false)
const sidebarWidth = ref(300)
const isResizing = ref(false)
const authStore = useAuthStore()
const notaStore = useNotaStore()
const route = useRoute()
const router = useRouter()

// File input ref for ipynb import
const ipynbFileInput = ref<HTMLInputElement | null>(null)

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

// IPYNB Import functionality
const handleImportIpynb = () => {
  ipynbFileInput.value?.click()
}

const handleIpynbFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const file = input.files[0]
  if (!file.name.endsWith('.ipynb')) {
    toast('Please select a .ipynb file', 'Invalid File', 'destructive')
    return
  }

  try {
    const fileContent = await readFileAsText(file)
    const notebook = JSON.parse(fileContent)
    
    // Convert notebook to nota format
    const notaContent = convertNotebookToNota(notebook)
    
    // Create a new nota with the converted content
    const title = extractNotebookTitle(notebook, file.name)
    const newNota = await notaStore.createItem(title)
    
    // Update the nota with the converted content
    await notaStore.saveNota({
      id: newNota.id,
      content: JSON.stringify(notaContent)
    })

    toast(`Notebook "${title}" imported successfully`, 'Import Successful')

    // Navigate to the newly created nota
    router.push(`/nota/${newNota.id}`)
    
  } catch (error) {
    logger.error('Failed to import notebook:', error)
    toast('Failed to import the notebook file', 'Import Failed', 'destructive')
  } finally {
    // Reset input
    input.value = ''
  }
}

// Helper function to read file as text
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// Extract title from notebook metadata or filename
const extractNotebookTitle = (notebook: any, filename: string): string => {
  // Try to get title from notebook metadata
  if (notebook.metadata?.title) {
    return notebook.metadata.title
  }
  
  // Try to get title from first markdown cell
  if (notebook.cells && Array.isArray(notebook.cells)) {
    for (const cell of notebook.cells) {
      if (cell.cell_type === 'markdown' && cell.source && Array.isArray(cell.source)) {
        const firstLine = cell.source[0]?.trim()
        if (firstLine && firstLine.startsWith('#')) {
          return firstLine.replace(/^#+\s*/, '')
        }
      }
    }
  }
  
  // Fallback to filename without extension
  return filename.replace('.ipynb', '')
}

// Convert Jupyter notebook to nota format
const convertNotebookToNota = (notebook: any) => {
  if (!notebook.cells || !Array.isArray(notebook.cells)) {
    throw new Error('Invalid notebook format: no cells found')
  }

  const notaContent = {
    type: 'doc',
    content: [] as any[]
  }

  for (const cell of notebook.cells) {
    try {
      const convertedCell = convertNotebookCell(cell)
      if (convertedCell) {
        notaContent.content.push(convertedCell)
      }
    } catch (error) {
      logger.warn('Failed to convert notebook cell:', error, cell)
      // Continue with other cells instead of failing completely
    }
  }

  return notaContent
}

// Convert individual notebook cell to nota format
const convertNotebookCell = (cell: any) => {
  switch (cell.cell_type) {
    case 'markdown':
      return convertMarkdownCell(cell)
    case 'code':
      return convertCodeCell(cell)
    case 'raw':
      return convertRawCell(cell)
    default:
      logger.warn('Unknown cell type:', cell.cell_type)
      return null
  }
}

// Convert markdown cell to nota format
const convertMarkdownCell = (cell: any) => {
  const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''
  
  if (!source.trim()) return null

  return {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: source
      }
    ]
  }
}

// Convert code cell to executable code block
const convertCodeCell = (cell: any) => {
  const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''
  
  if (!source.trim()) return null

  // Determine language from notebook metadata or default to python
  const language = cell.metadata?.language || 'python'
  
  // Convert outputs to string representation
  let outputText = ''
  if (cell.outputs && Array.isArray(cell.outputs)) {
    outputText = convertNotebookOutputs(cell.outputs)
  }

  return {
    type: 'executableCodeBlock',
    attrs: {
      id: crypto.randomUUID(),
      language: language,
      executable: true,
      output: outputText || null,
      kernelName: null,
      serverID: null,
      sessionId: null
    },
    content: [
      {
        type: 'text',
        text: source
      }
    ]
  }
}

// Convert raw cell to plain text
const convertRawCell = (cell: any) => {
  const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''
  
  if (!source.trim()) return null

  return {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: source
      }
    ]
  }
}

// Convert notebook outputs to text representation
const convertNotebookOutputs = (outputs: any[]): string => {
  let result = ''
  
  for (const output of outputs) {
    try {
      switch (output.output_type) {
        case 'stream':
          if (output.text) {
            const text = Array.isArray(output.text) ? output.text.join('') : output.text
            result += text
          }
          break
          
        case 'execute_result':
        case 'display_data':
          if (output.data) {
            // Prefer plain text representation
            if (output.data['text/plain']) {
              const text = Array.isArray(output.data['text/plain']) 
                ? output.data['text/plain'].join('')
                : output.data['text/plain']
              result += text + '\n'
            }
            // Handle HTML output
            else if (output.data['text/html']) {
              const html = Array.isArray(output.data['text/html'])
                ? output.data['text/html'].join('')
                : output.data['text/html']
              result += html + '\n'
            }
          }
          break
          
        case 'error':
          if (output.traceback) {
            const traceback = Array.isArray(output.traceback)
              ? output.traceback.join('\n')
              : output.traceback
            result += `Error: ${output.ename}\n${output.evalue}\n${traceback}\n`
          }
          break
      }
    } catch (error) {
      logger.warn('Failed to convert output:', error, output)
    }
  }
  
  return result.trim()
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
            <!-- Import IPYNB Button -->
            <Button
              variant="outline"
              size="sm"
              @click="handleImportIpynb"
              title="Import Jupyter Notebook (.ipynb)"
            >
              <FileUp class="h-4 w-4 mr-2" />
              Import .ipynb
            </Button>
            
            <!-- BashHub Toggle Button -->
            <Button
              variant="outline"
              size="sm"
              @click="toggleBashHub"
              :class="{'bg-primary/10': isInBashHub}"
            >
              <Globe v-if="isInBashHub" class="h-4 w-4 mr-2" />
              <Home v-else class="h-4 w-4 mr-2" />
              {{ isInBashHub ? 'Community Hub' : 'My Notas' }}
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
  
  <!-- Hidden file input for ipynb import -->
  <input 
    type="file" 
    accept=".ipynb" 
    class="hidden" 
    ref="ipynbFileInput" 
    @change="handleIpynbFileSelect" 
  />
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
