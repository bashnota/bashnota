<script setup lang="ts">
import NotaEditor from '@/components/editor/NotaEditor.vue'
import NotaConfigModal from '@/components/editor/blocks/nota-config/NotaConfigModal.vue'
import { ref, onMounted, watch, nextTick } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useJupyterStore } from '@/stores/jupyterStore'
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

const props = defineProps<{
  id: string
}>()

const store = useNotaStore()
const jupyterStore = useJupyterStore()
const codeExecutionStore = useCodeExecutionStore()
const isExecutingAll = ref(false)
const isReady = ref(false)

const nota = computed(() => store.getCurrentNota(props.id))
const showConfigModal = ref(false)
const showShareDialog = ref(false)
const isSaving = ref(false)
const showSaved = ref(false)
const isEditingTitle = ref(false)
const editedTitle = ref('')
const titleInput = ref<HTMLInputElement | null>(null)

// Add watch to save changes when tags are updated
watch(
  () => nota.value?.tags,
  async (newTags) => {
    if (nota.value && newTags) {
      await store.saveItem(nota.value)
    }
  },
)

onMounted(async () => {
  // Ensure the nota is loaded before showing the editor
  const loadedNota = await store.loadNota(props.id)
  if (loadedNota && !loadedNota.tags) {
    loadedNota.tags = []
    await store.saveItem(loadedNota)
  }
  isReady.value = true

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
    console.error('Error executing all cells:', error)
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
  if (!saving) {
    showSaved.value = true
    setTimeout(() => {
      showSaved.value = false
    }, 2000)
  }
}

const startTitleEdit = () => {
  editedTitle.value = nota.value?.title || ''
  isEditingTitle.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

const saveTitle = async () => {
  if (!nota.value || !editedTitle.value.trim()) {
    cancelTitleEdit()
    return
  }

  if (editedTitle.value !== nota.value.title) {
    await store.renameItem(nota.value.id, editedTitle.value)
  }
  isEditingTitle.value = false
}

const cancelTitleEdit = () => {
  isEditingTitle.value = false
  editedTitle.value = nota.value?.title || ''
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
  <div class="bg-background">
    <header class="flex items-center justify-between px-6 py-4 border-b">
      <div class="flex-1">
        <div class="flex items-center gap-3">
          <div class="flex-1 flex items-center gap-4">
            <h1
              class="text-2xl font-semibold tracking-tight whitespace-nowrap flex items-center gap-2 max-w-[400px]"
            >
              <template v-if="isEditingTitle">
                <input
                  v-model="editedTitle"
                  class="bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary px-1 rounded"
                  @keyup.enter="saveTitle"
                  @keyup.esc="cancelTitleEdit"
                  @blur="saveTitle"
                  ref="titleInput"
                  :class="{ 'border-red-500': editedTitle.trim() === '' }"
                />
              </template>
              <span
                v-else
                class="cursor-pointer hover:text-primary transition-colors truncate"
                @click="startTitleEdit"
              >
                {{ nota?.title || 'Untitled' }}
              </span>
            </h1>

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

      <div class="flex items-center gap-2">
        <Button
          title="Run All"
          @click="executeAllCells"
          :disabled="isExecutingAll"
          v-if="nota && nota.config?.savedSessions && nota.config?.savedSessions.length > 0"
        >
          <Loader2 v-if="isExecutingAll" class="w-5 h-5 animate-spin" />
          <PlayCircle class="w-5 h-5" v-else />
          Run All
        </Button>

        <Button
          variant="ghost"
          size="icon"
          title="Star"
          @click="store.toggleFavorite(id)"
          v-if="nota"
        >
          <Star
            class="w-5 h-5"
            :class="{ 'text-yellow-400 fill-yellow-400': nota?.favorite }"
          />
        </Button>

        <Button
          variant="outline"
          title="Share"
          @click="toggleShareDialog"
          v-if="nota"
          class="flex items-center gap-2"
        >
          <Share2 class="w-5 h-5" />
          <span class="hidden sm:inline">Share</span>
        </Button>

        <Button
          variant="outline"
          title="Jupyter Settings"
          @click="toggleConfigModal"
          v-if="nota"
          class="flex items-center gap-2"
        >
          <Cpu class="w-5 h-5" />
          <span class="hidden sm:inline">Jupyter Settings</span>
        </Button>

        <Button variant="ghost" size="icon" title="Export" @click="exportNota" v-if="nota">
          <Download class="w-5 h-5" />
        </Button>
      </div>
    </header>

    <main>
      <template v-if="isReady">
        <NotaEditor v-if="nota" :nota-id="id" @saving="handleSaving" :key="id" />
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
