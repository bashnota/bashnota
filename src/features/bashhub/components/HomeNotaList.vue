<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  Star, 
  Clock, 
  SortAsc,
  SortDesc,
  Eye,
  Download,
  Trash2,
  FileText,
  Calendar,
  ChevronDown,
  Hash,
  Settings2
} from 'lucide-vue-next'
import { useNotaActions } from '@/features/nota/composables/useNotaActions'
import { useNotaList } from '@/features/nota/composables/useNotaList'
import SearchInput from '@/features/nota/components/SearchInput.vue'
import QuickFilters from '@/features/nota/components/QuickFilters.vue'
import TagFilter from '@/features/nota/components/TagFilter.vue'
import type { Nota } from '@/features/nota/types/nota'

interface Props {
  isLoading: boolean
  showFavorites: boolean
  searchQuery: string
  selectedTag: string
  notas: Nota[]
  totalCount?: number
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
const { toggleNotaFavorite, navigateToNotaSettings } = useNotaActions()

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

// Override the composable's clearAllFilters to include emit calls
const clearAllFiltersLocal = () => {
  clearFiltersComposable()
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
                <span class="text-xs text-muted-foreground">{{ hasSelection }} selected</span>
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
          <Table>
            <TableHeader class="sticky top-0 bg-background border-b z-10">
              <TableRow>
                <TableHead class="w-12">
                  <Checkbox
                    :checked="isAllSelected"
                    :indeterminate="isIndeterminate"
                    @update:checked="handleSelectAll"
                  />
                </TableHead>
                <TableHead class="cursor-pointer" @click="handleSort('title')">
                  <div class="flex items-center gap-2">
                    Title
                    <SortAsc v-if="currentSortOption?.key === 'title' && sortDirection === 'asc'" class="h-3 w-3" />
                    <SortDesc v-else-if="currentSortOption?.key === 'title'" class="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Tags</TableHead>
                <TableHead class="cursor-pointer" @click="handleSort('updated')">
                  <div class="flex items-center gap-2">
                    Updated
                    <SortAsc v-if="currentSortOption?.key === 'updated' && sortDirection === 'asc'" class="h-3 w-3" />
                    <SortDesc v-else-if="currentSortOption?.key === 'updated'" class="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead class="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="nota in paginatedNotas"
                :key="nota.id"
                class="cursor-pointer hover:bg-muted/50 group"
                @click="handleNotaClick(nota)"
              >
                <TableCell @click.stop>
                  <Checkbox
                    :checked="isNotaSelected(nota.id)"
                    @update:checked="(checked: boolean) => handleSelectNota(nota.id, checked)"
                    class="transition-opacity duration-200"
                    :class="isNotaSelected(nota.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                  />
                </TableCell>
                <TableCell class="font-medium">
                  <div class="flex items-center gap-2">
                    <Star 
                      v-if="nota.favorite"
                      class="h-4 w-4 text-yellow-500 fill-current"
                    />
                    {{ nota.title }}
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="tag in nota.tags?.slice(0, 2)"
                      :key="tag"
                      variant="secondary"
                      class="text-xs cursor-pointer"
                      @click.stop="emit('update:selectedTag', tag)"
                    >
                      {{ tag }}
                    </Badge>
                    <Badge
                      v-if="nota.tags && nota.tags.length > 2"
                      variant="outline"
                      class="text-xs"
                    >
                      +{{ nota.tags.length - 2 }}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar class="h-3 w-3" />
                    {{ formatDate(nota.updatedAt) }}
                  </div>
                </TableCell>
                <TableCell @click.stop>
                  <div class="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      @click="handleQuickPreview(nota)"
                      title="Preview"
                    >
                      <Eye class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      @click="() => toggleNotaFavorite(nota.id)"
                      title="Toggle Favorite"
                    >
                      <Star class="h-4 w-4" :class="nota.favorite ? 'text-yellow-500 fill-current' : 'text-muted-foreground'" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8 text-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
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
