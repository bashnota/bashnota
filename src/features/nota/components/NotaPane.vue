<template>
  <div 
    class="h-full w-full flex flex-col bg-background border-r border-border overflow-hidden"
    :class="{ 'border-primary border-2': isActive }"
    @click="handlePaneClick"
  >
    <!-- Pane Tabs (when there are multiple tabs) -->
    <PaneTabs 
      :pane="pane"
      @split-horizontal="splitHorizontal"
      @split-vertical="splitVertical"
      @close-pane="closePane"
    />
    
    <!-- Drop Zone (when no nota) -->
    <div 
      v-if="!pane.notaId"
      class="flex-1 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 m-4 rounded-lg"
      :class="{ 
        'border-primary bg-primary/10': isDragOver,
        'border-muted-foreground/50 bg-muted/5': !isDragOver 
      }"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div class="text-center text-muted-foreground">
        <FileText class="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p class="text-sm">Drop a tab here to split the view</p>
        <p class="text-xs mt-1">or select a tab to view in this pane</p>
      </div>
    </div>
    
    <!-- Nota Content -->
    <div v-else class="flex-1 min-h-0 w-full overflow-hidden">
      <template v-if="isReady && nota">
        <NotaEditor
          :nota-id="pane.notaId"
          :key="pane.notaId"
          :can-run-all="nota && nota.config?.savedSessions && nota.config?.savedSessions.length > 0"
          :is-executing-all="isExecutingAll"
          @run-all="executeAllCells"
          :is-favorite="nota?.favorite"
          @update:favorite="toggleFavorite"
          @update:tags="handleTagsUpdate"
          @share="toggleShareDialog"
          @open-config="toggleConfigModal"
          @export-nota="exportNota"
          class="h-full w-full"
          ref="notaEditorRef"
        />
      </template>
      
      <div v-else class="flex items-center justify-center h-full">
        <p class="text-muted-foreground">Loading...</p>
      </div>
    </div>
    
    <!-- Modals -->
    <NotaConfigModal
      v-if="pane.notaId"
      :nota-id="pane.notaId"
      :open="showConfigModal"
      @update:open="showConfigModal = $event"
    />
    
    <PublishNotaModal
      v-if="pane.notaId"
      :nota-id="pane.notaId"
      :open="showShareDialog"
      @update:open="showShareDialog = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'

import { useLayoutStore, type Pane } from '@/stores/layoutStore'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import NotaEditor from '@/features/editor/components/NotaEditor.vue'
import { useEditorStore } from '@/features/editor/stores/editorStore'
import NotaConfigModal from '@/features/editor/components/blocks/nota-config/NotaConfigModal.vue'
import PublishNotaModal from '@/features/editor/components/dialogs/PublishNotaModal.vue'
import PaneTabs from './PaneTabs.vue'
import { 
  X, 
  FileText, 
  SplitSquareHorizontal, 
  SplitSquareVertical 
} from 'lucide-vue-next'
import { logger } from '@/services/logger'

const props = defineProps<{
  pane: Pane
}>()

// Stores
const notaStore = useNotaStore()
const jupyterStore = useJupyterStore()
const layoutStore = useLayoutStore()
const codeExecutionStore = useCodeExecutionStore()
const editorStore = useEditorStore()

// State
const isExecutingAll = ref(false)
const isReady = ref(false)
const showConfigModal = ref(false)
const showShareDialog = ref(false)
const isDragOver = ref(false)
const notaEditorRef = ref<InstanceType<typeof NotaEditor> | null>(null)

// Computed properties
const nota = computed(() => {
  return props.pane.notaId ? notaStore.getCurrentNota(props.pane.notaId) : null
})

const isActive = computed(() => props.pane.isActive)

// Watch for active state changes to update the editor store
watch(isActive, (active) => {
  if (active) {
    editorStore.setActiveEditor(notaEditorRef.value?.editor || null)
    editorStore.setActiveEditorComponent(notaEditorRef.value || null)
  } else {
    // When pane is inactive, check if it was the active one
    if (editorStore.activeEditor === notaEditorRef.value?.editor) {
      editorStore.setActiveEditor(null)
      editorStore.setActiveEditorComponent(null)
    }
  }
})

