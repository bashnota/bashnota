<script setup lang="ts">
import { computed } from 'vue'
import type { TableData } from '@/components/editor/blocks/table-block/TableExtension'

const props = defineProps<{
  tableData: TableData
  sortState: {
    columnId: string | null
    direction: 'asc' | 'desc' | null
  }
}>()

const sortedRows = computed(() => {
  if (!props.sortState.columnId || !props.sortState.direction) {
    return props.tableData.rows
  }

  const { columnId, direction } = props.sortState
  return [...props.tableData.rows].sort((a, b) => {
    const aValue = a.cells[columnId]
    const bValue = b.cells[columnId]
    
    if (direction === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })
})

const emit = defineEmits<{
  (e: 'update:sortState', value: { columnId: string | null; direction: 'asc' | 'desc' | null }): void
}>()

const toggleSort = (columnId: string) => {
  if (props.sortState.columnId === columnId) {
    if (props.sortState.direction === 'asc') {
      emit('update:sortState', { columnId, direction: 'desc' })
    } else if (props.sortState.direction === 'desc') {
      emit('update:sortState', { columnId: null, direction: null })
    } else {
      emit('update:sortState', { columnId, direction: 'asc' })
    }
  } else {
    emit('update:sortState', { columnId, direction: 'asc' })
  }
}

defineExpose({
  sortedRows,
  toggleSort
})
</script>

<template>
  <slot :sorted-rows="sortedRows" :toggle-sort="toggleSort" />
</template> 