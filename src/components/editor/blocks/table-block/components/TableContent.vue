<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { COLUMN_TYPES, getColumnTypeIcon } from '../constants/columnTypes'
import type { TableData } from '@/components/editor/extensions/TableExtension'
import type { ColumnType } from '../composables/useTableOperations'

const props = defineProps<{
  tableData: TableData
  activeTypeDropdown: string | null
}>()

const emit = defineEmits<{
  (e: 'toggleTypeDropdown', columnId: string | null): void
  (e: 'updateColumnType', columnId: string, type: ColumnType): void
  (e: 'deleteColumn', columnId: string): void
  (e: 'deleteRow', rowId: string): void
  (e: 'updateCell', rowId: string, columnId: string, value: any): void
}>()

const handleCellUpdate = (rowId: string, columnId: string, event: Event) => {
  const target = event.target as HTMLInputElement
  emit('updateCell', rowId, columnId, target.value)
}

const handleColumnTypeUpdate = (columnId: string, type: ColumnType) => {
  emit('updateColumnType', columnId, type)
  emit('toggleTypeDropdown', null) // Close dropdown after selection
}

const formatDateForInput = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const formatDateForDisplay = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('default', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}
</script>

<template>
  <ScrollArea class="max-h-[400px] overflow-auto">
    <Table class="table-block-table-element">
      <TableHeader>
        <TableRow>
          <TableHead
            v-for="column in tableData.columns"
            :key="column.id"
            class="relative group"
          >
            <div class="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                class="h-6 w-6 p-1"
                @click="emit('toggleTypeDropdown', column.id)"
              >
                <component
                  :is="getColumnTypeIcon(column.type)"
                  class="h-4 w-4"
                />
              </Button>
              {{ column.title }}

              <!-- Dropdown Menu -->
              <div
                v-if="activeTypeDropdown === column.id"
                class="absolute top-full left-0 mt-1 w-32 rounded-md border bg-popover shadow-md z-50"
              >
                <div class="p-1">
                  <Button
                    v-for="type in COLUMN_TYPES"
                    :key="type.value"
                    variant="ghost"
                    size="sm"
                    class="w-full justify-start text-xs flex items-center gap-2"
                    @click="handleColumnTypeUpdate(column.id, type.value)"
                  >
                    <component :is="type.icon" class="h-3 w-3" />
                    {{ type.label }}
                  </Button>
                </div>
              </div>
            </div>
            <Button
              v-if="tableData.columns.length > 1"
              variant="ghost"
              size="icon"
              class="h-6 w-6 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
              @click="emit('deleteColumn', column.id)"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </TableHead>
          <TableHead class="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in tableData.rows" :key="row.id" class="group">
          <TableCell v-for="column in tableData.columns" :key="column.id">
            <!-- Different input types based on column type -->
            <template v-if="column.type === 'number'">
              <Input
                type="number"
                :value="row.cells[column.id]"
                @input="(e: Event) => handleCellUpdate(row.id, column.id, e)"
                class="h-8"
              />
            </template>
            <template v-else-if="column.type === 'date'">
              <div class="flex flex-col gap-1">
                <Input
                  type="datetime-local"
                  :value="formatDateForInput(row.cells[column.id])"
                  @input="(e: Event) => handleCellUpdate(row.id, column.id, e)"
                  class="h-8"
                />
                <span class="text-xs text-muted-foreground">
                  {{ formatDateForDisplay(row.cells[column.id]) }}
                </span>
              </div>
            </template>
            <template v-else>
              <Input
                :value="row.cells[column.id]"
                @input="(e: Event) => handleCellUpdate(row.id, column.id, e)"
                class="h-8"
              />
            </template>
          </TableCell>
          <TableCell>
            <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6 opacity-0 group-hover:opacity-100"
              @click="emit('deleteRow', row.id)"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </ScrollArea>
</template> 