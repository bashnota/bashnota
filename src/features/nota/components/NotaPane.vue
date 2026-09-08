<template>
  <div 
    class="h-full w-full max-h-full flex flex-col bg-background border-r border-border overflow-hidden"
    :class="{ 'border-primary border-2': isActive }"
    :data-pane-id="pane.id"
    @click.capture="handlePaneClick"
    @focusin="handlePaneClick"
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
    <div v-else class="flex-1 min-h-0 w-full max-h-full overflow-hidden">
      <template v-if="loadState === 'ready' && isReady && nota">
        <BlockCommandMenu :editor-view="notaEditorRef?.editor?.view">
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
        </BlockCommandMenu>
      </template>
      
      <div v-else-if="loadState === 'loading'" class="flex items-center justify-center h-full">
        <div class="flex flex-col items-center gap-4 p-8 rounded-lg bg-card border shadow-lg">
          <div class="flex items-center gap-3" role="status" aria-live="polite">
            <div class="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <div class="flex flex-col">
              <h3 class="text-lg font-semibold">Loading Nota</h3>
              <p class="text-sm text-muted-foreground">Please wait while we prepare your notebook...</p>
            </div>
          </div>
          
          <!-- Progress indicators -->
          <div class="w-full space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span>Nota</span>
              <span :class="loadingStep !== 'nota' ? 'text-green-600' : 'text-muted-foreground'">
                {{ loadingStep !== 'nota' ? '✓ Loaded' : '⏳ Loading...' }}
              </span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span>Editor</span>
              <span :class="loadingStep === 'ready' ? 'text-green-600' : 'text-muted-foreground'">
                {{ loadingStep === 'ready' ? '✓ Ready' : '⏳ Initializing...' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex items-center justify-center h-full p-4">
        <section class="flex max-w-md flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center shadow-lg" role="alert">
          <FileText class="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <div class="space-y-1">
            <h3 class="text-lg font-semibold">
              {{ loadState === 'not-found' ? 'Nota not found' : 'Unable to read nota' }}
            </h3>
            <p class="text-sm text-muted-foreground">
              <template v-if="loadState === 'not-found'">
                This notebook no longer exists or is unavailable in the selected storage.
              </template>
              <template v-else>
                {{ loadError || 'The notebook could not be read. Check your storage connection and try again.' }}
              </template>
            </p>
          </div>
          <div class="flex flex-wrap justify-center gap-2">
            <button type="button" class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" @click.stop="retryLoad">
              Retry
            </button>
            <button type="button" class="rounded-md border px-3 py-2 text-sm font-medium" @click.stop="goHome">
              Home
            </button>
            <button type="button" class="rounded-md border px-3 py-2 text-sm font-medium" @click.stop="closeStaleTab">
              Close stale tab
            </button>
          </div>
        </section>
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
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'

import { useLayoutStore, type Pane } from '@/stores/layoutStore'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { toast } from '@/services/toast'
import NotaEditor from '@/features/editor/components/NotaEditor.vue'
import BlockCommandMenu from '@/features/editor/components/ui/BlockCommandMenu.vue'
import { useEditorStore } from '@/features/editor/stores/editorStore'
import NotaConfigModal from '@/features/editor/components/blocks/nota-config/NotaConfigModal.vue'
import PublishNotaModal from '@/features/editor/components/dialogs/PublishNotaModal.vue'
import PaneTabs from './PaneTabs.vue'
import { FileText } from 'lucide-vue-next';
import { logger } from '@/services/logger'

const props = defineProps<{
  pane: Pane
}>()

// Stores
const notaStore = useNotaStore()
const layoutStore = useLayoutStore()
const codeExecutionStore = useCodeExecutionStore()
const editorStore = useEditorStore()
const router = useRouter()

// State
const isExecutingAll = ref(false)
const isReady = ref(false)
const showConfigModal = ref(false)
const showShareDialog = ref(false)
const isDragOver = ref(false)
const notaEditorRef = ref<InstanceType<typeof NotaEditor> | null>(null)
const loadingStep = ref<'nota' | 'editor' | 'ready'>('nota')
const loadState = ref<'loading' | 'ready' | 'not-found' | 'error'>('loading')
const loadError = ref<string | null>(null)
let loadRequestId = 0

// Computed properties
const nota = computed(() => {
  return props.pane.notaId ? notaStore.getCurrentNota(props.pane.notaId) : null
})

// Watch for when nota becomes available to update loading step
watch(nota, (newNota) => {
  if (newNota && loadingStep.value === 'nota') {
    loadingStep.value = 'editor'
  }
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
      // Update loading step when editor is ready
      if (loadingStep.value === 'editor') {
        loadingStep.value = 'ready'
      }
    }
  }
)

const loadNota = async (notaId: string) => {
  const requestId = ++loadRequestId
  try {
    isReady.value = false
    loadingStep.value = 'nota'
    loadState.value = 'loading'
    loadError.value = null
    
    // Ensure the nota is loaded
    const loadedNota = await notaStore.loadNota(notaId)
    if (requestId !== loadRequestId || props.pane.notaId !== notaId) return

    if (!loadedNota) {
      loadState.value = 'not-found'
      return
    }
    
    // Initialize tags array if it doesn't exist
    if (!loadedNota.tags) {
      loadedNota.tags = []
      await notaStore.saveItem(loadedNota)
    }
    
    // Tab registration is now handled by the layout store
    // when openNotaInPane is called

    loadingStep.value = 'editor'
    // Wait a bit for the editor to initialize
    await new Promise(resolve => setTimeout(resolve, 100))
    if (requestId !== loadRequestId || props.pane.notaId !== notaId) return
    isReady.value = true
    loadingStep.value = 'ready'
    loadState.value = 'ready'
  } catch (error) {
    if (requestId !== loadRequestId || props.pane.notaId !== notaId) return
    logger.error('Error loading nota in pane:', error)
    isReady.value = false
    loadState.value = 'error'
    loadError.value = error instanceof Error ? error.message : 'The notebook could not be read.'
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
      ++loadRequestId
      isReady.value = false
      loadingStep.value = 'nota'
      loadState.value = 'loading'
      loadError.value = null
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

const retryLoad = () => {
  if (props.pane.notaId) void loadNota(props.pane.notaId)
}

const goHome = () => {
  void router.push({ name: 'home' })
}

const closeStaleTab = () => {
  if (props.pane.notaId) {
    layoutStore.closeTabInPane(props.pane.id, props.pane.notaId)
  }
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
    await notaStore.exportNota(props.pane.notaId)
    
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
