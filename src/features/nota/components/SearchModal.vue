<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useRouter } from 'vue-router'
import { useNotaList } from '@/features/nota/composables/useNotaList'
import { useNotaActions } from '@/features/nota/composables/useNotaActions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  TableCell,
  TableRow,
} from '@/components/ui/table'
import SearchInput from '@/features/nota/components/SearchInput.vue'
import QuickFilters from '@/features/nota/components/QuickFilters.vue'
import TagFilter from '@/features/nota/components/TagFilter.vue'
import NotaTable from '@/features/nota/components/NotaTable.vue'
import {
  Search,
  X,
  Filter,
  Hash,
} from 'lucide-vue-next'
import type { Nota } from '@/features/nota/types/nota'

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
const { toggleNotaFavorite } = useNotaActions()
const searchInput = ref<HTMLInputElement | null>(null)

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
  clearAllFilters,
  formatDate,
  getContentPreview,
  SORT_OPTIONS,
} = useNotaList({
  notas: () => notaStore.items,
  itemsPerPage: 10,
})

// Auto-focus search input when dialog opens
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    searchInput.value?.focus()
  }
})

// Reset search when dialog closes
watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    clearAllFilters()
  }
})

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
  // For search modal, just open the nota directly
  openNota(nota.id)
}

const handleDeleteNota = (id: string) => {
  // Add delete confirmation logic here if needed
  console.log('Delete nota:', id)
}

const handleTagClick = (tag: string) => {
  // Add the tag to selected tags for filtering
  toggleTag(tag)
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
    <DialogContent class="max-w-4xl max-h-[80vh] p-0 gap-0">
      <!-- Header -->
      <DialogHeader class="p-6 pb-4">
        <DialogTitle class="flex items-center gap-2">
          <Search class="h-5 w-5" />
          Search Notas
        </DialogTitle>
        
        <!-- Search Input -->
        <SearchInput
          ref="searchInput"
          v-model="localSearchQuery"
          placeholder="Search by title, content, or tags..."
          class="mt-4"
          @update:model-value="updateSearch"
          @keydown.escape="emit('update:open', false)"
        />

        <!-- Filters and Sort -->
        <div class="flex flex-wrap items-center gap-3 mt-4">
          <!-- Quick Filters Component -->
          <QuickFilters
            :filters="filterOptions"
            :selected-filters="selectedQuickFilters"
            @toggle-filter="toggleQuickFilter"
          />

          <div class="h-4 border-l border-border"></div>

          <!-- Tag Filter Component -->
          <TagFilter
            :tags="availableTags"
            :selected-tags="selectedTags"
            @toggle-tag="toggleTag"
          />

          <!-- Clear Filters -->
          <Button
            v-if="activeFiltersCount > 0 || localSearchQuery"
            @click="clearAllFilters"
            variant="ghost"
            size="sm"
            class="ml-auto"
          >
            <X class="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      </DialogHeader>

      <div class="border-t border-border"></div>

      <!-- Results -->
      <div class="flex-1 min-h-0">
        <div class="h-[500px] overflow-hidden p-4">
          <!-- Results Count -->
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm text-muted-foreground">
              {{ filteredAndSortedNotas.length }} {{ filteredAndSortedNotas.length === 1 ? 'nota' : 'notas' }} found
            </span>
            <div v-if="hasSelection" class="flex items-center gap-2 text-sm text-muted-foreground">
              {{ hasSelection }} selected
            </div>
          </div>

          <!-- Data Table -->
          <div class="rounded-md border overflow-auto max-h-[380px]">
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
                      <Button @click="clearAllFilters" variant="outline">
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
            </NotaTable>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex items-center justify-between space-x-2 py-4">
            <div class="text-sm text-muted-foreground">
              Showing {{ paginationInfo.startItem }} to {{ paginationInfo.endItem }} of {{ paginationInfo.totalItems }} entries
            </div>
            <div class="space-x-2">
              <Button
                variant="outline"
                size="sm"
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
                  class="w-9"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </Button>
                <span v-else class="px-2 text-muted-foreground">{{ page }}</span>
              </template>
              <Button
                variant="outline"
                size="sm"
                :disabled="currentPage === totalPages"
                @click="nextPage"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
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
