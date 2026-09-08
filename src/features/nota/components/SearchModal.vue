<script setup lang="ts">
import { defineAsyncComponent, ref, watch, nextTick, onMounted } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useRouter } from 'vue-router'
import { useNotaList } from '@/features/nota/composables/useNotaList'
import { useNotaActions } from '@/features/nota/composables/useNotaActions'
import { useNotaBatchActions } from '@/features/nota/composables/useNotaBatchActions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import SearchInput from '@/features/nota/components/SearchInput.vue'
import QuickFilters from '@/features/nota/components/QuickFilters.vue'
import TagFilter from '@/features/nota/components/TagFilter.vue'
import NotaTable from '@/features/nota/components/NotaTable.vue'
import BatchActionsToolbar from '@/features/nota/components/BatchActionsToolbar.vue'
import { Loader2, Search, X } from 'lucide-vue-next'
import type { Nota } from '@/features/nota/types/nota'

const NotaQuickPreview = defineAsyncComponent(
  () => import('@/features/nota/components/NotaQuickPreview.vue'),
)

interface Props {
  open: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const notaStore = useNotaStore()
const router = useRouter()
const { deleteNota, toggleNotaFavorite } = useNotaActions()
const { isProcessing, batchToggleFavorite, batchDelete, batchAddTags, batchRemoveTags } =
  useNotaBatchActions()
const searchInput = ref<{ focus: () => void } | null>(null)
const pendingDeleteNota = ref<Nota | null>(null)
const isDeletingNota = ref(false)
const quickPreviewNota = ref<Nota | null>(null)
const showQuickPreview = ref(false)

// Use the modular nota list composable
const {
  localSearchQuery,
  selectedQuickFilters,
  selectedTags,
  filterOptions,
  availableTags,
  activeFiltersCount,
  currentSortOption,
  sortDirection,
  filteredAndSortedNotas,
  hasSelection,
  selectionCount,
  currentPage,
  totalPages,
  paginatedItems: paginatedNotas,
  paginationInfo,
  getVisiblePages,
  goToPage,
  nextPage,
  previousPage,
  isAllSelected,
  isIndeterminate,
  handleSelectAll,
  updateSearch,
  toggleQuickFilter,
  toggleTag,
  handleSort,
  handleSelectNota,
  isNotaSelected,
  clearSelection,
  getSelectedIds,
  getSelectedNotas,
  clearAllFilters,
  formatDate,
} = useNotaList({
  notas: () => notaStore.items,
  itemsPerPage: 10,
})

// Auto-focus search input when dialog opens
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      // Add a small delay to ensure the input is fully rendered
      setTimeout(async () => {
        try {
          await searchInput.value?.focus()
        } catch (error) {
          console.warn('Failed to focus search input:', error)
        }
      }, 100)
    }
  },
)

// Reset search when dialog closes
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      clearAllFilters()
      pendingDeleteNota.value = null
    }
  },
)

// Open nota and close modal
const openNota = (notaId: string) => {
  router.push(`/nota/${notaId}`)
  emit('update:open', false)
}

// Handle nota row click
const handleNotaClick = (nota: Nota) => {
  openNota(nota.id)
}

// Additional handlers for consistent functionality
const handleQuickPreview = (nota: Nota) => {
  quickPreviewNota.value = nota
  showQuickPreview.value = true
}

const handleDeleteNota = (id: string) => {
  pendingDeleteNota.value = notaStore.items.find((nota) => nota.id === id) ?? null
}

const cancelDeleteNota = () => {
  if (!isDeletingNota.value) pendingDeleteNota.value = null
}

const confirmDeleteNota = async () => {
  const target = pendingDeleteNota.value
  if (!target || isDeletingNota.value) return

  isDeletingNota.value = true
  try {
    const deleted = await deleteNota(target.id)
    if (!deleted) return

    if (isNotaSelected(target.id)) handleSelectNota(target.id, false)
    pendingDeleteNota.value = null
  } finally {
    isDeletingNota.value = false
  }
}

