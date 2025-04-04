<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TableData } from '@/components/editor/extensions/TableExtension'

const props = defineProps<{
  tableData: TableData
  selectedCells: { rowId: string; columnId: string }[]
}>()

const clipboard = ref<{ value: any; rowId: string; columnId: string; isMultiCell?: boolean } | null>(null)

const emit = defineEmits<{
  (e: 'updateCell', rowId: string, columnId: string, value: any): void
}>()

const copySelectedCells = () => {
  if (props.selectedCells.length === 0) return
  
  // If only one cell is selected, use the existing copy function
  if (props.selectedCells.length === 1) {
    const { rowId, columnId } = props.selectedCells[0]
    const cellValue = props.tableData.rows.find(row => row.id === rowId)?.cells[columnId]
    
    if (cellValue !== undefined) {
      clipboard.value = { value: cellValue, rowId, columnId }
    }
    return
  }
  
  // For multiple cells, create a CSV-like string
  const rows = new Set(props.selectedCells.map(cell => cell.rowId))
  const cols = new Set(props.selectedCells.map(cell => cell.columnId))
  
  const rowArray = Array.from(rows)
  const colArray = Array.from(cols)
  
  let csvData = ''
  
  for (const rowId of rowArray) {
    const row = props.tableData.rows.find(r => r.id === rowId)
    if (!row) continue
    
    const rowData = colArray.map(colId => {
      const cellValue = row.cells[colId]
      // Escape quotes and wrap in quotes if contains comma or newline
      const escapedValue = String(cellValue).replace(/"/g, '""')
      return escapedValue.includes(',') || escapedValue.includes('\n') 
        ? `"${escapedValue}"` 
        : escapedValue
    })
    
    csvData += rowData.join(',') + '\n'
  }
  
  // Store the CSV data in the clipboard
  clipboard.value = { 
    value: csvData, 
    rowId: props.selectedCells[0].rowId, 
    columnId: props.selectedCells[0].columnId,
    isMultiCell: true
  }
}

const pasteSelectedCells = () => {
  if (props.selectedCells.length === 0 || !clipboard.value) return
  
  // If only one cell is selected and clipboard is not multi-cell, use existing paste
  if (props.selectedCells.length === 1 && !clipboard.value.isMultiCell) {
    const { rowId, columnId } = props.selectedCells[0]
    emit('updateCell', rowId, columnId, clipboard.value.value)
    return
  }
  
  // For multi-cell paste, parse the CSV data
  if (clipboard.value.isMultiCell) {
    const csvData = clipboard.value.value
    const rows = csvData.trim().split('\n')
    
    // Get the starting position
    const startRowIndex = props.tableData.rows.findIndex(row => row.id === props.selectedCells[0].rowId)
    const startColIndex = props.tableData.columns.findIndex(col => col.id === props.selectedCells[0].columnId)
    
    // Parse and paste each row
    rows.forEach((row: string, rowOffset: number) => {
      const rowIndex = startRowIndex + rowOffset
      if (rowIndex >= props.tableData.rows.length) return
      
      const rowId = props.tableData.rows[rowIndex].id
      const cells = row.split(',')
      
      cells.forEach((cell: string, colOffset: number) => {
        const colIndex = startColIndex + colOffset
        if (colIndex >= props.tableData.columns.length) return
        
        const columnId = props.tableData.columns[colIndex].id
        
        // Remove quotes if present
        let value = cell
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"')
        }
        
        emit('updateCell', rowId, columnId, value)
      })
    })
  }
}

const hasClipboard = computed(() => clipboard.value !== null)

defineExpose({
  copySelectedCells,
  pasteSelectedCells,
  hasClipboard
})
</script>

<template>
  <slot
    :copy-selected-cells="copySelectedCells"
    :paste-selected-cells="pasteSelectedCells"
    :has-clipboard="hasClipboard"
  />
</template> 