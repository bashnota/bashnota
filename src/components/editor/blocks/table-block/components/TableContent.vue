<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
} from '@/components/ui/dropdown-menu'
import type { TableData } from '@/components/editor/extensions/TableExtension'
import type { ColumnType } from '../composables/useTableOperations'

// Import new components
import TableCellComponent from './table/TableCell.vue'
import TableRowComponent from './table/TableRow.vue'
import TableHeaderCell from './table/TableHeaderCell.vue'
import TableContextMenu from './table/TableContextMenu.vue'
import TableSort from './table/TableSort.vue'
import TableResize from './table/TableResize.vue'
import TableSelection from './table/TableSelection.vue'
import TableClipboard from './table/TableClipboard.vue'

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
  (e: 'addRow', position: 'before' | 'after', rowId: string): void
  (e: 'addColumn', position: 'before' | 'after', columnId: string): void
  (e: 'reorderRows', fromRowId: string, toRowId: string): void
}>()

// State for editing and focus
const editingCell = ref<{ rowId: string; columnId: string } | null>(null)
const focusedCell = ref<{ rowId: string; columnId: string } | null>(null)
const selectedCells = ref<{ rowId: string; columnId: string }[]>([])
const isSelecting = ref(false)
const selectionStart = ref<{ rowId: string; columnId: string } | null>(null)
const resizingColumn = ref<{ columnId: string; startX: number; startWidth: number } | null>(null)
const clipboard = ref<{ value: any; rowId: string; columnId: string; isMultiCell?: boolean } | null>(null)
const cellAlignment = ref<Record<string, 'left' | 'center' | 'right'>>({})
const columnWidths = ref<Record<string, number>>({})
const isDraggingRow = ref(false)
const draggedRow = ref<{ rowId: string; index: number } | null>(null)

// Add new state for sorting
const sortState = ref<{
  columnId: string | null;
  direction: 'asc' | 'desc' | null;
}>({
  columnId: null,
  direction: null
})

// Handle cell editing
const startEditing = (rowId: string, columnId: string) => {
  // First set the editing state
  editingCell.value = { rowId, columnId }
  focusedCell.value = { rowId, columnId }
  
  // Use nextTick to ensure DOM is updated
  nextTick(() => {
    const input = document.querySelector(`input[data-cell-id="${rowId}-${columnId}"]`) as HTMLInputElement
    if (input) {
      // Get the current value from the table data
      const row = props.tableData.rows.find(r => r.id === rowId)
      const cellValue = row?.cells[columnId] ?? ''
      
      // Set the input value first
      input.value = String(cellValue)
      
      // Focus the input
      input.focus()
      
      // Use a small delay to ensure the input is ready
      setTimeout(() => {
        try {
          // Only set selection if the input has a value
          if (input.value.length > 0) {
            input.setSelectionRange(input.value.length, input.value.length)
          }
        } catch (error) {
          console.error('Error setting cursor position:', error)
        }
      }, 10)
    }
  })
}

const stopEditing = () => {
  editingCell.value = null
}

const handleCellUpdate = (rowId: string, columnId: string, value: any) => {
  emit('updateCell', rowId, columnId, value)
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
  
  focusedCell.value = { rowId, columnId }
}

// Multi-cell operations
const copySelectedCells = () => {
  if (selectedCells.value.length === 0) return
  
  // If only one cell is selected, use the existing copy function
  if (selectedCells.value.length === 1) {
    const { rowId, columnId } = selectedCells.value[0]
    const cellValue = props.tableData.rows.find(row => row.id === rowId)?.cells[columnId]
    
    if (cellValue !== undefined) {
      clipboard.value = { value: cellValue, rowId, columnId }
    }
    return
  }
  
  // For multiple cells, create a CSV-like string
  const rows = new Set(selectedCells.value.map(cell => cell.rowId))
  const cols = new Set(selectedCells.value.map(cell => cell.columnId))
  
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
    rowId: selectedCells.value[0].rowId, 
    columnId: selectedCells.value[0].columnId,
    isMultiCell: true
  }
}