const handleTagClick = (tag: string) => {
  // Add the tag to selected tags for filtering
  toggleTag(tag)
}

// Batch action handlers
const handleBatchToggleFavorite = async (selectedIds: string[]) => {
  const result = await batchToggleFavorite(selectedIds, notaStore.items, async (id: string) => {
    await toggleNotaFavorite(id)
  })

  if (result.success) {
    clearSelection()
  }
  // You could show a toast notification here
  console.log(result.message)
}

const handleBatchDelete = async (selectedIds: string[]) => {
  console.log('SearchModal: handleBatchDelete called with IDs:', selectedIds)
  const result = await batchDelete(selectedIds, async (id: string) => {
    console.log('SearchModal: Deleting nota with ID:', id)
    await notaStore.deleteItem(id)
  })

  if (result.success) {
    console.log('SearchModal: Delete successful, clearing selection')
    clearSelection()
  } else {
    console.log('SearchModal: Delete failed:', result.message)
  }
  console.log(result.message)
}

const handleBatchAddTags = async (selectedIds: string[], tags: string[]) => {
  const result = await batchAddTags(selectedIds, tags, async (id: string, tagsToAdd: string[]) => {
    const nota = notaStore.items.find((n) => n.id === id)
    if (nota) {
      const existingTags = nota.tags || []
      const newTags = [...new Set([...existingTags, ...tagsToAdd])]
      await notaStore.updateNota(id, { tags: newTags })
    }
  })

  if (result.success) {
    clearSelection()
  }
  console.log(result.message)
}

const handleBatchRemoveTags = async (selectedIds: string[], tags: string[]) => {
  const result = await batchRemoveTags(
    selectedIds,
    tags,
    async (id: string, tagsToRemove: string[]) => {
      const nota = notaStore.items.find((n) => n.id === id)
      if (nota) {
        const existingTags = nota.tags || []
        const newTags = existingTags.filter((tag) => !tagsToRemove.includes(tag))
        await notaStore.updateNota(id, { tags: newTags })
      }
    },
  )

  if (result.success) {
    clearSelection()
  }
  console.log(result.message)
}

