<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, h } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useRouter } from 'vue-router'
import type {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'
import {
  createColumnHelper,
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  FileText,
  Star,
  Clock,
  Tag,
  Calendar,
  X,
  Filter,
  ChevronDown,
  Hash,
  ChevronsUpDown,
  ExternalLink
} from 'lucide-vue-next'
import { cn, valueUpdater } from '@/lib/utils'

// Use the actual nota type from the store
type Nota = any // Will be inferred from notaStore.items

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

// Search state
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const selectedFilters = ref<Set<string>>(new Set())
const selectedTags = ref<Set<string>>(new Set())

// Table state
const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref({})

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
    searchQuery.value = ''
    selectedFilters.value.clear()
    selectedTags.value.clear()
    sorting.value = []
    columnFilters.value = []
    rowSelection.value = {}
  }
})

// Get all available tags from notas
const availableTags = computed(() => {
  const tags = new Set<string>()
  const allNotas = notaStore.items
  
  allNotas.forEach(nota => {
    if (nota.tags && Array.isArray(nota.tags)) {
      nota.tags.forEach(tag => tags.add(tag))
    }
  })
  
  return Array.from(tags).sort()
})

// Filter options
const filterOptions = [
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'recent', label: 'Recent (7 days)', icon: Clock },
  { id: 'has-tags', label: 'Has Tags', icon: Tag },
]

// Filtered and sorted notas with table integration
const filteredNotas = computed(() => {
  let items = notaStore.items

  // Apply global search filter
  const query = searchQuery.value.toLowerCase().trim()
  if (query) {
    items = items.filter(nota => {
      const titleMatch = nota.title.toLowerCase().includes(query)
      const contentMatch = nota.content?.toLowerCase().includes(query) || false
      const tagMatch = nota.tags?.some(tag => tag.toLowerCase().includes(query)) || false
      return titleMatch || contentMatch || tagMatch
    })
  }

  // Apply custom filters
  if (selectedFilters.value.has('favorites')) {
    items = items.filter(nota => nota.favorite)
  }

  if (selectedFilters.value.has('recent')) {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    items = items.filter(nota => new Date(nota.updatedAt) > sevenDaysAgo)
  }

  if (selectedFilters.value.has('has-tags')) {
    items = items.filter(nota => nota.tags && nota.tags.length > 0)
  }

  // Apply tag filters
  if (selectedTags.value.size > 0) {
    items = items.filter(nota => {
      if (!nota.tags) return false
      return Array.from(selectedTags.value).every(tag => nota.tags!.includes(tag))
    })
  }

  return items
})

// Create table columns
const columnHelper = createColumnHelper<Nota>()

const columns = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) => h(Checkbox, {
      'modelValue': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
      'onUpdate:modelValue': value => table.toggleAllPageRowsSelected(!!value),
      'ariaLabel': 'Select all',
    }),
    cell: ({ row }) => {
      return h(Checkbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': value => row.toggleSelected(!!value),
        'ariaLabel': 'Select row',
      })
    },
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor('title', {
    header: ({ column }) => {
      return h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Title', h(ChevronsUpDown, { class: 'ml-2 h-4 w-4' })])
    },
    cell: ({ row }) => {
      const nota = row.original
      return h('div', { class: 'flex items-center gap-2' }, [
        h(FileText, { class: 'h-4 w-4 text-muted-foreground flex-shrink-0' }),
        h('span', { 
          class: 'font-medium truncate'
        }, nota.title),
        nota.favorite ? h(Star, { class: 'h-3 w-3 text-yellow-500 flex-shrink-0' }) : null
      ])
    },
  }),
  columnHelper.accessor('tags', {
    header: 'Tags',
    cell: ({ row }) => {
      const tags = row.original.tags
      if (!tags || tags.length === 0) return h('span', { class: 'text-muted-foreground italic' }, 'No tags')
      return h('div', { class: 'flex flex-wrap gap-1' }, 
        tags.slice(0, 3).map(tag => 
          h(Badge, { variant: 'secondary', class: 'text-xs' }, tag)
        ).concat(
          tags.length > 3 ? [h('span', { class: 'text-xs text-muted-foreground' }, `+${tags.length - 3}`)] : []
        )
      )
    },
    enableSorting: false,
  }),
  columnHelper.accessor('updatedAt', {
    header: ({ column }) => {
      return h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Updated', h(ChevronsUpDown, { class: 'ml-2 h-4 w-4' })])
    },
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2 text-sm text-muted-foreground' }, [
        h(Calendar, { class: 'h-3 w-3' }),
        formatDate(row.original.updatedAt)
      ])
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const nota = row.original
      return h('div', { class: 'flex items-center gap-2' }, [
        h(Button, {
          variant: 'ghost',
          size: 'sm',
          onClick: () => openNota(nota.id),
        }, () => [h(ExternalLink, { class: 'h-4 w-4' })])
      ])
    },
    enableHiding: false,
    enableSorting: false,
  }),
]

// Create table instance
const table = useVueTable({
  get data() { return filteredNotas.value },
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
  onColumnFiltersChange: updaterOrValue => valueUpdater(updaterOrValue, columnFilters),
  onColumnVisibilityChange: updaterOrValue => valueUpdater(updaterOrValue, columnVisibility),
  onRowSelectionChange: updaterOrValue => valueUpdater(updaterOrValue, rowSelection),
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
    get columnVisibility() { return columnVisibility.value },
    get rowSelection() { return rowSelection.value },
  },
})

