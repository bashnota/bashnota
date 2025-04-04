<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TableData } from '@/components/editor/extensions/TableExtension'

const props = defineProps<{
  tableData: TableData
}>()

const selectedCells = ref<{ rowId: string; columnId: string }[]>([])
const isSelecting = ref(false)
const selectionStart = ref<{ rowId: string; columnId: string } | null>(null)

const emit = defineEmits<{
  (e: 'update:selectedCells', cells: { rowId: string; columnId: string }[]): void
}>()

const startSelection = (event: MouseEvent, rowId: string, columnId: string) => {
  if (event.button !== 0) return // Only left mouse button
  
  isSelecting.value = true
  selectionStart.value = { rowId, columnId }
  selectedCells.value = [{ rowId, columnId }]
  emit('update:selectedCells', selectedCells.value)
}

const updateSelection = (event: MouseEvent, rowId: string, columnId: string) => {
  if (!isSelecting.value || !selectionStart.value) return
  
  const startRowIndex = props.tableData.rows.findIndex(row => row.id === selectionStart.value!.rowId)
  const startColIndex = props.tableData.columns.findIndex(col => col.id === selectionStart.value!.columnId)
  const endRowIndex = props.tableData.rows.findIndex(row => row.id === rowId)
  const endColIndex = props.tableData.columns.findIndex(col => col.id === columnId)
  
  const minRowIndex = Math.min(startRowIndex, endRowIndex)
  const maxRowIndex = Math.max(startRowIndex, endRowIndex)
  const minColIndex = Math.min(startColIndex, endColIndex)
  const maxColIndex = Math.max(startColIndex, endColIndex)
  
  selectedCells.value = []
  
  for (let i = minRowIndex; i <= maxRowIndex; i++) {
    for (let j = minColIndex; j <= maxColIndex; j++) {
      selectedCells.value.push({
        rowId: props.tableData.rows[i].id,
        columnId: props.tableData.columns[j].id
      })
    }
  }
  
  emit('update:selectedCells', selectedCells.value)
}

const updateSelectionFromKeyboard = (rowId: string, columnId: string) => {
  if (!isSelecting.value || !selectionStart.value) return
  
  const startRowIndex = props.tableData.rows.findIndex(row => row.id === selectionStart.value!.rowId)
  const startColIndex = props.tableData.columns.findIndex(col => col.id === selectionStart.value!.columnId)
  const endRowIndex = props.tableData.rows.findIndex(row => row.id === rowId)
  const endColIndex = props.tableData.columns.findIndex(col => col.id === columnId)
  
  const minRowIndex = Math.min(startRowIndex, endRowIndex)
  const maxRowIndex = Math.max(startRowIndex, endRowIndex)
  const minColIndex = Math.min(startColIndex, endColIndex)
  const maxColIndex = Math.max(startColIndex, endColIndex)
  
  selectedCells.value = []
  
  for (let i = minRowIndex; i <= maxRowIndex; i++) {
    for (let j = minColIndex; j <= maxColIndex; j++) {
      selectedCells.value.push({
        rowId: props.tableData.rows[i].id,
        columnId: props.tableData.columns[j].id
      })
    }
  }
  
  emit('update:selectedCells', selectedCells.value)
}

const endSelection = () => {
  isSelecting.value = false
  selectionStart.value = null
}

const isCellSelected = (rowId: string, columnId: string) => {
  return selectedCells.value.some(
    cell => cell.rowId === rowId && cell.columnId === columnId
  )
}

defineExpose({
  startSelection,
  updateSelection,
  updateSelectionFromKeyboard,
  endSelection,
  isCellSelected
})
</script>

<template>
  <slot
    :selected-cells="selectedCells"
    :is-selecting="isSelecting"
    :start-selection="startSelection"
    :update-selection="updateSelection"
    :end-selection="endSelection"
    :is-cell-selected="isCellSelected"
  />
</template> 