onMounted(() => {
  // Ensure notas are loaded
  if (notaStore.items.length === 0) {
    notaStore.loadNotas()
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="grid h-[calc(100dvh-1rem)] max-h-[52rem] w-[calc(100vw-1rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:h-[min(90dvh,52rem)] sm:w-[calc(100vw-2rem)]"
      close-class="right-1 top-1 flex h-12 w-12 items-center justify-center sm:right-2 sm:top-2"
      data-testid="search-dialog"
    >
      <!-- Header -->
      <DialogHeader
        class="max-h-[46dvh] min-w-0 overflow-y-auto border-b p-4 pr-14 text-left sm:max-h-none sm:p-6 sm:pb-4 sm:pr-14"
      >
        <DialogTitle class="flex items-center gap-2 text-lg sm:text-xl">
          <Search aria-hidden="true" class="h-5 w-5 shrink-0" />
          Search notas
        </DialogTitle>
        <DialogDescription class="text-sm leading-5">
          Find notas by title, content, or tag, then narrow the results with filters.
        </DialogDescription>

        <!-- Search Input -->
        <SearchInput
          ref="searchInput"
          v-model="localSearchQuery"
          placeholder="Search title, content, or tags"
          class="mt-3"
          size="lg"
          @update:model-value="updateSearch"
          @keydown.escape="emit('update:open', false)"
        />

        <!-- Filters and Sort -->
        <div
          class="mt-3 flex min-w-0 flex-wrap items-start gap-3 rounded-md border bg-muted/20 p-3"
          data-testid="search-filters"
        >
          <!-- Quick Filters Component -->
          <QuickFilters
            :filters="filterOptions"
            :selected-filters="selectedQuickFilters"
            @toggle-filter="toggleQuickFilter"
          />

          <div aria-hidden="true" class="hidden h-4 border-l border-border sm:block"></div>

          <!-- Tag Filter Component -->
          <TagFilter :tags="availableTags" :selected-tags="selectedTags" @toggle-tag="toggleTag" />

          <!-- Clear Filters -->
          <Button
            v-if="activeFiltersCount > 0 || localSearchQuery"
            @click="clearAllFilters"
            variant="ghost"
            size="sm"
            class="min-h-11 w-full sm:ml-auto sm:min-h-9 sm:w-auto"
          >
            <X class="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      </DialogHeader>

      <!-- Results -->
      <div
        class="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4"
        data-testid="search-results"
      >
        <!-- Results Count -->
        <div class="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2 sm:mb-4">
          <span class="text-sm text-muted-foreground">
            {{ filteredAndSortedNotas.length }}
            {{ filteredAndSortedNotas.length === 1 ? 'nota' : 'notas' }} found
          </span>
          <div v-if="hasSelection" class="flex items-center gap-2 text-sm text-muted-foreground">
            {{ selectionCount }} selected
          </div>
        </div>

        <!-- Batch Actions Toolbar -->
        <div v-if="hasSelection" class="mb-4 max-w-full overflow-x-auto pb-1">
          <BatchActionsToolbar
            :selected-count="selectionCount"
            :selected-ids="getSelectedIds()"
            :selected-notas="getSelectedNotas(notaStore.items)"
            :all-tags="availableTags"
            :is-processing="isProcessing"
            @batch-toggle-favorite="handleBatchToggleFavorite"
            @batch-delete="handleBatchDelete"
            @batch-add-tags="handleBatchAddTags"
            @batch-remove-tags="handleBatchRemoveTags"
            @clear-selection="clearSelection"
          />
        </div>

        <!-- Compact result cards keep every action visible on phones. -->
        <div class="space-y-3 md:hidden" data-testid="search-result-cards">
          <article
            v-for="nota in paginatedNotas"
            :key="nota.id"
            class="min-w-0 rounded-lg border bg-card p-3 text-card-foreground"
          >
            <div class="flex min-w-0 items-start gap-3">
              <Checkbox
                :model-value="isNotaSelected(nota.id)"
                :aria-label="`Select ${nota.title}`"
                class="mt-1"
                @update:model-value="handleSelectNota(nota.id, $event === true)"
              />
              <button
                class="min-h-11 min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                type="button"
                @click="handleNotaClick(nota)"
              >
                <span class="block break-words font-medium">{{ nota.title }}</span>
                <span class="mt-1 block text-xs text-muted-foreground">
                  Updated {{ formatDate(nota.updatedAt) }}
                </span>
              </button>
            </div>

            <div v-if="nota.tags?.length" class="mt-2 flex min-w-0 flex-wrap gap-1">
              <button
                v-for="tag in nota.tags.slice(0, 3)"
                :key="tag"
                :aria-pressed="selectedTags.has(tag)"
                class="inline-flex min-h-8 max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                :class="
                  selectedTags.has(tag)
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'
                "
                type="button"
                @click="handleTagClick(tag)"
              >
                <span class="truncate">{{ tag }}</span>
              </button>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2">
              <Button
                class="min-h-12"
                size="sm"
                variant="outline"
                @click="handleQuickPreview(nota)"
              >
                Preview
              </Button>
              <Button
                class="min-h-12"
                size="sm"
                variant="outline"
                @click="toggleNotaFavorite(nota.id)"
              >
                {{ nota.favorite ? 'Unfavorite' : 'Favorite' }}
              </Button>
              <Button class="min-h-12" size="sm" variant="outline" @click="openNota(nota.id)">
                Open
              </Button>
              <Button
                class="min-h-12 text-destructive hover:text-destructive"
                size="sm"
                variant="outline"
                @click="handleDeleteNota(nota.id)"
              >
                Delete
              </Button>
            </div>
          </article>

          <div
            v-if="paginatedNotas.length === 0"
            class="flex min-h-48 flex-col items-center justify-center rounded-lg border p-5 text-center"
          >
            <Search aria-hidden="true" class="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 class="font-medium">No notas found</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Try a different search or clear the filters.
            </p>
            <Button class="mt-4 min-h-11" variant="outline" @click="clearAllFilters">
              Clear filters
            </Button>
          </div>
        </div>

        <!-- The information-dense table remains available at tablet and desktop widths. -->
        <div class="hidden max-w-full overflow-auto rounded-md border md:block">
          <NotaTable
            :notas="paginatedNotas"
            :current-sort-option="currentSortOption"
            :sort-direction="sortDirection"
            :is-all-selected="isAllSelected"
            :is-indeterminate="isIndeterminate"
            :format-date="formatDate"
            :is-nota-selected="isNotaSelected"
            mode="search"
            @sort="handleSort"
            @select-all="handleSelectAll"
            @select-nota="handleSelectNota"
            @nota-click="handleNotaClick"
            @preview-nota="handleQuickPreview"
            @toggle-favorite="toggleNotaFavorite"
            @delete-nota="handleDeleteNota"
            @open-nota="openNota"
            @tag-click="handleTagClick"
          >
            <template #empty-state>
              <TableRow v-if="paginatedNotas.length === 0">
                <TableCell colspan="5" class="h-24 text-center">
                  <div class="flex flex-col items-center justify-center py-8">
                    <Search class="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 class="text-lg font-medium mb-2">No notas found</h3>
                    <p class="text-muted-foreground mb-4">
                      Try adjusting your search terms or filters
                    </p>
                    <Button @click="clearAllFilters" variant="outline"> Clear filters </Button>
                  </div>
                </TableCell>
              </TableRow>
            </template>
          </NotaTable>
        </div>

        <!-- Pagination -->
        <div
          v-if="totalPages > 1"
          class="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="text-xs text-muted-foreground sm:text-sm">
            Showing {{ paginationInfo.startItem }} to {{ paginationInfo.endItem }} of
            {{ paginationInfo.totalItems }} entries
          </div>
          <div class="flex items-center justify-between gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              class="min-h-11 sm:min-h-9"
              :disabled="currentPage === 1"
              @click="previousPage"
            >
              Previous
            </Button>
            <template v-for="page in getVisiblePages()" :key="page">
              <Button
                v-if="typeof page === 'number'"
                :variant="page === currentPage ? 'default' : 'outline'"
                size="sm"
                class="hidden w-9 sm:inline-flex"
                @click="goToPage(page)"
              >
                {{ page }}
              </Button>
              <span v-else class="hidden px-2 text-muted-foreground sm:inline">{{ page }}</span>
            </template>
            <Button
              variant="outline"
              size="sm"
              class="min-h-11 sm:min-h-9"
              :disabled="currentPage === totalPages"
              @click="nextPage"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>

    <AlertDialog :open="pendingDeleteNota !== null" @update:open="!$event && cancelDeleteNota()">
      <AlertDialogContent class="w-[calc(100vw-1rem)] max-w-md" data-testid="delete-confirmation">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete nota?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete “{{ pendingDeleteNota?.title }}”? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeletingNota" @click="cancelDeleteNota">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="isDeletingNota"
            @click.capture.prevent.stop="confirmDeleteNota"
          >
            <Loader2 v-if="isDeletingNota" aria-hidden="true" class="mr-2 h-4 w-4 animate-spin" />
            Delete nota
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <NotaQuickPreview
      v-if="showQuickPreview"
      v-model:open="showQuickPreview"
      :nota="quickPreviewNota"
      @open-nota="(nota) => openNota(nota.id)"
    />
  </Dialog>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Custom scrollbar for results area */
:deep(.overflow-y-auto) {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}

:deep(.overflow-y-auto::-webkit-scrollbar) {
  width: 6px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.overflow-y-auto::-webkit-scrollbar-thumb) {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

:deep(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
  background-color: hsl(var(--muted-foreground) / 0.5);
}
</style>
