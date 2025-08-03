<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookIcon, Plus } from 'lucide-vue-next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCitationStore } from '@/features/editor/stores/citationStore'
import { BaseSidebar, KeyboardShortcut } from '@/ui/sidebars'
import { useSidebarComposable } from '@/composables/useSidebarComposable'
import type { CitationEntry } from '@/features/nota/types/nota'
import type { Editor } from '@tiptap/vue-3'
import { toast } from 'vue-sonner'

// Import modular components
import ReferencesList from './references/ReferencesList.vue'
import ReferenceDialog from './references/ReferenceDialog.vue'
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

// Use our sidebar composable for consistent behavior
const { } = useSidebarComposable({
  id: 'references-sidebar',
  keyboard: {
    ctrl: true,
    shift: true,
    key: 'r'
  }
})

// References for the current nota
const notaCitations = computed(() => {
  return citationStore.getCitationsByNotaId(props.notaId)
})

// Use search composable
const { searchQuery, filteredCitations } = useReferencesSearch(notaCitations)

// Use dialog composable
const {
  showAddDialog,
  isEditing,
  currentCitation,
  openAddDialog,
  editCitation,
  closeDialog
} = useReferenceDialog()

// Citation operations
const deleteCitation = async (id: string) => {
  try {
    await citationStore.deleteCitation(props.notaId, id)
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
  closeDialog()
  toast(isEditing.value ? 'Reference updated successfully' : 'Reference added successfully')
}
</script>

<template>
  <BaseSidebar 
    id="references-sidebar"
    title="References" 
    :icon="BookIcon" 
    position="right" 
    @close="$emit('close')"
  >
    <template #actions>
      <Button 
        variant="ghost" 
        size="sm" 
        @click="openAddDialog"
        class="h-8 w-8 p-0"
      >
        <Plus class="h-4 w-4" />
      </Button>
    </template>
    
    <!-- References Content -->
    <div class="flex flex-col h-full">
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
              @click="openAddDialog" 
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
            @add-reference="openAddDialog"
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
    </div>

    <!-- Keyboard Shortcut Info -->
    <template #footer>
      <KeyboardShortcut 
        ctrl
        shift
        keyName="R" 
        action="toggle references"
      />
    </template>

    <!-- Add/Edit Citation Dialog -->
    <ReferenceDialog
      v-model:open="showAddDialog"
      :is-editing="isEditing"
      :current-citation="currentCitation"
      :nota-id="notaId"
      :existing-citations="notaCitations"
      @saved="handleCitationSaved"
      @close="closeDialog"
    />
  </BaseSidebar>
</template>