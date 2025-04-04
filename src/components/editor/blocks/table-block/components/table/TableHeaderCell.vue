<script setup lang="ts">
import { computed } from 'vue'
import { MoreVertical, Plus, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { COLUMN_TYPES, getColumnTypeIcon } from '../../constants/columnTypes'
import type { ColumnType } from '../../composables/useTableOperations'

const props = defineProps<{
  column: any
  isActiveTypeDropdown: boolean
  sortState: {
    columnId: string | null
    direction: 'asc' | 'desc' | null
  }
  width: string
}>()

const emit = defineEmits<{
  (e: 'toggleTypeDropdown'): void
  (e: 'updateColumnType', type: ColumnType): void
  (e: 'addColumn', position: 'before' | 'after'): void
  (e: 'deleteColumn'): void
  (e: 'toggleSort'): void
  (e: 'startResizing', event: MouseEvent): void
}>()

const dropdownPosition = computed(() => {
  const th = document.querySelector(`th[data-column-id="${props.column.id}"]`)
  if (!th) return { top: 0, left: 0 }
  
  const rect = th.getBoundingClientRect()
  return {
    top: rect.bottom + window.scrollY,
    left: rect.left + window.scrollX
  }
})
</script>

<template>
  <th
    :data-column-id="column.id"
    class="relative group min-w-[150px]"
    :style="{ width }"
  >
    <div class="flex items-center gap-2 py-2">
      <div class="flex items-center gap-1.5 flex-1">
        <Button
          variant="ghost"
          size="sm"
          class="h-6 w-6 p-1 hover:bg-primary/10"
          @click="emit('toggleTypeDropdown')"
        >
          <component
            :is="getColumnTypeIcon(column.type)"
            class="h-4 w-4"
          />
        </Button>
        <span class="font-medium">{{ column.title }}</span>
        <Button
          variant="ghost"
          size="sm"
          class="h-6 w-6 p-1 opacity-0 group-hover:opacity-100 hover:bg-primary/10"
          @click="emit('toggleSort')"
        >
          <component
            :is="sortState.columnId === column.id
              ? sortState.direction === 'asc'
                ? 'ChevronUp'
                : 'ChevronDown'
              : 'ChevronsUpDown'"
            class="h-4 w-4"
          />
        </Button>
      </div>

      <!-- Column Type Dropdown -->
      <Teleport to="body">
        <div
          v-if="isActiveTypeDropdown"
          class="fixed z-50 w-32 rounded-md border bg-popover shadow-md"
          :style="{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }"
        >
          <div class="p-1">
            <Button
              v-for="type in COLUMN_TYPES"
              :key="type.value"
              variant="ghost"
              size="sm"
              class="w-full justify-start text-xs flex items-center gap-2 hover:bg-primary/10"
              @click="emit('updateColumnType', type.value)"
            >
              <component :is="type.icon" class="h-3 w-3" />
              {{ type.label }}
            </Button>
          </div>
        </div>
      </Teleport>

      <!-- Column Actions -->
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-primary/10">
              <MoreVertical class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem @click="emit('addColumn', 'before')">
              <Plus class="h-4 w-4 mr-2" /> Insert Column Before
            </DropdownMenuItem>
            <DropdownMenuItem @click="emit('addColumn', 'after')">
              <Plus class="h-4 w-4 mr-2" /> Insert Column After
            </DropdownMenuItem>
            <DropdownMenuItem 
              @click="emit('deleteColumn')"
              class="text-red-600"
            >
              <Trash2 class="h-4 w-4 mr-2" /> Delete Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Resize Handle -->
    <div
      class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
      @mousedown="(e) => emit('startResizing', e)"
    ></div>
  </th>
</template>

<style scoped>
.cursor-col-resize {
  cursor: col-resize;
}
</style> 