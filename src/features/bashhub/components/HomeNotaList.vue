<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Filter, 
  X, 
  Star, 
  Clock, 
  Grid3X3, 
  List, 
  Table2,
  SortAsc,
  SortDesc,
  Eye,
  Share,
  Download,
  Trash2,
  Archive,
  MoreHorizontal,
  FileText,
  Plus,
  ArrowUp
} from 'lucide-vue-next'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useNotaActions } from '@/features/nota/composables/useNotaActions'
import { useVirtualList } from '@vueuse/core'
import type { Nota } from '@/features/nota/types/nota'

// Import enhanced components
import {
  NotaCard,
  NotaListEmptyState,
  NotaListSkeleton
} from './nota-list'

interface Props {
  isLoading: boolean
  viewType: 'grid' | 'list' | 'compact'
  showFavorites: boolean
  searchQuery: string
  selectedTag: string
  notas: Nota[]
}

interface Emits {
  (e: 'create-nota'): void
  (e: 'update:selectedTag', value: string): void
  (e: 'clear-filters'): void
  (e: 'update:viewType', value: 'grid' | 'list' | 'compact'): void
  (e: 'update:searchQuery', value: string): void
  (e: 'update:showFavorites', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()
const { toggleNotaFavorite, navigateToNotaSettings } = useNotaActions()

// Enhanced state management
const selectedNotas = ref<Set<string>>(new Set())
const quickPreviewNota = ref<Nota | null>(null)
const showQuickPreview = ref(false)
const sortBy = ref<'updated' | 'created' | 'title' | 'size'>('updated')
const sortDirection = ref<'asc' | 'desc'>('desc')
const showFilters = ref(false)
const scrollContainer = ref<HTMLElement>()
const showScrollTop = ref(false)

// View configuration
const VIEW_CONFIGS = {
  grid: { itemHeight: 280, itemsPerRow: 3, gap: 16 },
  list: { itemHeight: 120, itemsPerRow: 1, gap: 12 },
  compact: { itemHeight: 80, itemsPerRow: 1, gap: 8 }
}

// Enhanced filtering and sorting
const filteredAndSortedNotas = computed(() => {
  let result = [...props.notas]
  
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
  
  // Apply favorites filtering
  if (props.showFavorites) {
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

// Virtual scrolling setup
const { list, containerProps, wrapperProps, scrollTo } = useVirtualList(
  filteredAndSortedNotas,
  {
    itemHeight: () => VIEW_CONFIGS[props.viewType].itemHeight,
    overscan: 5,
  }
)

// Selection management
const isAllSelected = computed(() => 
  filteredAndSortedNotas.value.length > 0 && 
  filteredAndSortedNotas.value.every(nota => selectedNotas.value.has(nota.id))
)

const isIndeterminate = computed(() => 
  selectedNotas.value.size > 0 && 
  selectedNotas.value.size < filteredAndSortedNotas.value.length
)

const hasSelection = computed(() => selectedNotas.value.size > 0)

// Filter status
const activeFiltersCount = computed(() => {
  let count = 0
  if (props.searchQuery) count++
  if (props.selectedTag) count++
  if (props.showFavorites) count++
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

// Event handlers
const handleSelectAll = () => {
  if (isAllSelected.value) {
    selectedNotas.value.clear()
  } else {
    selectedNotas.value = new Set(filteredAndSortedNotas.value.map(n => n.id))
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

const handleSort = (field: typeof sortBy.value) => {
  if (sortBy.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDirection.value = field === 'title' ? 'asc' : 'desc'
  }
}

const handleBulkAction = async (action: 'favorite' | 'archive' | 'delete' | 'export') => {
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
      // Implement delete functionality
      console.log('Delete:', selectedIds)
      break
    case 'export':
      // Implement export functionality
      console.log('Export:', selectedIds)
      break
  }
  
  selectedNotas.value.clear()
}

const clearAllFilters = () => {
  emit('clear-filters')
  emit('update:searchQuery', '')
  emit('update:selectedTag', '')
  emit('update:showFavorites', false)
}

// Scroll handling
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  showScrollTop.value = target.scrollTop > 500
}

const scrollToTop = () => {
  scrollTo(0)
  nextTick(() => {
    showScrollTop.value = false
  })
}

// Clear selection when filters change
watch(
  [() => props.searchQuery, () => props.selectedTag, () => props.showFavorites],
  () => {
    selectedNotas.value.clear()
  }
)

// Container classes for different view types
const containerClasses = computed(() => {
  const config = VIEW_CONFIGS[props.viewType]
  const baseClasses = 'transition-all duration-200'
  
  switch (props.viewType) {
    case 'grid':
      return `${baseClasses} grid gap-4 auto-rows-max`
    case 'list':
      return `${baseClasses} space-y-3`
    case 'compact':
      return `${baseClasses} divide-y divide-border/30`
    default:
      return baseClasses
  }
})

const gridCols = computed(() => {
  const cols = VIEW_CONFIGS[props.viewType].itemsPerRow
  return `grid-cols-1 ${cols > 1 ? `md:grid-cols-2 lg:grid-cols-${cols}` : ''}`
})
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
              {{ props.showFavorites ? 'Favorite' : 'Recent' }} Notas
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

              <!-- View Type -->
              <div class="flex border rounded-md p-0.5">
                <Button
                  v-for="type in ['grid', 'list', 'compact']"
                  :key="type"
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  :class="{ 'bg-primary/10 text-primary': props.viewType === type }"
                  @click="emit('update:viewType', type as any)"
                >
                  <Grid3X3 v-if="type === 'grid'" class="h-4 w-4" />
                  <List v-else-if="type === 'list'" class="h-4 w-4" />
                  <Table2 v-else class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- Expandable Filters Panel -->
        <div v-if="showFilters" class="mt-4 pt-4 border-t space-y-4">
          <div class="flex flex-wrap items-center gap-3">
            <!-- Quick Filters -->
            <Button
              variant="outline"
              size="sm"
              :class="{ 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400': props.showFavorites }"
              @click="emit('update:showFavorites', !props.showFavorites)"
            >
              <Star class="h-4 w-4 mr-2" :class="{ 'fill-current': props.showFavorites }" />
              Favorites Only
            </Button>

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
                {{ selectedNotas.size }} of {{ filteredAndSortedNotas.length }} selected
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

    <!-- Content Area -->
    <div class="flex-1 min-h-0 relative">
      <!-- Loading State -->
      <NotaListSkeleton 
        v-if="isLoading"
        :view-type="props.viewType"
        :count="12"
      />

      <!-- Empty State -->
      <NotaListEmptyState
        v-else-if="filteredAndSortedNotas.length === 0"
        :show-favorites="props.showFavorites"
        :has-search-query="Boolean(props.searchQuery)"
        :has-selected-tag="Boolean(props.selectedTag)"
        :search-query="props.searchQuery"
        :selected-tag="props.selectedTag"
        @create-nota="emit('create-nota')"
        @clear-filters="clearAllFilters"
      />

      <!-- Virtual Scrolled Content -->
      <div
        v-else
        v-bind="containerProps"
        class="h-full overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background"
        @scroll="handleScroll"
      >
        <div v-bind="wrapperProps" :class="[containerClasses, gridCols]">
          <div
            v-for="{ data: nota, index } in list"
            :key="nota.id"
            class="relative group"
          >
            <!-- Selection Checkbox (for non-compact view) -->
            <div 
              v-if="props.viewType !== 'compact'"
              class="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Checkbox
                :checked="selectedNotas.has(nota.id)"
                @update:checked="(checked: boolean) => handleSelectNota(nota.id, checked)"
                class="bg-background/80 backdrop-blur-sm"
              />
            </div>

            <!-- Quick Actions Overlay -->
            <div 
              class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
            >
              <Button
                variant="secondary"
                size="icon"
                class="h-8 w-8 bg-background/80 backdrop-blur-sm"
                @click="handleQuickPreview(nota)"
              >
                <Eye class="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                class="h-8 w-8 bg-background/80 backdrop-blur-sm"
                @click="navigateToNotaSettings(nota.id)"
              >
                <MoreHorizontal class="h-4 w-4" />
              </Button>
            </div>

            <!-- Enhanced Nota Card -->
            <NotaCard
              :nota="nota"
              :view-type="props.viewType"
              :is-selected="selectedNotas.has(nota.id)"
              @toggle-favorite="toggleNotaFavorite"
              @tag-click="(tag: string) => emit('update:selectedTag', tag)"
              @more-actions="navigateToNotaSettings"
              @click="router.push(`/nota/${nota.id}`)"
              class="cursor-pointer h-full"
            />
          </div>
        </div>
      </div>

      <!-- Scroll to Top Button -->
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-300"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <Button
          v-if="showScrollTop"
          variant="secondary"
          size="icon"
          class="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-20"
          @click="scrollToTop"
        >
          <ArrowUp class="h-5 w-5" />
        </Button>
      </Transition>
    </div>

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
            {{ quickPreviewNota.content?.slice(0, 500) }}...
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
/* Enhanced grid responsive behavior */
.grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Enhanced scrollbar */
.scrollbar-thin {
  scrollbar-width: thin;
}

.scrollbar-thumb-muted {
  scrollbar-color: hsl(var(--muted)) transparent;
}

/* Focus management */
.group:focus-within {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Selection state */
.group[data-selected="true"] {
  ring: 2px;
  ring-color: hsl(var(--primary));
  ring-opacity: 0.5;
}
</style>









