<script setup lang="ts">
import { computed } from 'vue'
import { GripVertical, MoreVertical, Plus, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import TableCell from './TableCell.vue'
import type { TableData } from '@/components/editor/extensions/TableExtension'

const props = defineProps<{
  row: any
  columns: any[]
  isDragging: boolean
  isSelected: boolean
  editingCell: { rowId: string; columnId: string } | null
  cellAlignment: Record<string, 'left' | 'center' | 'right'>
  tableData: TableData
}>()

const emit = defineEmits<{
  (e: 'startDragging', event: MouseEvent): void
  (e: 'addRow', position: 'before' | 'after'): void
  (e: 'deleteRow'): void
  (e: 'updateCell', columnId: string, value: any): void
  (e: 'startEditing', columnId: string): void
  (e: 'stopEditing'): void
}>()

const rowClasses = computed(() => {
  const classes = ['group']
  if (props.isDragging) {
    classes.push('dragging-row')
  }
  if (props.isSelected) {
    classes.push('bg-primary/10')
  }
  return classes.join(' ')
})
</script>

<template>
  <tr :class="rowClasses" :data-row-id="row.id">
    <td class="w-[30px] p-0">
      <div 
        class="h-full flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100"
        @mousedown="(e) => emit('startDragging', e)"
      >
        <GripVertical class="h-4 w-4 text-muted-foreground" />
      </div>
    </td>
    <td 
      v-for="column in columns" 
      :key="column.id"
      class="p-0"
    >
      <TableCell
        :row-id="row.id"
        :column-id="column.id"
        :value="row.cells[column.id]"
        :type="column.type"
        :is-editing="editingCell?.rowId === row.id && editingCell?.columnId === column.id"
        :alignment="cellAlignment[`${row.id}-${column.id}`] || 'left'"
        :table-data="tableData"
        @update="(value) => emit('updateCell', column.id, value)"
        @start-editing="() => emit('startEditing', column.id)"
        @stop-editing="emit('stopEditing')"
      />
    </td>
    <td>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 opacity-0 group-hover:opacity-100"
          >
            <MoreVertical class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @click="emit('addRow', 'before')">
            <Plus class="h-4 w-4 mr-2" /> Insert Row Before
          </DropdownMenuItem>
          <DropdownMenuItem @click="emit('addRow', 'after')">
            <Plus class="h-4 w-4 mr-2" /> Insert Row After
          </DropdownMenuItem>
          <DropdownMenuItem 
            @click="emit('deleteRow')"
            class="text-red-600"
          >
            <Trash2 class="h-4 w-4 mr-2" /> Delete Row
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </td>
  </tr>
</template>

<style scoped>
.dragging-row {
  @apply opacity-50 bg-muted/50;
}
</style>
