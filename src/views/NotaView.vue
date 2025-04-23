<script setup lang="ts">
import NotaEditor from '@/components/editor/NotaEditor.vue'
import NotaConfigModal from '@/components/editor/blocks/nota-config/NotaConfigModal.vue'
import { ref, onMounted, watch, nextTick } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useJupyterStore } from '@/stores/jupyterStore'
import { useTabsStore } from '@/stores/tabsStore'
import { computed } from 'vue'
import { 
  Share2,
  CheckCircle,
  RotateCw,
  Star,
  Download,
  Cpu,
  Loader2,
  PlayCircle
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { TagsInput } from '@/components/ui/tags-input'
import TagsInputItem from '@/components/ui/tags-input/TagsInputItem.vue'
import TagsInputItemText from '@/components/ui/tags-input/TagsInputItemText.vue'
import TagsInputItemDelete from '@/components/ui/tags-input/TagsInputItemDelete.vue'
import TagsInputInput from '@/components/ui/tags-input/TagsInputInput.vue'
import { useCodeExecutionStore } from '@/stores/codeExecutionStore'
import { toast } from '@/components/ui/toast'
import PublishNotaModal from '@/components/editor/PublishNotaModal.vue'
import { logger } from '@/services/logger'

const props = defineProps<{
  id: string
}>()

const store = useNotaStore()
const jupyterStore = useJupyterStore()
const tabsStore = useTabsStore()
const codeExecutionStore = useCodeExecutionStore()
const isExecutingAll = ref(false)
const isReady = ref(false)

const nota = computed(() => store.getCurrentNota(props.id))
const showConfigModal = ref(false)
const showShareDialog = ref(false)
const isSaving = ref(false)
const showSaved = ref(false)


// Add watch to save changes when tags are updated
watch(
  () => nota.value?.tags,
  async (newTags) => {
    if (nota.value && newTags) {
      await store.saveItem(nota.value)
    }
  },
)

// Add watch to sync tab title with nota title
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
  // Ensure the nota is loaded before showing the editor
  const loadedNota = await store.loadNota(props.id)
  if (loadedNota && !loadedNota.tags) {
    loadedNota.tags = []
    await store.saveItem(loadedNota)
  }
  isReady.value = true
  
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
  if (nota.value && !nota.value.parentId) {
    // Check global Jupyter servers instead of nota-specific config
    if (jupyterStore.jupyterServers.length === 0) {
      toast({
        title: 'Configure Jupyter',
        description: 'Set up your Jupyter server to enable code execution in this notebook.',
      })
    }
  }
})

const executeAllCells = async () => {
  isExecutingAll.value = true
  try {
    await codeExecutionStore.executeAll()
  } catch (error) {
    logger.error('Error executing all cells:', error)
  } finally {
    isExecutingAll.value = false
  }
}

const toggleConfigModal = () => {
  showConfigModal.value = !showConfigModal.value
}

// New function to toggle share dialog
const toggleShareDialog = () => {
  showShareDialog.value = !showShareDialog.value
}

// Save status handlers
const handleSaving = (saving: boolean) => {
  isSaving.value = saving
  // Update the tab's dirty state
  tabsStore.updateTab(props.id, { isDirty: saving })
  
  if (!saving) {
    showSaved.value = true
    setTimeout(() => {
      showSaved.value = false
    }, 2000)
  }
}

const exportNota = async () => {
  const notas = await store.exportNota(props.id)

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
}
</script>

<template>
  <div class="bg-background flex flex-col flex-1 min-h-0 h-full">

    <header class="flex items-center justify-between px-6 py-4 border-b">
      <div class="flex-1">
        <div class="flex items-center gap-3">
          <div class="flex-1 flex items-center gap-4">
            

            <!-- Save Status Indicator -->
            <div
              class="flex items-center text-xs text-muted-foreground transition-opacity duration-200"
              :class="{ 'opacity-0': !isSaving && !showSaved }"
            >
              <span v-if="isSaving" class="flex items-center gap-1">
                <RotateCw class="w-3 h-3 animate-spin" />
                Saving
              </span>
              <span v-else-if="showSaved" class="flex items-center gap-1">
                <CheckCircle class="w-3 h-3 text-green-600" />
                Saved
              </span>
            </div>

            <!-- Tags moved here -->
            <TagsInput v-if="nota" v-model="nota.tags" class="w-full border-none">
              <TagsInputItem v-for="item in nota.tags" :key="item" :value="item">
                <TagsInputItemText />
                <TagsInputItemDelete />
              </TagsInputItem>

              <TagsInputInput placeholder="Enter Tags ..." />
            </TagsInput>
          </div>
        </div>

        <span v-if="nota?.updatedAt" class="text-xs text-muted-foreground mt-1">
          Last updated {{ formatDate(nota.updatedAt) }}
        </span>
      </div>

      
    </header>

    <main class="flex-1 min-h-0 overflow-auto">
      <template v-if="isReady">
        <NotaEditor
  v-if="nota"
  :nota-id="id"
  @saving="handleSaving"
  :key="id"
  :can-run-all="nota && nota.config?.savedSessions && nota.config?.savedSessions.length > 0"
  :is-executing-all="isExecutingAll"
  @run-all="executeAllCells"
  :is-favorite="nota?.favorite"
  @toggle-favorite="() => store.toggleFavorite(id)"
  @share="toggleShareDialog"
  @open-config="toggleConfigModal"
  @export-nota="exportNota"
/>

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
    <PublishNotaModal v-if="nota" :nota-id="id" v-model:open="showShareDialog" />
  </div>
</template>