const pasteSelectedCells = () => {
  if (selectedCells.value.length === 0 || !clipboard.value) return
  
  // If only one cell is selected and clipboard is not multi-cell, use existing paste
  if (selectedCells.value.length === 1 && !clipboard.value.isMultiCell) {
    const { rowId, columnId } = selectedCells.value[0]
    emit('updateCell', rowId, columnId, clipboard.value.value)
    return
  }
  
  // For multi-cell paste, parse the CSV data
  if (clipboard.value.isMultiCell) {
    const csvData = clipboard.value.value
    const rows = csvData.trim().split('\n')
    
    // Get the starting position
    const startRowIndex = props.tableData.rows.findIndex(row => row.id === selectedCells.value[0].rowId)
    const startColIndex = props.tableData.columns.findIndex(col => col.id === selectedCells.value[0].columnId)
    
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

// Row dragging
const startDraggingRow = (event: MouseEvent, rowId: string) => {
  if (event.button !== 0) return // Only left mouse button
  
  isDraggingRow.value = true
  draggedRow.value = { 
    rowId, 
    index: props.tableData.rows.findIndex(row => row.id === rowId) 
  }
  
  // Add event listeners
  document.addEventListener('mousemove', handleDraggingRow)
  document.addEventListener('mouseup', stopDraggingRow)
}

const handleDraggingRow = (e: MouseEvent) => {
  if (!isDraggingRow.value || !draggedRow.value) return
  
  // Find the row element under the cursor
  const elements = document.elementsFromPoint(e.clientX, e.clientY)
  const rowElement = elements.find(el => 
    el.tagName === 'TR' && 
    el.closest('.table-block-table-element') &&
    !el.classList.contains('dragging-row')
  )
  
  if (rowElement) {
    const rowId = rowElement.getAttribute('data-row-id')
    if (rowId && rowId !== draggedRow.value.rowId) {
      // Highlight the drop target
      rowElement.classList.add('drop-target')
    }
  }
}

const stopDraggingRow = (e: MouseEvent) => {
  if (!isDraggingRow.value || !draggedRow.value) return
  
  // Find the row element under the cursor
  const elements = document.elementsFromPoint(e.clientX, e.clientY)
  const rowElement = elements.find(el => 
    el.tagName === 'TR' && 
    el.closest('.table-block-table-element') &&
    !el.classList.contains('dragging-row')
  )
  
  if (rowElement) {
    const rowId = rowElement.getAttribute('data-row-id')
    if (rowId && rowId !== draggedRow.value.rowId) {
      // Emit event to reorder rows
      emit('reorderRows', draggedRow.value.rowId, rowId)
    }
  }
  
  // Clean up
  document.querySelectorAll('.drop-target').forEach(el => {
    el.classList.remove('drop-target')
  })
  
  isDraggingRow.value = false
  draggedRow.value = null
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleDraggingRow)
  document.removeEventListener('mouseup', stopDraggingRow)
}

// Keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
  if (!focusedCell.value) return

  const { rowId, columnId } = focusedCell.value
  const currentRowIndex = props.tableData.rows.findIndex(row => row.id === rowId)
  const currentColIndex = props.tableData.columns.findIndex(col => col.id === columnId)

  // Handle selection with Shift key
  if (event.shiftKey && !isSelecting.value) {
    isSelecting.value = true
    selectionStart.value = { rowId, columnId }
    selectedCells.value = [{ rowId, columnId }]
  }

  switch (event.key) {
    case 'ArrowUp':
      if (currentRowIndex > 0) {
        const prevRow = props.tableData.rows[currentRowIndex - 1]
        focusedCell.value = { rowId: prevRow.id, columnId }
        
        if (isSelecting.value && selectionStart.value) {
          updateSelectionFromKeyboard(prevRow.id, columnId)
        }
      }
      break
    case 'ArrowDown':
      if (currentRowIndex < props.tableData.rows.length - 1) {
        const nextRow = props.tableData.rows[currentRowIndex + 1]
        focusedCell.value = { rowId: nextRow.id, columnId }
        
        if (isSelecting.value && selectionStart.value) {
          updateSelectionFromKeyboard(nextRow.id, columnId)
        }
      }
      break
    case 'ArrowLeft':
      if (currentColIndex > 0) {
        const prevCol = props.tableData.columns[currentColIndex - 1]
        focusedCell.value = { rowId, columnId: prevCol.id }
        
        if (isSelecting.value && selectionStart.value) {
          updateSelectionFromKeyboard(rowId, prevCol.id)
        }
      }
      break
    case 'ArrowRight':
      if (currentColIndex < props.tableData.columns.length - 1) {
        const nextCol = props.tableData.columns[currentColIndex + 1]
        focusedCell.value = { rowId, columnId: nextCol.id }
        
        if (isSelecting.value && selectionStart.value) {
          updateSelectionFromKeyboard(rowId, nextCol.id)
        }
      }
      break
    case 'Tab':
      event.preventDefault()
      if (event.shiftKey) {
        // Shift+Tab: Move to previous cell
        if (currentColIndex > 0) {
          const prevCol = props.tableData.columns[currentColIndex - 1]
          focusedCell.value = { rowId, columnId: prevCol.id }
        } else if (currentRowIndex > 0) {
          // Move to last cell of previous row
          const prevRow = props.tableData.rows[currentRowIndex - 1]
          const lastCol = props.tableData.columns[props.tableData.columns.length - 1]
          focusedCell.value = { rowId: prevRow.id, columnId: lastCol.id }
        }
      } else {
        // Tab: Move to next cell
        if (currentColIndex < props.tableData.columns.length - 1) {
          const nextCol = props.tableData.columns[currentColIndex + 1]
          focusedCell.value = { rowId, columnId: nextCol.id }
        } else if (currentRowIndex < props.tableData.rows.length - 1) {
          // Move to first cell of next row
          const nextRow = props.tableData.rows[currentRowIndex + 1]
          const firstCol = props.tableData.columns[0]
          focusedCell.value = { rowId: nextRow.id, columnId: firstCol.id }
        }
      }
      break
    case 'Enter':
      if (!editingCell.value) {
        startEditing(rowId, columnId)
      } else {
        stopEditing()
      }
      event.preventDefault()
      break
    case 'Escape':
      stopEditing()
      break
    case 'c':
      if (event.ctrlKey || event.metaKey) {
        copySelectedCells()
      }
      break
    case 'v':
      if (event.ctrlKey || event.metaKey) {
        pasteSelectedCells()
      }
      break
  }
  
  // End selection when Shift key is released
  if (!event.shiftKey && isSelecting.value) {
    isSelecting.value = false
    selectionStart.value = null
  }
}

