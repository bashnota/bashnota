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
  ExternalLink
} from 'lucide-vue-next'
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
}

interface Emits {
  (e: 'sort', field: SortField): void
  (e: 'select-all'): void
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

// Compute action button size based on mode
const actionButtonSize = computed(() => props.mode === 'search' ? 'sm' : 'icon')
const actionButtonClass = computed(() => 
  props.mode === 'search' ? '' : 'h-8 w-8'
)

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
            :checked="isAllSelected"
            :indeterminate="isIndeterminate"
            @update:checked="emit('select-all')"
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
        <TableHead v-if="showActions" :class="mode === 'search' ? 'w-40' : 'w-32'">
          Actions
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
            :checked="isNotaSelected(nota.id)"
            @update:checked="(checked: boolean) => emit('select-nota', nota.id, checked)"
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
          <div class="flex items-center gap-1">
            <!-- All modes: Full actions available -->
            <Button
              variant="ghost"
              :size="actionButtonSize"
              :class="mode === 'list' ? actionButtonClass : ''"
              @click="emit('preview-nota', nota)"
              title="Preview"
            >
              <Eye class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              :size="actionButtonSize"
              :class="mode === 'list' ? actionButtonClass : ''"
              @click="emit('toggle-favorite', nota.id)"
              title="Toggle Favorite"
            >
              <Star 
                class="h-4 w-4" 
                :class="nota.favorite ? 'text-yellow-500 fill-current' : 'text-muted-foreground'" 
              />
            </Button>
            <Button
              v-if="mode === 'search'"
              variant="ghost"
              :size="actionButtonSize"
              @click="emit('open-nota', nota.id)"
              title="Open in new tab"
            >
              <ExternalLink class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              :size="actionButtonSize"
              :class="(mode === 'list' ? actionButtonClass : '') + ' text-destructive hover:text-destructive'"
              @click="emit('delete-nota', nota.id)"
              title="Delete"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <!-- Empty state slot -->
      <slot name="empty-state" />
    </TableBody>
  </Table>
</template>
