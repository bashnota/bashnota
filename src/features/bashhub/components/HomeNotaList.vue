<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TableEmpty
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Filter, 
  X, 
  FileText,
  ChevronDown,
} from 'lucide-vue-next'
import { useNotaActions } from '@/features/nota/composables/useNotaActions'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useNotaList } from '@/features/nota/composables/useNotaList'
import { useNotaBatchActions } from '@/features/nota/composables/useNotaBatchActions'
import SearchInput from '@/features/nota/components/SearchInput.vue'
import QuickFilters from '@/features/nota/components/QuickFilters.vue'
import TagFilter from '@/features/nota/components/TagFilter.vue'
import NotaTable from '@/features/nota/components/NotaTable.vue'
import BatchActionsToolbar from '@/features/nota/components/BatchActionsToolbar.vue'
import type { Nota } from '@/features/nota/types/nota'

const NotaQuickPreview = defineAsyncComponent(
  () => import('@/features/nota/components/NotaQuickPreview.vue'),
)

interface Props {
  isLoading: boolean
  showFavorites: boolean
  searchQuery: string
  selectedTag: string
  notas: Nota[]
  filesystemNotas?: Nota[]
  isFilesystemMode?: boolean
}

interface Emits {
  (e: 'update:selectedTag', value: string): void
  (e: 'clear-filters'): void
  (e: 'update:searchQuery', value: string): void
  (e: 'update:showFavorites', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()
const notaStore = useNotaStore()
const { toggleNotaFavorite } = useNotaActions()
const { 
  isProcessing,
  batchToggleFavorite,
  batchDelete,
  batchAddTags,
  batchRemoveTags 
} = useNotaBatchActions()

// Use the unified nota list composable
const {
  localSearchQuery,
  selectedQuickFilters,
  selectedTags,
  viewFilter,
  filterOptions,
  availableTags,
  activeFiltersCount,
  currentSortOption,
  sortDirection,
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
  clearAllFilters: clearFiltersComposable,
  formatDate,
  SORT_OPTIONS,
} = useNotaList({
  notas: () => props.notas,
  initialSearchQuery: props.searchQuery,
  showFavorites: () => props.showFavorites,
  itemsPerPage: 10,
  onSearchUpdate: (value) => emit('update:searchQuery', value),
  onFiltersChange: () => emit('clear-filters'),
})

// Additional state for UI
const quickPreviewNota = ref<Nota | null>(null)
const showQuickPreview = ref(false)
const showFilters = ref(false)

// Helper function to check if a nota is from filesystem only
const isFilesystemNota = (notaId: string): boolean => {
  if (!props.isFilesystemMode || !props.filesystemNotas) {
    return false
  }
  
  // Check if nota exists in filesystem
  const existsInFilesystem = props.filesystemNotas.some(n => n.id === notaId)
  
  // Check if nota exists in the current props.notas (which includes database notas)
  // A nota is "filesystem only" if it exists in filesystem but was added from filesystem
  // We can check this by seeing if it exists in the store's items
  const existsInDatabase = notaStore.items.some(n => n.id === notaId)
  
  // A nota is "filesystem only" if it exists in filesystem but not in database
  return existsInFilesystem && !existsInDatabase
}

// Override the composable's clearAllFilters to include emit calls
const clearAllFiltersLocal = () => {
  clearFiltersComposable()
  clearSelection()
  emit('clear-filters')
  emit('update:selectedTag', '')
  emit('update:showFavorites', false)
}

// Additional handlers for local functionality
const handleQuickPreview = (nota: Nota) => {
  quickPreviewNota.value = nota
  showQuickPreview.value = true
}

const handleNotaClick = (nota: Nota) => {
  router.push(`/nota/${nota.id}`)
}

const handlePreviewOpen = (nota: Nota) => {
  showQuickPreview.value = false
  router.push(`/nota/${nota.id}`)
}

const handleBatchToggleFavorite = async (selectedIds: string[]) => {
  const result = await batchToggleFavorite(
    selectedIds,
    props.notas,
    async (id: string) => {
      await toggleNotaFavorite(id)
    }
  )
  
  if (result.success) {
    clearSelection()
  }
  // You could show a toast notification here
  console.log(result.message)
}

const handleBatchDelete = async (selectedIds: string[]) => {
  const result = await batchDelete(selectedIds, async (id: string) => {
    await notaStore.deleteItem(id)
  })
  
  if (result.success) {
    clearSelection()
  }
  console.log(result.message)
}

const handleBatchAddTags = async (selectedIds: string[], tags: string[]) => {
  const result = await batchAddTags(selectedIds, tags, async (id: string, tagsToAdd: string[]) => {
    const nota = props.notas.find(n => n.id === id)
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
  const result = await batchRemoveTags(selectedIds, tags, async (id: string, tagsToRemove: string[]) => {
    const nota = props.notas.find(n => n.id === id)
    if (nota) {
      const existingTags = nota.tags || []
      const newTags = existingTags.filter(tag => !tagsToRemove.includes(tag))
      await notaStore.updateNota(id, { tags: newTags })
    }
  })
  
  if (result.success) {
    clearSelection()
  }
  console.log(result.message)
}

// Computed property for active filters to include external props
const hasActiveFilters = computed(() => {
  return activeFiltersCount.value > 0 || props.selectedTag !== ''
})

// Watch for prop changes
watch(() => props.searchQuery, (newValue) => {
  if (newValue !== localSearchQuery.value) {
    localSearchQuery.value = newValue
  }
})

watch(() => props.showFavorites, (newValue) => {
  if (newValue) {
    selectedQuickFilters.value.add('favorites')
  } else {
    selectedQuickFilters.value.delete('favorites')
  }
})
</script>

<template>
  <Card
    role="region"
    aria-labelledby="nota-library-heading"
    class="flex h-full min-h-0 flex-col overflow-hidden"
  >
    <CardContent class="flex min-h-0 flex-1 flex-col p-0">
      <header class="border-b px-4 py-4 sm:px-5">
        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div class="flex min-w-0 items-center gap-2">
            <h2 id="nota-library-heading" class="font-semibold tracking-tight">Nota library</h2>
            <Badge variant="secondary" class="text-xs tabular-nums">
              {{ paginationInfo.totalItems }}
            </Badge>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              :model-value="localSearchQuery"
              placeholder="Search notas..."
              class="w-full sm:w-72"
              @update:model-value="updateSearch"
            />

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" size="sm" class="h-8 justify-between sm:min-w-36">
                  {{ currentSortOption?.label || 'Sort' }}
                  <ChevronDown aria-hidden="true" class="ml-2 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-48">
                <DropdownMenuCheckboxItem
                  v-for="option in SORT_OPTIONS"
                  :key="option.key"
                  :checked="currentSortOption?.key === option.key"
                  @click="handleSort(option.key)"
                >
                  {{ option.label }}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              class="h-8"
              :class="{ 'border-primary/30 bg-primary/10 text-primary': showFilters }"
              :aria-expanded="showFilters"
              aria-controls="nota-library-filters"
              @click="showFilters = !showFilters"
            >
              <Filter aria-hidden="true" class="mr-1.5 h-3.5 w-3.5" />
              Filters
              <Badge v-if="activeFiltersCount" variant="secondary" class="ml-1.5 h-4 text-xs">
                {{ activeFiltersCount }}
              </Badge>
            </Button>
          </div>
        </div>

        <div
          v-show="showFilters"
          id="nota-library-filters"
          class="mt-4 space-y-3 border-t pt-4"
        >
          <QuickFilters
            :filters="filterOptions"
            :selected-filters="selectedQuickFilters"
            label=""
            @toggle-filter="toggleQuickFilter"
          />

          <div class="flex flex-wrap items-center gap-3 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground">Show</span>
              <Select v-model="viewFilter">
                <SelectTrigger class="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All notas</SelectItem>
                  <SelectItem value="favorites">Favorites</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TagFilter
              :tags="availableTags"
              :selected-tags="selectedTags"
              @toggle-tag="toggleTag"
            />

            <Button
              v-if="hasActiveFilters"
              variant="ghost"
              size="sm"
              class="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              @click="clearAllFiltersLocal"
            >
              <X aria-hidden="true" class="mr-1 h-3.5 w-3.5" />
              Clear filters
            </Button>
          </div>
        </div>
      </header>

      <BatchActionsToolbar
        v-if="hasSelection"
        :selected-count="selectionCount"
        :selected-ids="getSelectedIds()"
        :selected-notas="getSelectedNotas(props.notas)"
        :all-tags="availableTags"
        :is-processing="isProcessing"
        @batch-toggle-favorite="handleBatchToggleFavorite"
        @batch-delete="handleBatchDelete"
        @batch-add-tags="handleBatchAddTags"
        @batch-remove-tags="handleBatchRemoveTags"
        @clear-selection="clearSelection"
      />

      <div v-if="isLoading" class="flex-1 p-8">
        <div class="space-y-4">
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
        </div>
      </div>

      <div v-else-if="paginatedNotas.length > 0" class="min-h-0 flex-1 overflow-y-auto">
        <NotaTable
          :notas="paginatedNotas"
          :current-sort-option="currentSortOption"
          :sort-direction="sortDirection"
          :is-all-selected="isAllSelected"
          :is-indeterminate="isIndeterminate"
          :format-date="formatDate"
          :is-nota-selected="isNotaSelected"
          :is-filesystem-nota="isFilesystemMode ? isFilesystemNota : undefined"
          mode="list"
          @sort="handleSort"
          @select-all="handleSelectAll"
          @select-nota="handleSelectNota"
          @nota-click="handleNotaClick"
          @preview-nota="handleQuickPreview"
          @toggle-favorite="toggleNotaFavorite"
          @delete-nota="(id) => notaStore.deleteItem(id)"
          @tag-click="(tag) => emit('update:selectedTag', tag)"
        />
      </div>

      <TableEmpty v-else class="flex-1">
        <div class="py-12 text-center">
          <FileText class="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 class="mt-4 text-base font-semibold">No notas found</h3>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ hasActiveFilters ? 'Adjust or clear the current filters.' : 'Create your first nota from the workspace panel.' }}
          </p>
        </div>
      </TableEmpty>

      <footer
        v-if="paginationInfo.totalItems > 0"
        class="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-xs text-muted-foreground tabular-nums">
          {{ paginationInfo.startItem }}–{{ paginationInfo.endItem }} of {{ paginationInfo.totalItems }}
        </p>

        <div v-if="totalPages > 1" class="flex items-center gap-1">
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
      </footer>
    </CardContent>
  </Card>

  <NotaQuickPreview
    v-if="showQuickPreview"
    v-model:open="showQuickPreview"
    :nota="quickPreviewNota"
    @open-nota="handlePreviewOpen"
  />
</template>