const handleResizing = (event: MouseEvent) => {
  if (!resizingColumn.value) return

  const { startX, startWidth, columnId } = resizingColumn.value
  const diff = event.clientX - startX
  const newWidth = Math.max(100, startWidth + diff) // Minimum width of 100px

  // Update the column width in our state
  columnWidths.value[columnId] = newWidth

  // Update the DOM element width
  const th = document.querySelector(`th[data-column-id="${columnId}"]`) as HTMLElement
  if (th) {
    th.style.width = `${newWidth}px`
  }
}

const stopResizing = () => {
  if (!resizingColumn.value) return
  
  // Remove the class from the body
  document.body.classList.remove('resizing-column')
  
  resizingColumn.value = null
  document.removeEventListener('mousemove', handleResizing)
  document.removeEventListener('mouseup', stopResizing)
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// Add this function after getCellAlignmentClass
const setCellAlignment = (alignment: 'left' | 'center' | 'right') => {
  if (!focusedCell.value) return
  
  const { rowId, columnId } = focusedCell.value
  const cellKey = `${rowId}-${columnId}`
  cellAlignment.value[cellKey] = alignment
}

// Computed property for column width
const getColumnWidth = (columnId: string) => {
  return columnWidths.value[columnId] ? `${columnWidths.value[columnId]}px` : 'auto'
}

const handleColumnWidthUpdate = (columnId: string, width: number) => {
  columnWidths.value[columnId] = width
}
</script>

<template>
  <ScrollArea class="max-h-[400px] overflow-auto">
    <Table class="table-block-table-element">
      <TableHeader class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <TableRow class="hover:bg-transparent">
          <TableHead class="w-[30px] border-r-0"></TableHead>
          <TableHeaderCell
            v-for="column in tableData.columns"
            :key="column.id"
            :column="column"
            :is-active-type-dropdown="activeTypeDropdown === column.id"
            :sort-state="sortState"
            :width="getColumnWidth(column.id)"
            @toggle-type-dropdown="emit('toggleTypeDropdown', column.id)"
            @update-column-type="(type) => emit('updateColumnType', column.id, type)"
            @add-column="(position) => emit('addColumn', position, column.id)"
            @delete-column="emit('deleteColumn', column.id)"
            @toggle-sort="() => sortState.columnId === column.id ? sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc' : sortState = { columnId: column.id, direction: 'asc' }"
            @start-resizing="(e) => handleColumnWidthUpdate(column.id, (e.target as HTMLElement)?.offsetWidth || 0)"
          />
          <TableHead class="w-[100px] border-l-0"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableSort
          :table-data="tableData"
          :sort-state="sortState"
          v-slot="{ sortedRows }"
        >
          <TableSelection
            :table-data="tableData"
            v-slot="{ selectedCells: selected, isCellSelected }"
          >
            <TableClipboard
              :table-data="tableData"
              :selected-cells="selected"
              v-slot="{ copySelectedCells, pasteSelectedCells, hasClipboard: clipboardState }"
            >
              <TableRowComponent
                v-for="row in sortedRows"
                :key="row.id"
                :row="row"
                :columns="tableData.columns"
                :is-dragging="isDraggingRow && draggedRow?.rowId === row.id"
                :is-selected="isCellSelected(row.id, tableData.columns[0].id)"
                :editing-cell="editingCell"
                :cell-alignment="cellAlignment"
                :table-data="tableData"
                @start-dragging="(e) => startDraggingRow(e, row.id)"
                @add-row="(position) => emit('addRow', position, row.id)"
                @delete-row="emit('deleteRow', row.id)"
                @update-cell="(columnId, value) => handleCellUpdate(row.id, columnId, value)"
                @start-editing="(columnId) => startEditing(row.id, columnId)"
                @stop-editing="stopEditing"
              />

              <!-- Cell Context Menu -->
              <DropdownMenu v-if="focusedCell">
                <TableContextMenu
                  :has-clipboard="Boolean(clipboardState)"
                  @copy="copySelectedCells"
                  @paste="pasteSelectedCells"
                  @set-alignment="setCellAlignment"
                />
              </DropdownMenu>
            </TableClipboard>
          </TableSelection>
        </TableSort>
      </TableBody>
    </Table>
  </ScrollArea>
</template>

<style scoped>
.table-block-table-element {
  @apply w-full border-collapse;
}

.table-block-table-element th,
.table-block-table-element td {
  @apply border border-border p-2;
}

.table-block-table-element th {
  @apply bg-muted/50 transition-colors duration-200;
}

.table-block-table-element tr:hover {
  @apply bg-muted/30;
}

.cursor-col-resize {
  cursor: col-resize;
}

/* Add styles for the resize handle */
.resizing-column {
  cursor: col-resize;
  user-select: none;
}

/* Styles for row dragging */
.dragging-row {
  @apply opacity-50 bg-muted/50;
}

.drop-target {
  @apply border-t-2 border-primary;
}

/* Add transition for hover states */
.table-block-table-element th button {
  @apply transition-all duration-200;
}

/* Add backdrop blur effect */
.table-block-table-element thead {
  @apply backdrop-blur-sm;
}

/* Add styles for input focus */
.table-block-table-element input:focus {
  @apply outline-none ring-2 ring-primary ring-offset-2;
}

/* Improve cell padding */
.table-block-table-element td {
  @apply p-0;
}

/* Improve input styling */
.table-block-table-element input {
  @apply bg-transparent border-none focus:ring-0 focus:ring-offset-0;
}

.table-block-table-element input:focus {
  @apply outline-none ring-2 ring-primary ring-offset-2;
}

/* Add styles for editing state */
.table-block-table-element td.editing {
  @apply p-0;
}

.table-block-table-element td.editing input {
  @apply h-8 w-full px-2;
}

/* Add styles for input container */
.table-block-table-element td .relative {
  @apply h-8;
}
</style> 