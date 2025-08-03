<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Search, 
  Filter, 
  X, 
  Star, 
  Clock, 
  SortAsc,
  SortDesc,
  Eye,
  Download,
  Trash2,
  Archive,
  MoreHorizontal,
  FileText,
  Calendar,
  Tag,
  Heart
} from 'lucide-vue-next'
import { useNotaActions } from '@/features/nota/composables/useNotaActions'
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

// State management
const selectedNotas = ref<Set<string>>(new Set())
const quickPreviewNota = ref<Nota | null>(null)
const showQuickPreview = ref(false)
const sortBy = ref<'updated' | 'created' | 'title' | 'size'>('updated')
const sortDirection = ref<'asc' | 'desc'>('desc')
const showFilters = ref(false)
const currentPage = ref(1)
const itemsPerPage = 10
const viewFilter = ref<'all' | 'favorites'>('all')
const bulkAction = ref<'delete' | 'archive' | 'export' | null>(null)

// Enhanced filtering and sorting
const filteredAndSortedNotas = computed(() => {
  let result = [...props.notas]
  
  // Apply view filtering (all or favorites)
  if (viewFilter.value === 'favorites') {
    result = result.filter(nota => nota.favorite)
  }
  
  // Apply search filtering
  if (props.searchQuery.trim()) {
    const query = props.searchQuery.toLowerCase().trim()
    result = result.filter(nota => 
      nota.title.toLowerCase().includes(query) ||
      nota.content?.toLowerCase().includes(query) ||
      nota.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }
  
  // Apply tag filtering
  if (props.selectedTag) {
    result = result.filter(nota => 
      nota.tags?.includes(props.selectedTag)
    )
  }
  
  // Apply legacy favorites filtering (for backward compatibility)
  if (props.showFavorites && viewFilter.value === 'all') {
    result = result.filter(nota => nota.favorite)
  }
  
  // Apply sorting
  result.sort((a, b) => {
    let aVal: any, bVal: any
    
    switch (sortBy.value) {
      case 'title':
        aVal = a.title.toLowerCase()
        bVal = b.title.toLowerCase()
        break
      case 'created':
        aVal = new Date(a.createdAt)
        bVal = new Date(b.createdAt)
        break
      case 'size':
        aVal = a.content?.length || 0
        bVal = b.content?.length || 0
        break
      default: // 'updated'
        aVal = new Date(a.updatedAt)
        bVal = new Date(b.updatedAt)
    }
    
    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })
  
  return result
})

// Pagination
const totalPages = computed(() => Math.ceil(filteredAndSortedNotas.value.length / itemsPerPage))
const paginatedNotas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredAndSortedNotas.value.slice(start, end)
})

// Selection management
const isAllSelected = computed(() => 
  paginatedNotas.value.length > 0 && 
  paginatedNotas.value.every(nota => selectedNotas.value.has(nota.id))
)

const isIndeterminate = computed(() => {
  const pageSelection = paginatedNotas.value.filter(nota => selectedNotas.value.has(nota.id))
  return pageSelection.length > 0 && pageSelection.length < paginatedNotas.value.length
})

const hasSelection = computed(() => selectedNotas.value.size > 0)

// Computed values for count displays
const totalAllNotas = computed(() => props.notas.length)
const totalFavoriteNotas = computed(() => props.notas.filter(nota => nota.favorite).length)

// Get visible page numbers for pagination
const getVisiblePages = (): number[] => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 1)
  const end = Math.min(totalPages.value, currentPage.value + 1)
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
}

// Filter status
const activeFiltersCount = computed(() => {
  let count = 0
  if (props.searchQuery) count++
  if (props.selectedTag) count++
  if (props.showFavorites && viewFilter.value === 'all') count++
  if (viewFilter.value === 'favorites') count++
  return count
})

// Available tags for filtering
const availableTags = computed(() => {
  const tags = new Set<string>()
  props.notas.forEach(nota => {
    nota.tags?.forEach(tag => tags.add(tag))
  })
  return Array.from(tags).sort()
})

// View counts
const allNotasCount = computed(() => props.notas.length)
const favoriteNotasCount = computed(() => props.notas.filter(nota => nota.favorite).length)

