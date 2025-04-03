<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Trash2, Plus, MoreVertical, Copy, Clipboard, AlignLeft, AlignCenter, AlignRight, GripVertical } from 'lucide-vue-next'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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

// Handle cell editing
const startEditing = (rowId: string, columnId: string) => {
  editingCell.value = { rowId, columnId }
  focusedCell.value = { rowId, columnId }
}

const stopEditing = () => {
  editingCell.value = null
}

const handleCellUpdate = (rowId: string, columnId: string, event: Event) => {
  const target = event.target as HTMLInputElement
  emit('updateCell', rowId, columnId, target.value)
}

// Cell context menu
const showCellContextMenu = (event: MouseEvent, rowId: string, columnId: string) => {
  event.preventDefault()
  focusedCell.value = { rowId, columnId }
}

// Cell selection
const startSelection = (event: MouseEvent, rowId: string, columnId: string) => {
  if (event.button !== 0) return // Only left mouse button
  
  isSelecting.value = true
  selectionStart.value = { rowId, columnId }
  selectedCells.value = [{ rowId, columnId }]
  focusedCell.value = { rowId, columnId }
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
  
  focusedCell.value = { rowId, columnId }
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

const endSelection = () => {
  isSelecting.value = false
  selectionStart.value = null
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

// Column resizing
const startResizing = (event: MouseEvent, columnId: string) => {
  event.preventDefault()
  event.stopPropagation()
  
  const th = (event.target as HTMLElement).closest('th')
  if (!th) return

  // Get current width from columnWidths or use the element's width
  const currentWidth = columnWidths.value[columnId] || th.offsetWidth

  resizingColumn.value = {
    columnId,
    startX: event.clientX,
    startWidth: currentWidth
  }

  // Add a class to the body to change cursor during resize
  document.body.classList.add('resizing-column')
  
  // Add event listeners to document for better handling
  document.addEventListener('mousemove', handleResizing)
  document.addEventListener('mouseup', stopResizing)
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

// Computed property for cell classes
const getCellClasses = (rowId: string, columnId: string) => {
  const classes = []
  
  // Check if cell is selected
  const isSelected = selectedCells.value.some(
    cell => cell.rowId === rowId && cell.columnId === columnId
  )
  
  if (isSelected) {
    classes.push('bg-primary/10')
  } else if (focusedCell.value?.rowId === rowId && focusedCell.value?.columnId === columnId) {
    classes.push('bg-primary/5')
  }
  
  if (editingCell.value?.rowId === rowId && editingCell.value?.columnId === columnId) {
    classes.push('ring-2 ring-primary')
  }
  
  return classes.join(' ')
}

// Computed property for cell alignment
const getCellAlignment = (rowId: string, columnId: string) => {
  const cellKey = `${rowId}-${columnId}`
  return cellAlignment.value[cellKey] || 'left'
}

// Computed property for cell alignment
const getCellAlignmentClass = (rowId: string, columnId: string) => {
  const alignment = getCellAlignment(rowId, columnId)
  switch (alignment) {
    case 'left': return 'text-left'
    case 'center': return 'text-center'
    case 'right': return 'text-right'
    default: return 'text-left'
  }
}

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

// Add this computed function after getColumnWidth
const getRowClasses = (rowId: string) => {
  const classes = ['group']
  if (isDraggingRow.value && draggedRow.value?.rowId === rowId) {
    classes.push('dragging-row')
  }
  return classes.join(' ')
}
</script>

<template>
  <ScrollArea class="max-h-[400px] overflow-auto">
    <Table class="table-block-table-element">
      <TableHeader>
        <TableRow>
          <TableHead class="w-[30px]"></TableHead>
          <TableHead
            v-for="column in tableData.columns"
            :key="column.id"
            :data-column-id="column.id"
            class="relative group"
            :style="{ width: getColumnWidth(column.id) }"
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

              <!-- Column Type Dropdown -->
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

            <!-- Column Actions -->
            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" class="h-6 w-6">
                    <MoreVertical class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem @click="emit('addColumn', 'before', column.id)">
                    <Plus class="h-4 w-4 mr-2" /> Insert Column Before
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="emit('addColumn', 'after', column.id)">
                    <Plus class="h-4 w-4 mr-2" /> Insert Column After
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    v-if="tableData.columns.length > 1"
                    @click="emit('deleteColumn', column.id)"
                    class="text-red-600"
                  >
                    <Trash2 class="h-4 w-4 mr-2" /> Delete Column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <!-- Resize Handle -->
            <div
              class="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
              :class="{ 'bg-primary/50': resizingColumn?.columnId === column.id }"
              @mousedown="(e) => startResizing(e, column.id)"
            ></div>
          </TableHead>
          <TableHead class="w-[100px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow 
          v-for="row in tableData.rows" 
          :key="row.id" 
          :class="getRowClasses(row.id)"
          :data-row-id="row.id"
        >
          <TableCell class="w-[30px] p-0">
            <div 
              class="h-full flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100"
              @mousedown="(e) => startDraggingRow(e, row.id)"
            >
              <GripVertical class="h-4 w-4 text-muted-foreground" />
            </div>
          </TableCell>
          <TableCell 
            v-for="column in tableData.columns" 
            :key="column.id"
            :class="getCellClasses(row.id, column.id)"
            @mousedown="(e) => startSelection(e, row.id, column.id)"
            @mousemove="(e) => updateSelection(e, row.id, column.id)"
            @mouseup="endSelection"
            @dblclick="startEditing(row.id, column.id)"
            @click="focusedCell = { rowId: row.id, columnId: column.id }"
            @contextmenu="(e) => showCellContextMenu(e, row.id, column.id)"
          >
            <!-- Different input types based on column type -->
            <template v-if="editingCell?.rowId === row.id && editingCell?.columnId === column.id">
              <Input
                :type="column.type === 'number' ? 'number' : column.type === 'date' ? 'datetime-local' : 'text'"
                :value="column.type === 'date' ? formatDateForInput(row.cells[column.id]) : row.cells[column.id]"
                @input="(e: Event) => handleCellUpdate(row.id, column.id, e)"
                @blur="stopEditing"
                class="h-8"
                autofocus
              />
            </template>
            <template v-else>
              <div 
                class="min-h-[2rem] flex items-center"
                :class="getCellAlignmentClass(row.id, column.id)"
              >
                <template v-if="column.type === 'date'">
                  {{ formatDateForDisplay(row.cells[column.id]) }}
                </template>
                <template v-else>
                  {{ row.cells[column.id] }}
                </template>
              </div>
            </template>
          </TableCell>
          <TableCell>
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
                <DropdownMenuItem @click="emit('addRow', 'before', row.id)">
                  <Plus class="h-4 w-4 mr-2" /> Insert Row Before
                </DropdownMenuItem>
                <DropdownMenuItem @click="emit('addRow', 'after', row.id)">
                  <Plus class="h-4 w-4 mr-2" /> Insert Row After
                </DropdownMenuItem>
                <DropdownMenuItem 
                  @click="emit('deleteRow', row.id)"
                  class="text-red-600"
                >
                  <Trash2 class="h-4 w-4 mr-2" /> Delete Row
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </ScrollArea>

  <!-- Cell Context Menu -->
  <DropdownMenu v-if="focusedCell">
    <DropdownMenuContent>
      <DropdownMenuItem @click="copySelectedCells">
        <Copy class="h-4 w-4 mr-2" /> Copy
      </DropdownMenuItem>
      <DropdownMenuItem @click="pasteSelectedCells" :disabled="!clipboard">
        <Clipboard class="h-4 w-4 mr-2" /> Paste
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem @click="setCellAlignment('left')">
        <AlignLeft class="h-4 w-4 mr-2" /> Align Left
      </DropdownMenuItem>
      <DropdownMenuItem @click="setCellAlignment('center')">
        <AlignCenter class="h-4 w-4 mr-2" /> Align Center
      </DropdownMenuItem>
      <DropdownMenuItem @click="setCellAlignment('right')">
        <AlignRight class="h-4 w-4 mr-2" /> Align Right
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
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
  @apply bg-muted/50;
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
</style> 