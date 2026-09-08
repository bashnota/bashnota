<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { BookIcon, Plus } from 'lucide-vue-next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCitationStore } from '@/features/editor/stores/citationStore'
import type { CitationEntry } from '@/features/nota/types/nota'
import type { Editor } from '@/features/editor/pm'
import { toast } from '@/services/toast'

// Import modular components
import ReferencesList from './references/ReferencesList.vue'
import ReferenceDialog from './references/ReferenceDialog.vue'
import ReferenceDoiDialog from './references/ReferenceDoiDialog.vue'
import ReferenceEditDialog from './references/ReferenceEditDialog.vue'
import ReferenceMethodDialog from './references/ReferenceMethodDialog.vue'
import EmptyReferencesState from './references/EmptyReferencesState.vue'
import { useReferencesSearch } from '@/features/nota/composables/useReferencesSearch'
import { useReferenceDialog } from '@/features/nota/composables/useReferenceDialog'

const props = defineProps<{
  editor?: Editor
  notaId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const citationStore = useCitationStore()

// References for the current nota
const notaCitations = computed(() => {
  return citationStore.getCitationsByNotaId(props.notaId)
})

// Use search composable
const { searchQuery, filteredCitations } = useReferencesSearch(notaCitations)

// Use dialog composable
const {
  showAddDialog: showManualDialog,
  isEditing,
  currentCitation,
  openAddDialog,
  editCitation,
  closeDialog
} = useReferenceDialog()
const showMethodDialog = ref(false)
const showBibtexDialog = ref(false)
const showDoiDialog = ref(false)

const openMethodDialog = () => {
  showMethodDialog.value = true
}

const selectReferenceMethod = async (method: 'manual' | 'bibtex' | 'doi') => {
  showMethodDialog.value = false
  await nextTick()
  if (method === 'manual') openAddDialog()
  if (method === 'bibtex') showBibtexDialog.value = true
  if (method === 'doi') showDoiDialog.value = true
}

// Citation operations
const deleteCitation = async (id: string) => {
  try {
    const deleted = await citationStore.deleteCitation(props.notaId, id)
    if (!deleted) throw new Error('The reference no longer exists in this nota.')
    toast('Reference deleted successfully')
  } catch (error) {
    console.error('Failed to delete citation:', error)
    toast('Failed to delete reference')
  }
}

const insertCitation = (citation: CitationEntry) => {
  if (!props.editor) return
  
  // Find the citation index to determine its number
  const citations = citationStore.getCitationsByNotaId(props.notaId)
  const citationIndex = citations.findIndex((c: CitationEntry) => c.key === citation.key)
  
  // Use the citation extension to insert a proper citation node
  props.editor.chain().focus().insertContent({
    type: 'citation',
    attrs: {
      citationKey: citation.key,
      citationNumber: citationIndex + 1
    }
  }).run()
  
  toast(`Citation ${citation.key} inserted`)
}

const handleCitationSaved = () => {
  const wasEditing = isEditing.value
  closeDialog()
  toast(wasEditing ? 'Reference updated successfully' : 'Reference added successfully')
}

const handleBibtexSaved = () => {
  showBibtexDialog.value = false
}

const handleDoiSaved = () => {
  showDoiDialog.value = false
  toast('Reference added successfully')
}
</script>

<template>
  <!-- Search Section -->
  <div class="p-3 border-b bg-muted/30">
    <Input 
      v-model="searchQuery"
      placeholder="Search references..." 
      class="w-full"
    />
  </div>

  <!-- References List -->
  <ScrollArea class="flex-1">
    <div class="p-3">
      <!-- Add Reference Button (when references exist) -->
      <div v-if="filteredCitations.length > 0" class="mb-4">
        <Button 
          @click="openMethodDialog"
          size="sm" 
          variant="outline" 
          class="w-full"
        >
          <Plus class="w-4 h-4 mr-2" />
          Add Reference
        </Button>
      </div>

      <!-- Empty State -->
      <EmptyReferencesState 
        v-if="filteredCitations.length === 0 && !searchQuery"
        @add-reference="openMethodDialog"
      />

      <!-- No Search Results -->
      <div 
        v-else-if="filteredCitations.length === 0 && searchQuery"
        class="flex flex-col items-center justify-center py-8"
      >
        <BookIcon class="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h3 class="text-base font-medium mb-2">No Results Found</h3>
        <p class="text-sm text-muted-foreground text-center mb-4">
          No references match your search query.
        </p>
        <Button @click="searchQuery = ''" size="sm" variant="outline">
          Clear Search
        </Button>
      </div>

      <!-- References List -->
      <ReferencesList
        v-else
        :citations="filteredCitations"
        @edit="editCitation"
        @delete="deleteCitation"
        @insert="insertCitation"
      />
    </div>
  </ScrollArea>

  <ReferenceMethodDialog v-model:open="showMethodDialog" @select="selectReferenceMethod" />

  <!-- BibTeX import -->
  <ReferenceDialog
    v-model:open="showBibtexDialog"
    :nota-id="notaId"
    :existing-citations="notaCitations"
    @saved="handleBibtexSaved"
    @close="showBibtexDialog = false"
  />

  <!-- Manual add/edit -->
  <ReferenceEditDialog
    v-model:open="showManualDialog"
    :is-editing="isEditing"
    :current-citation="currentCitation"
    :nota-id="notaId"
    :existing-citations="notaCitations"
    @saved="handleCitationSaved"
    @close="closeDialog"
  />

  <!-- DOI lookup -->
  <ReferenceDoiDialog
    v-model:open="showDoiDialog"
    :nota-id="notaId"
    :existing-citations="notaCitations"
    @saved="handleDoiSaved"
  />
</template>