// Event handlers
const handleSelectAll = () => {
  if (isAllSelected.value) {
    // Deselect all on current page
    paginatedNotas.value.forEach(nota => {
      selectedNotas.value.delete(nota.id)
    })
  } else {
    // Select all on current page
    paginatedNotas.value.forEach(nota => {
      selectedNotas.value.add(nota.id)
    })
  }
}

const handleSelectNota = (id: string, selected: boolean) => {
  if (selected) {
    selectedNotas.value.add(id)
  } else {
    selectedNotas.value.delete(id)
  }
}

const handleQuickPreview = (nota: Nota) => {
  quickPreviewNota.value = nota
  showQuickPreview.value = true
}

const handleDeleteNota = async (notaId: string) => {
  if (confirm('Are you sure you want to delete this nota?')) {
    // Implement delete functionality
    console.log('Delete nota:', notaId)
    // You can add actual delete logic here
    // await deleteNota(notaId)
  }
}

const handleSort = (field: typeof sortBy.value) => {
  if (sortBy.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDirection.value = field === 'title' ? 'asc' : 'desc'
  }
}

const handleBulkAction = async (action: 'favorite' | 'archive' | 'delete' | 'export') => {
  if (selectedNotas.value.size === 0) return
  
  const selectedIds = Array.from(selectedNotas.value)
  
  switch (action) {
    case 'favorite':
      for (const id of selectedIds) {
        await toggleNotaFavorite(id)
      }
      break
    case 'archive':
      // Implement archive functionality
      console.log('Archive:', selectedIds)
      break
    case 'delete':
      if (confirm(`Are you sure you want to delete ${selectedIds.length} nota(s)?`)) {
        // Implement delete functionality
        console.log('Delete:', selectedIds)
      }
      break
    case 'export':
      // Implement export functionality
      console.log('Export:', selectedIds)
      break
  }
  
  selectedNotas.value.clear()
  bulkAction.value = null
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  emit('page-change', page)
}

const handleViewFilterChange = (value: 'all' | 'favorites') => {
  viewFilter.value = value
  currentPage.value = 1
  selectedNotas.value.clear()
}

const clearAllFilters = () => {
  emit('clear-filters')
  emit('update:searchQuery', '')
  emit('update:selectedTag', '')
  emit('update:showFavorites', false)
  viewFilter.value = 'all'
  currentPage.value = 1
}

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getContentPreview = (content: string | null) => {
  if (!content) return 'No content'
  return content.length > 100 ? content.slice(0, 100) + '...' : content
}

// Clear selection when filters change
watch(
  [() => props.searchQuery, () => props.selectedTag, () => props.showFavorites, viewFilter],
  () => {
    selectedNotas.value.clear()
    currentPage.value = 1
  }
)
</script>

