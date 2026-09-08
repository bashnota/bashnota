<script setup lang="ts">
import { computed } from 'vue'
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
  Star,
  SortAsc,
  SortDesc,
  Eye,
  Trash2,
  FileText,
  Calendar,
  ExternalLink,
  Ellipsis,
} from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Nota } from '@/features/nota/types/nota'
import type { SortField } from '@/features/nota/composables/useNotaSorting'

interface Props {
  notas: Nota[]
  currentSortOption?: { key: string; label: string }
  sortDirection?: 'asc' | 'desc'
  isAllSelected?: boolean
  isIndeterminate?: boolean
  showActions?: boolean
  showSelection?: boolean
  mode?: 'list' | 'search' // Different modes for different layouts
  formatDate: (date: string | Date) => string
  isNotaSelected: (id: string) => boolean
  isFilesystemNota?: (id: string) => boolean // New prop to identify filesystem notas
}

interface Emits {
  (e: 'sort', field: SortField): void
  (e: 'select-all', checked: boolean): void
  (e: 'select-nota', id: string, checked: boolean): void
  (e: 'nota-click', nota: Nota): void
  (e: 'preview-nota', nota: Nota): void
  (e: 'toggle-favorite', id: string): void
  (e: 'delete-nota', id: string): void
  (e: 'tag-click', tag: string): void
  (e: 'open-nota', id: string): void
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  showSelection: true,
  mode: 'list'
})

const emit = defineEmits<Emits>()

// Compute header classes based on mode
const headerClass = computed(() => 
  props.mode === 'search' 
    ? 'sticky top-0 bg-background/95 backdrop-blur'
    : 'sticky top-0 bg-background border-b z-10'
)
</script>

<template>
  <Table>
    <TableHeader :class="headerClass">
      <TableRow>
        <TableHead v-if="showSelection" class="w-12">
          <Checkbox
            :model-value="isIndeterminate ? 'indeterminate' : isAllSelected"
            aria-label="Select all notas on this page"
            @update:model-value="emit('select-all', $event === true)"
          />
        </TableHead>
        <TableHead class="cursor-pointer" @click="emit('sort', 'title')">
          <div class="flex items-center gap-2">
            Title
            <span v-if="currentSortOption?.key === 'title'" class="text-xs">
              <SortAsc v-if="sortDirection === 'asc'" class="h-3 w-3" />
              <SortDesc v-else class="h-3 w-3" />
            </span>
          </div>
        </TableHead>
        <TableHead>Tags</TableHead>
        <TableHead class="cursor-pointer" @click="emit('sort', 'updated')">
          <div class="flex items-center gap-2">
            Updated
            <span v-if="currentSortOption?.key === 'updated'" class="text-xs">
              <SortAsc v-if="sortDirection === 'asc'" class="h-3 w-3" />
              <SortDesc v-else class="h-3 w-3" />
            </span>
          </div>
        </TableHead>
        <TableHead v-if="showActions" :class="mode === 'search' ? 'w-40' : 'w-14 text-right'">
          <span :class="mode === 'list' ? 'sr-only' : ''">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow 
        v-for="nota in notas" 
        :key="nota.id"
        class="cursor-pointer hover:bg-muted/50"
        :class="mode === 'list' ? 'group' : ''"
        @click="emit('nota-click', nota)"
      >
        <TableCell v-if="showSelection" @click.stop>
          <Checkbox
            :model-value="isNotaSelected(nota.id)"
            :aria-label="`Select ${nota.title}`"
            @update:model-value="emit('select-nota', nota.id, $event === true)"
            :class="mode === 'list' ? 
              'transition-opacity duration-200 ' + (isNotaSelected(nota.id) ? 'opacity-100' : 'opacity-60 group-hover:opacity-100') 
              : ''"
          />
        </TableCell>
        <TableCell class="font-medium">
          <div class="flex items-center gap-2">
            <FileText class="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span class="truncate">{{ nota.title }}</span>
            <Star v-if="nota.favorite" class="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
            <Badge 
              v-if="isFilesystemNota && isFilesystemNota(nota.id)" 
              variant="outline" 
              class="text-xs flex-shrink-0 bg-primary/10 text-primary border-primary/20"
            >
              Filesystem
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          <div v-if="nota.tags && nota.tags.length > 0" class="flex flex-wrap gap-1">
            <Badge
              v-for="tag in nota.tags.slice(0, mode === 'search' ? 3 : 2)"
              :key="tag"
              variant="secondary"
              class="text-xs cursor-pointer"
              @click.stop="emit('tag-click', tag)"
            >
              {{ tag }}
            </Badge>
            <span 
              v-if="nota.tags.length > (mode === 'search' ? 3 : 2)" 
              class="text-xs text-muted-foreground"
            >
              +{{ nota.tags.length - (mode === 'search' ? 3 : 2) }}
            </span>
          </div>
          <span v-else class="text-muted-foreground italic text-sm">No tags</span>
        </TableCell>
        <TableCell>
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar class="h-3 w-3" />
            {{ formatDate(nota.updatedAt) }}
          </div>
        </TableCell>
        <TableCell v-if="showActions" @click.stop>
          <div v-if="mode === 'search'" class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              @click="emit('preview-nota', nota)"
              title="Preview"
            >
              <Eye class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              @click="emit('toggle-favorite', nota.id)"
              title="Toggle Favorite"
            >
              <Star 
                class="h-4 w-4" 
                :class="nota.favorite ? 'text-yellow-500 fill-current' : 'text-muted-foreground'" 
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              @click="emit('open-nota', nota.id)"
              title="Open in new tab"
            >
              <ExternalLink class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="text-destructive hover:text-destructive"
              @click="emit('delete-nota', nota.id)"
              title="Delete"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>

          <div v-else class="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-muted-foreground hover:text-foreground"
                  :aria-label="`Actions for ${nota.title}`"
                >
                  <Ellipsis class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-48">
                <DropdownMenuItem @select="emit('preview-nota', nota)">
                  <Eye class="h-4 w-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem @select="emit('toggle-favorite', nota.id)">
                  <Star :class="['h-4 w-4', nota.favorite ? 'fill-current text-yellow-500' : '']" />
                  {{ nota.favorite ? 'Remove favorite' : 'Add to favorites' }}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  class="text-destructive focus:text-destructive"
                  @select="emit('delete-nota', nota.id)"
                >
                  <Trash2 class="h-4 w-4" />
                  Delete nota
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      <!-- Empty state slot -->
      <slot name="empty-state" />
    </TableBody>
  </Table>
</template>
