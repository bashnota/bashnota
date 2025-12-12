<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  Clock, 
  FileText,
  ChevronDown,
  Settings2
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

interface Props {
  isLoading: boolean
  showFavorites: boolean
  searchQuery: string
  selectedTag: string
  notas: Nota[]
  totalCount?: number
  filesystemNotas?: Nota[]
  isFilesystemMode?: boolean
  hasDirectoryAccess?: boolean
}

interface Emits {
  (e: 'create-nota'): void
  (e: 'update:selectedTag', value: string): void
  (e: 'clear-filters'): void
  (e: 'update:searchQuery', value: string): void
  (e: 'update:showFavorites', value: boolean): void
  (e: 'page-change', page: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()
const notaStore = useNotaStore()
const { toggleNotaFavorite, navigateToNotaSettings } = useNotaActions()
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
  clearAllFilters: clearFiltersComposable,
  formatDate,
  getContentPreview,
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
  
  // Check if nota exists in database (store items)
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
  <div class="flex flex-col h-full space-y-4">
    <!-- Compact Header with Controls -->
    <Card class="border-l-primary/30">
      <CardContent class="p-4">
        <!-- Main Control Bar -->
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <!-- Title and Stats -->
          <div class="flex items-center gap-2">
            <Clock class="h-4 w-4" />
            <span class="font-semibold">Notas</span>
            <Badge variant="secondary" class="text-xs">
              {{ paginatedNotas.length }}
            </Badge>
            <Badge v-if="hasActiveFilters" variant="outline" class="text-xs border-primary/50 text-primary">
              {{ activeFiltersCount }} filter{{ activeFiltersCount > 1 ? 's' : '' }} active
            </Badge>
          </div>

          <!-- Search and Controls -->
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <!-- Search Component -->
            <SearchInput
              :model-value="localSearchQuery"
              placeholder="Search notas..."
              @update:model-value="updateSearch"
              class="w-full sm:w-64"
            />

            <!-- Filter Toggle -->
            <Button
              variant="outline"
              size="sm"
              class="h-8"
              @click="showFilters = !showFilters"
              :class="{ 'bg-primary/10 text-primary': showFilters }"
            >
              <Filter class="h-3 w-3 mr-1" />
              Filters
              <Badge v-if="activeFiltersCount" variant="secondary" class="ml-1 h-4 text-xs">
                {{ activeFiltersCount }}
              </Badge>
            </Button>
          </div>
        </div>

        <!-- Enhanced Filters Panel -->
        <div v-if="showFilters" class="mt-3 pt-3 border-t space-y-3">
          <!-- Quick Filters Component -->
          <QuickFilters
            :filters="filterOptions"
            :selected-filters="selectedQuickFilters"
            @toggle-filter="toggleQuickFilter"
          />

          <!-- Advanced Filters Row -->
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <!-- View Filter -->
            <div class="flex items-center gap-1">
              <span class="text-muted-foreground text-xs">View:</span>
              <Select v-model:value="viewFilter">
                <SelectTrigger class="w-28 h-6 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div class="flex items-center justify-between w-full">
                      <span>All</span>
                      <Badge variant="secondary" class="ml-1 text-xs">{{ props.notas.length }}</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="favorites">
                    <div class="flex items-center justify-between w-full">
                      <span>Favorites</span>
                      <Badge variant="secondary" class="ml-1 text-xs">{{ props.notas.filter(n => n.favorite).length }}</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Tag Filter Component -->
            <TagFilter
              :tags="availableTags"
              :selected-tags="selectedTags"
              @toggle-tag="toggleTag"
            />

            <!-- Sort Options -->
            <div class="flex items-center gap-1">
              <Settings2 class="h-3 w-3 text-muted-foreground" />
              <span class="text-muted-foreground text-xs">Sort:</span>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="outline" size="sm" class="h-6 px-2 text-xs">
                    {{ currentSortOption?.label || 'Sort' }}
                    <ChevronDown class="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
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
            </div>

            <!-- Clear Filters -->
            <Button
              v-if="hasActiveFilters"
              variant="ghost"
              size="sm"
              class="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              @click="clearAllFiltersLocal"
            >
              <X class="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Results Info and Table -->
    <Card>
      <CardContent class="p-0">
        <!-- Results Info Bar -->
        <div class="p-3 border-b bg-muted/30">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText class="h-4 w-4" />
              <span>
                Showing {{ paginationInfo.startItem }}-{{ paginationInfo.endItem }} of {{ paginationInfo.totalItems }} notas
              </span>
            </div>
            
            <!-- Selection and New Button -->
            <div class="flex items-center gap-3">
              <div v-if="hasSelection" class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground">{{ selectionCount }} selected</span>
              </div>
              
              <Button
                variant="default"
                size="sm"
                class="h-7"
                @click="emit('create-nota')"
              >
                <FileText class="h-3 w-3 mr-1" />
                New Nota
              </Button>
            </div>
          </div>
        </div>

        <!-- Batch Actions Toolbar -->
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

        <!-- Table -->
        <div v-if="isLoading" class="p-8">
          <div class="space-y-4">
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
            <Skeleton class="h-8 w-full" />
          </div>
        </div>

        <div v-else-if="paginatedNotas.length > 0" class="max-h-[600px] overflow-y-auto">
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

        <TableEmpty v-else>
          <div class="text-center py-8">
            <FileText class="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 class="mt-4 text-lg font-semibold">No notas found</h3>
            <p class="text-muted-foreground">
              {{ hasActiveFilters ? 'Try adjusting your filters' : 'Create your first nota to get started' }}
            </p>
            <Button
              v-if="!hasActiveFilters"
              class="mt-4"
              @click="emit('create-nota')"
            >
              <FileText class="h-4 w-4 mr-2" />
              Create Nota
            </Button>
          </div>
        </TableEmpty>
      </CardContent>
    </Card>

    <!-- Pagination -->
    <Card v-if="totalPages > 1">
      <CardContent class="p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            Showing {{ paginationInfo.startItem }} to {{ paginationInfo.endItem }} of {{ paginationInfo.totalItems }} entries
          </div>
          
          <div class="flex items-center gap-1">
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
      </CardContent>
    </Card>
  </div>
</template>