<template>
  <div class="flex flex-col h-full space-y-4">
    <!-- Enhanced Header with Unified Controls -->
    <Card class="border-l-4 border-l-primary/30">
      <CardHeader class="pb-4">
        <div class="flex flex-col lg:flex-row lg:items-center gap-4">
          <!-- Title and Stats -->
          <div class="flex-1">
            <CardTitle class="flex items-center gap-2 text-lg">
              <Clock class="h-5 w-5" />
              Notas
              <Badge variant="secondary" class="ml-2">
                {{ filteredAndSortedNotas.length }}
              </Badge>
              <Badge v-if="activeFiltersCount" variant="outline" class="ml-1">
                {{ activeFiltersCount }} filter{{ activeFiltersCount > 1 ? 's' : '' }}
              </Badge>
            </CardTitle>
          </div>

          <!-- Unified Control Bar -->
          <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
            <!-- Search -->
            <div class="relative flex-1 sm:w-80">
              <Search class="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                :value="props.searchQuery"
                placeholder="Search notas..."
                class="pl-10 pr-10"
                @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
              />
              <Button
                v-if="props.searchQuery"
                variant="ghost"
                size="icon"
                class="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                @click="emit('update:searchQuery', '')"
              >
                <X class="h-3 w-3" />
              </Button>
            </div>

            <!-- View Controls -->
            <div class="flex items-center gap-2">
              <!-- Filter Toggle -->
              <Button
                variant="outline"
                size="sm"
                @click="showFilters = !showFilters"
                :class="{ 'bg-primary/10 text-primary': showFilters }"
              >
                <Filter class="h-4 w-4 mr-2" />
                Filters
                <Badge v-if="activeFiltersCount" variant="secondary" class="ml-2 h-4 text-xs">
                  {{ activeFiltersCount }}
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        <!-- Expandable Filters Panel -->
        <div v-if="showFilters" class="mt-4 pt-4 border-t space-y-4">
          <div class="flex flex-wrap items-center gap-3">
            <!-- View Filter -->
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">View:</span>
              <Select v-model:value="viewFilter" @update:value="handleViewFilterChange">
                <SelectTrigger class="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div class="flex items-center justify-between w-full">
                      <span>All Notas</span>
                      <Badge variant="secondary" class="ml-2">{{ totalAllNotas }}</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="favorites">
                    <div class="flex items-center justify-between w-full">
                      <span>Favorites</span>
                      <Badge variant="secondary" class="ml-2">{{ totalFavoriteNotas }}</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Tag Filter -->
            <div class="flex items-center gap-2" v-if="availableTags.length > 0">
              <span class="text-sm text-muted-foreground">Tag:</span>
              <select 
                :value="props.selectedTag"
                @change="emit('update:selectedTag', ($event.target as HTMLSelectElement).value)"
                class="px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Tags</option>
                <option 
                  v-for="tag in availableTags" 
                  :key="tag" 
                  :value="tag"
                >
                  {{ tag }}
                </option>
              </select>
            </div>

            <!-- Sort Options -->
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">Sort by:</span>
              <Button
                v-for="option in [
                  { key: 'updated', label: 'Updated' },
                  { key: 'created', label: 'Created' },
                  { key: 'title', label: 'Title' },
                  { key: 'size', label: 'Size' }
                ]"
                :key="option.key"
                variant="ghost"
                size="sm"
                :class="{ 'bg-primary/10 text-primary': sortBy === option.key }"
                @click="handleSort(option.key as any)"
              >
                {{ option.label }}
                <SortAsc v-if="sortBy === option.key && sortDirection === 'asc'" class="h-3 w-3 ml-1" />
                <SortDesc v-else-if="sortBy === option.key && sortDirection === 'desc'" class="h-3 w-3 ml-1" />
              </Button>
            </div>

            <!-- Clear Filters -->
            <Button
              v-if="activeFiltersCount > 0"
              variant="destructive"
              size="sm"
              @click="clearAllFilters"
            >
              <X class="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        <!-- Bulk Actions Bar -->
        <div v-if="hasSelection" class="mt-4 pt-4 border-t">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <Checkbox
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @update:checked="handleSelectAll"
              />
              <span class="text-sm text-muted-foreground">
                {{ selectedNotas.size }} of {{ paginatedNotas.length }} selected on this page
              </span>
            </div>

            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="handleBulkAction('favorite')"
              >
                <Star class="h-4 w-4 mr-2" />
                Favorite
              </Button>
              <Button
                variant="outline"
                size="sm"
                @click="handleBulkAction('export')"
              >
                <Download class="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                @click="handleBulkAction('archive')"
              >
                <Archive class="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button
                variant="destructive"
                size="sm"
                @click="handleBulkAction('delete')"
              >
                <Trash2 class="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>

    <!-- Main Content -->
    <Card>
                    <CardContent class="p-0">
            <!-- Empty State -->
            <div v-if="isLoading" class="p-8">
              <div class="space-y-4">
                <Skeleton class="h-8 w-full" />
                <Skeleton class="h-8 w-full" />
                <Skeleton class="h-8 w-full" />
                <Skeleton class="h-8 w-full" />
                <Skeleton class="h-8 w-full" />
              </div>
            </div>

            <!-- Table Content with max height and scroll -->
            <div v-else-if="paginatedNotas.length > 0" class="max-h-[600px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader class="sticky top-0 bg-background border-b z-10">
                  <TableRow>
                    <TableHead class="w-12">
                      <!-- Empty header for checkbox column -->
                    </TableHead>
                    <TableHead class="cursor-pointer" @click="handleSort('title')">
                      <div class="flex items-center gap-2">
                        Title
                        <SortAsc v-if="sortBy === 'title' && sortDirection === 'asc'" class="h-3 w-3" />
                        <SortDesc v-else-if="sortBy === 'title' && sortDirection === 'desc'" class="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead class="cursor-pointer" @click="handleSort('updated')">
                      <div class="flex items-center gap-2">
                        Updated
                        <SortAsc v-if="sortBy === 'updated' && sortDirection === 'asc'" class="h-3 w-3" />
                        <SortDesc v-else-if="sortBy === 'updated' && sortDirection === 'desc'" class="h-3 w-3" />
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
                    @click="router.push(`/nota/${nota.id}`)"
                  >
                    <TableCell @click.stop>
                      <Checkbox
                        :checked="selectedNotas.has(nota.id)"
                        @update:checked="(checked: boolean) => handleSelectNota(nota.id, checked)"
                        class="transition-opacity duration-200"
                        :class="selectedNotas.has(nota.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
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
                          @click="router.push(`/nota/${nota.id}`)"
                          title="Open"
                        >
                          <FileText class="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8 text-destructive hover:text-destructive"
                          @click="handleDeleteNota(nota.id)"
                          title="Delete"
                        >
                          <Trash2 class="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <!-- Pagination -->
              <div class="border-t p-4">
                <div class="flex items-center justify-between">
                  <div class="text-sm text-muted-foreground">
                    Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to 
                    {{ Math.min(currentPage * itemsPerPage, filteredAndSortedNotas.length) }} of 
                    {{ filteredAndSortedNotas.length }} entries
                  </div>
                  
                  <div v-if="totalPages > 1" class="flex items-center gap-1">
                    <!-- Previous button -->
                    <Button 
                      variant="outline" 
                      size="sm" 
                      :disabled="currentPage === 1" 
                      @click="currentPage = Math.max(1, currentPage - 1)"
                      class="h-9 px-3"
                    >
                      Previous
                    </Button>
                    
                    <!-- First page if not near beginning -->
                    <Button
                      v-if="currentPage > 3"
                      variant="ghost" 
                      size="sm" 
                      @click="currentPage = 1"
                      class="h-9 w-9"
                    >
                      1
                    </Button>
                    
                    <!-- Ellipsis if gap -->
                    <span v-if="currentPage > 4" class="px-2 text-muted-foreground">...</span>
                    
                    <!-- Page numbers around current -->
                    <Button
                      v-for="page in getVisiblePages()"
                      :key="page"
                      :variant="page === currentPage ? 'default' : 'ghost'"
                      size="sm"
                      @click="currentPage = page"
                      class="h-9 w-9"
                    >
                      {{ page }}
                    </Button>
                    
                    <!-- Ellipsis if gap -->
                    <span v-if="currentPage < totalPages - 3" class="px-2 text-muted-foreground">...</span>
                    
                    <!-- Last page if not near end -->
                    <Button
                      v-if="currentPage < totalPages - 2"
                      variant="ghost" 
                      size="sm" 
                      @click="currentPage = totalPages"
                      class="h-9 w-9"
                    >
                      {{ totalPages }}
                    </Button>
                    
                    <!-- Next button -->
                    <Button 
                      variant="outline" 
                      size="sm" 
                      :disabled="currentPage === totalPages" 
                      @click="currentPage = Math.min(totalPages, currentPage + 1)"
                      class="h-9 px-3"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else>
              <TableEmpty 
                icon="FileText"
                title="No notas found"
                description="Start creating your first nota or adjust your filters."
              />
            </div>
          </CardContent>
        </Card>

    <!-- Quick Preview Modal -->
    <div
      v-if="showQuickPreview && quickPreviewNota"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click="showQuickPreview = false"
    >
      <Card
        class="max-w-2xl w-full max-h-[80vh] overflow-hidden"
        @click.stop
      >
        <CardHeader class="border-b">
          <div class="flex items-center justify-between">
            <CardTitle class="text-lg">{{ quickPreviewNota.title }}</CardTitle>
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="router.push(`/nota/${quickPreviewNota.id}`)"
              >
                <FileText class="h-4 w-4 mr-2" />
                Open
              </Button>
              <Button
                variant="ghost"
                size="icon"
                @click="showQuickPreview = false"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent class="p-6 overflow-y-auto max-h-96">
          <div class="prose prose-sm max-w-none">
            {{ getContentPreview(quickPreviewNota.content) }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Focus management */
.group:focus-within {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Custom scrollbar for modal */
.prose {
  max-width: none;
}
</style>









