<script setup lang="ts">
import NotaEditor from '@/features/editor/components/NotaEditor.vue'
import BlockCommandMenu from '@/features/editor/components/ui/BlockCommandMenu.vue'
import NotaConfigModal from '@/features/editor/components/blocks/nota-config/NotaConfigModal.vue'
import { ref, onMounted, watch, computed } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { useTabsStore } from '@/stores/tabsStore'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { toast } from 'vue-sonner'
import PublishNotaModal from '@/features/editor/components/dialogs/PublishNotaModal.vue'
import { logger } from '@/services/logger'

const props = defineProps<{
  id: string
}>()

// Stores
const notaStore = useNotaStore()
const jupyterStore = useJupyterStore()
const tabsStore = useTabsStore()
const codeExecutionStore = useCodeExecutionStore()

// State
const isExecutingAll = ref(false)
const isReady = ref(false)
const showConfigModal = ref(false)
const showShareDialog = ref(false)
const notaEditorRef = ref()

// Computed properties
const nota = computed(() => notaStore.getCurrentNota(props.id))

// Watch for title changes to update tab title
watch(
  () => nota.value?.title,
  (newTitle) => {
    if (nota.value && newTitle) {
      tabsStore.updateTab(props.id, { title: newTitle })
    }
  },
  { immediate: true }
)

onMounted(async () => {
  try {
    // Ensure the nota is loaded before showing the editor
    const loadedNota = await notaStore.loadNota(props.id)
    
    // Initialize tags array if it doesn't exist
    if (loadedNota && !loadedNota.tags) {
      loadedNota.tags = []
      await notaStore.saveItem(loadedNota)
    }
    
    // Register this nota with the tab system
    tabsStore.openTab({
      id: props.id,
      title: loadedNota?.title || 'Untitled',
      route: {
        name: 'nota',
        params: { id: props.id }
      }
    })

    // Check if this is a root nota and has no Jupyter servers configured
    if (loadedNota && !loadedNota.parentId && jupyterStore.jupyterServers.length === 0) {
      toast({
        title: 'Configure Jupyter',
        description: 'Set up your Jupyter server to enable code execution in this notebook.',
      })
    }
    
    isReady.value = true
  } catch (error) {
    logger.error('Error loading nota:', error)
    toast({
      title: 'Error',
      description: 'Failed to load notebook. Please try again.',
      variant: 'destructive'
    })
  }
})

/**
 * Execute all code cells in the nota
 */
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

/**
 * Toggle the configuration modal
 */
const toggleConfigModal = () => {
  showConfigModal.value = !showConfigModal.value
}

/**
 * Toggle the share dialog
 */
const toggleShareDialog = () => {
  showShareDialog.value = !showShareDialog.value
}

/**
 * Export the nota to a JSON file
 */
const exportNota = async () => {
  try {
    const notas = await notaStore.exportNota(props.id)
    
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

/**
 * Toggle the favorite status of the nota
 */
const toggleFavorite = () => {
  if (nota.value) {
    notaStore.toggleFavorite(props.id)
  }
}

/**
 * Handle tags update from editor
 */
const handleTagsUpdate = async (tags: string[]) => {
  if (nota.value) {
    // The editor component now handles saving the nota with updated tags
    // This function is kept for any additional processing needed at this level
  }
}
</script>

<template>
  <div class="bg-background flex flex-col flex-1 min-h-0 h-full">
    <!-- Main content area -->
    <main class="flex-1 min-h-0 overflow-hidden">
      <template v-if="isReady && nota">
        <BlockCommandMenu :editor-view="notaEditorRef?.editor?.view">
          <NotaEditor
            ref="notaEditorRef"
            :nota-id="id"
            :key="id"
            :can-run-all="nota && nota.config?.savedSessions && nota.config?.savedSessions.length > 0"
            :is-executing-all="isExecutingAll"
            @run-all="executeAllCells"
            :is-favorite="nota?.favorite"
            @update:favorite="toggleFavorite"
            @update:tags="handleTagsUpdate"
            @share="toggleShareDialog"
            @open-config="toggleConfigModal"
            @export-nota="exportNota"
          >
            <!-- We no longer need to pass NotaMetadata as a slot since the editor handles it internally -->
          </NotaEditor>
        </BlockCommandMenu>
      </template>
      
      <div v-else class="flex items-center justify-center h-full">
        <p class="text-muted-foreground">Loading...</p>
      </div>
    </main>

    <!-- Configuration Modal -->
    <NotaConfigModal
      v-if="nota"
      :nota-id="id"
      v-model:open="showConfigModal"
    />

    <!-- Share Dialog -->
    <PublishNotaModal 
      v-if="nota" 
      :nota-id="id" 
      v-model:open="showShareDialog" 
    />
  </div>
</template>