// Toggle filter
const toggleFilter = (filterId: string) => {
  if (selectedFilters.value.has(filterId)) {
    selectedFilters.value.delete(filterId)
  } else {
    selectedFilters.value.add(filterId)
  }
}

// Toggle tag filter
const toggleTag = (tag: string) => {
  if (selectedTags.value.has(tag)) {
    selectedTags.value.delete(tag)
  } else {
    selectedTags.value.add(tag)
  }
}

// Clear all filters
const clearFilters = () => {
  selectedFilters.value.clear()
  selectedTags.value.clear()
  searchQuery.value = ''
}

// Open nota
const openNota = (notaId: string) => {
  router.push(`/nota/${notaId}`)
  emit('update:open', false)
}

// Format date
const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}

// Highlight search terms in text
const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>')
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
        <div class="relative mt-4">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref="searchInput"
            v-model="searchQuery"
            placeholder="Search by title, content, or tags..."
            class="pl-10 pr-4"
            @keydown.escape="emit('update:open', false)"
          />
        </div>

        <!-- Filters and Sort -->
        <div class="flex flex-wrap items-center gap-3 mt-4">
          <!-- Filter Buttons -->
          <div class="flex items-center gap-2">
            <Filter class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm font-medium">Filters:</span>
            <Button
              v-for="filter in filterOptions"
              :key="filter.id"
              @click="toggleFilter(filter.id)"
              :variant="selectedFilters.has(filter.id) ? 'default' : 'outline'"
              size="sm"
              class="h-7"
            >
              <component :is="filter.icon" class="h-3 w-3 mr-1" />
              {{ filter.label }}
            </Button>
          </div>

          <div class="h-4 border-l border-border"></div>

          <!-- Column Visibility Toggle -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm">
                Columns <ChevronDown class="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                v-for="column in table.getAllColumns().filter((column) => column.getCanHide())"
                :key="column.id"
                class="capitalize"
                :model-value="column.getIsVisible()"
                @update:model-value="(value) => {
                  column.toggleVisibility(!!value)
                }"
              >
                {{ column.id }}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <!-- Clear Filters -->
          <Button
            v-if="selectedFilters.size > 0 || selectedTags.size > 0 || searchQuery"
            @click="clearFilters"
            variant="ghost"
            size="sm"
            class="ml-auto"
          >
            <X class="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>

        <!-- Tag Filters -->
        <div v-if="availableTags.length > 0" class="mt-3">
          <div class="flex items-center gap-2 mb-2">
            <Hash class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm font-medium">Tags:</span>
          </div>
          <div class="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            <Badge
              v-for="tag in availableTags"
              :key="tag"
              @click="toggleTag(tag)"
              :variant="selectedTags.has(tag) ? 'default' : 'outline'"
              class="cursor-pointer hover:bg-primary/10 text-xs"
            >
              {{ tag }}
            </Badge>
          </div>
        </div>
      </DialogHeader>

      <div class="border-t border-border"></div>

      <!-- Results -->
      <div class="flex-1 min-h-0">
        <div class="h-[500px] overflow-hidden p-4">
          <!-- Results Count -->
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm text-muted-foreground">
              {{ filteredNotas.length }} {{ filteredNotas.length === 1 ? 'nota' : 'notas' }} found
            </span>
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              {{ table.getFilteredSelectedRowModel().rows.length }} of
              {{ table.getFilteredRowModel().rows.length }} row(s) selected.
            </div>
          </div>

          <!-- Data Table -->
          <div class="rounded-md border overflow-auto max-h-[380px]">
            <Table>
              <TableHeader>
                <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                  <TableHead
                    v-for="header in headerGroup.headers" 
                    :key="header.id"
                    :class="cn('sticky top-0 bg-background/95 backdrop-blur')"
                  >
                    <FlexRender 
                      v-if="!header.isPlaceholder" 
                      :render="header.column.columnDef.header" 
                      :props="header.getContext()" 
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <template v-if="table.getRowModel().rows?.length">
                  <TableRow 
                    v-for="row in table.getRowModel().rows" 
                    :key="row.id"
                    :data-state="row.getIsSelected() && 'selected'"
                    class="cursor-pointer hover:bg-muted/50"
                    @click="openNota(row.original.id)"
                  >
                    <TableCell
                      v-for="cell in row.getVisibleCells()" 
                      :key="cell.id"
                    >
                      <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                    </TableCell>
                  </TableRow>
                </template>

                <TableRow v-else>
                  <TableCell
                    :colspan="columns.length"
                    class="h-24 text-center"
                  >
                    <div class="flex flex-col items-center justify-center py-8">
                      <Search class="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 class="text-lg font-medium mb-2">No notas found</h3>
                      <p class="text-muted-foreground mb-4">
                        Try adjusting your search terms or filters
                      </p>
                      <Button @click="clearFilters" variant="outline">
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between space-x-2 py-4">
            <div class="text-sm text-muted-foreground">
              Page {{ table.getState().pagination.pageIndex + 1 }} of {{ table.getPageCount() }}
            </div>
            <div class="space-x-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="!table.getCanPreviousPage()"
                @click="table.previousPage()"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="!table.getCanNextPage()"
                @click="table.nextPage()"
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