// Watch for when the editor becomes available and set it as active if this pane is active
watch(
  () => notaEditorRef.value?.editor,
  (newEditor) => {
    if (newEditor && isActive.value) {
      editorStore.setActiveEditor(newEditor)
      editorStore.setActiveEditorComponent(notaEditorRef.value)
    }
  }
)

const loadNota = async (notaId: string) => {
  try {
    isReady.value = false
    
    // Ensure the nota is loaded
    const loadedNota = await notaStore.loadNota(notaId)
    
    // Initialize tags array if it doesn't exist
    if (loadedNota && !loadedNota.tags) {
      loadedNota.tags = []
      await notaStore.saveItem(loadedNota)
    }
    
    // Tab registration is now handled by the layout store
    // when openNotaInPane is called

    // Check if this is a root nota and has no Jupyter servers configured
    if (loadedNota && !loadedNota.parentId && jupyterStore.jupyterServers.length === 0) {
      toast({
        title: 'Configure Jupyter',
        description: 'Set up your Jupyter server to enable code execution in this notebook.',
      })
    }
    
    isReady.value = true
  } catch (error) {
    logger.error('Error loading nota in pane:', error)
    toast({
      title: 'Error',
      description: 'Failed to load notebook. Please try again.',
      variant: 'destructive'
    })
  }
}

// Watch for nota changes
watch(
  () => props.pane.notaId,
  async (newNotaId) => {
    if (newNotaId) {
      await loadNota(newNotaId)
    } else {
      isReady.value = false
    }
  },
  { immediate: true }
)

// Tab title updates are now handled by PaneTabs component

// Handlers
const handlePaneClick = () => {
  if (!isActive.value) {
    layoutStore.setActivePane(props.pane.id)
  }
}

const handleDragOver = (event: DragEvent) => {
  if (layoutStore.draggedTab) {
    isDragOver.value = true
  }
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  
  if (layoutStore.draggedTab && !props.pane.notaId) {
    // Move the dragged nota to this pane
    layoutStore.openNotaInPane(layoutStore.draggedTab, props.pane.id)
    layoutStore.setDraggedTab(null)
  }
}

const splitHorizontal = () => {
  layoutStore.splitPane(props.pane.id, 'horizontal')
}

const splitVertical = () => {
  layoutStore.splitPane(props.pane.id, 'vertical')
}

const closePane = () => {
  layoutStore.closePane(props.pane.id)
}

const executeAllCells = async () => {
  isExecutingAll.value = true
  try {
    await codeExecutionStore.executeAll()
  } catch (error) {
    logger.error('Error executing all cells:', error)
    toast({
      title: 'Execution Error',
      description: 'Failed to execute all cells. Please check your code or server connection.',
      variant: 'destructive'
    })
  } finally {
    isExecutingAll.value = false
  }
}

const toggleConfigModal = () => {
  showConfigModal.value = !showConfigModal.value
}

const toggleShareDialog = () => {
  showShareDialog.value = !showShareDialog.value
}

const exportNota = async () => {
  if (!props.pane.notaId) return
  
  try {
    const notas = await notaStore.exportNota(props.pane.notaId)
    
    // Create file content
    const fileContent = JSON.stringify(notas, null, 2)
    
    // Create blob and download link
    const blob = new Blob([fileContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    // Create download link
    const link = document.createElement('a')
    link.href = url
    link.download = `${nota.value?.title || 'nota'}.nota`
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast({
      title: 'Export Complete',
      description: 'Your nota has been exported successfully.'
    })
  } catch (error) {
    logger.error('Error exporting nota:', error)
    toast({
      title: 'Export Error',
      description: 'Failed to export nota. Please try again.',
      variant: 'destructive'
    })
  }
}

const toggleFavorite = () => {
  if (!props.pane.notaId) return
  notaStore.toggleFavorite(props.pane.notaId)
}

const handleTagsUpdate = (tags: string[]) => {
  if (nota.value) {
    nota.value.tags = tags
  }
}

const saveVersion = async () => {
  await notaEditorRef.value?.saveVersion()
}

const openHistory = () => {
  if (notaEditorRef.value) {
    notaEditorRef.value.showVersionHistory = true
  }
}

// Expose methods for parent components
defineExpose({
  pane: props.pane,
  notaEditorRef,
  executeAllCells,
  toggleFavorite,
  toggleConfigModal,
  toggleShareDialog,
  exportNota,
  saveVersion,
  openHistory,
})
</script> 