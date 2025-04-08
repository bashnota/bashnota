import { ref, type Ref, watch } from 'vue'
import type { TableData } from '@/components/editor/extensions/TableExtension'

export type ColumnType = 'text' | 'number' | 'select' | 'date'

export interface ColumnTypeOption {
  value: ColumnType
  label: string
  icon: any
}

// Helper function to generate UUID that works in all environments
function generateUUID() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    // Fallback implementation for environments where crypto.randomUUID() is not available
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Update the helper function to include time
const formatDateForTable = (date: Date | string): string => {
  if (typeof date === 'string') {
    // If it's already in the correct format, return as is
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(date)) {
      return date
    }
    // If it's a date string, convert to Date object
    date = new Date(date)
  }
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

export function useTableOperations(tableData: Ref<TableData>) {
  const isAddingColumn = ref(false)
  const newColumnTitle = ref('')
  const newColumnType = ref<ColumnType>('text')
  const isEditingName = ref(false)
  const tableName = ref(tableData.value.name)
  const activeTypeDropdown = ref<string | null>(null)

  // Watch for changes in the table name from external sources
  watch(() => tableData.value.name, (newName) => {
    tableName.value = newName
  })

  // Update table name
  const updateTableName = (name: string) => {
    try {
      tableName.value = name
      if (tableData.value) {
        tableData.value = {
          ...tableData.value,
          name: name || 'Untitled'
        }
      }
    } catch (error) {
      console.error('Error updating table name:', error)
    }
  }

  // Start editing table name
  const startEditingName = () => {
    isEditingName.value = true
  }

  // Save table name
  const saveName = () => {
    isEditingName.value = false
    updateTableName(tableName.value)
  }

  // Add a new column at a specific position
  const addColumn = (position?: 'before' | 'after', referenceColumnId?: string) => {
    try {
      // Generate a new column ID
      const newColumnId = generateUUID()
      
      // Create a new column with default values
      const newColumn = {
        id: newColumnId,
        title: newColumnTitle.value.trim() || `Column ${tableData.value.columns.length + 1}`,
        type: newColumnType.value,
      }
      
      // If position and referenceColumnId are provided, insert at specific position
      if (position && referenceColumnId) {
        // Find the index of the reference column
        const referenceIndex = tableData.value.columns.findIndex(col => col.id === referenceColumnId)
        if (referenceIndex === -1) {
          throw new Error('Reference column not found')
        }
        
        // Calculate the insertion index
        const insertIndex = position === 'before' ? referenceIndex : referenceIndex + 1
        
        // Create a new columns array with the new column at the specified position
        const updatedColumns = [
          ...tableData.value.columns.slice(0, insertIndex),
          newColumn,
          ...tableData.value.columns.slice(insertIndex)
        ]
        
        // Update all rows to include the new column with empty values
        const updatedRows = tableData.value.rows.map(row => {
          return {
            ...row,
            cells: {
              ...row.cells,
              [newColumnId]: ''
            }
          }
        })
        
        // Update the table data with the new columns and rows
        tableData.value = {
          ...tableData.value,
          columns: updatedColumns,
          rows: updatedRows
        }
      } else {
        // Add column at the end (original behavior)
        const updatedColumns = [...tableData.value.columns, newColumn]
        
        // Update all rows to include the new column with empty values
        const updatedRows = tableData.value.rows.map(row => {
          return {
            ...row,
            cells: {
              ...row.cells,
              [newColumnId]: ''
            }
          }
        })
        
        // Update the table data with the new columns and rows
        tableData.value = {
          ...tableData.value,
          columns: updatedColumns,
          rows: updatedRows
        }
      }

      // Reset the form
      newColumnTitle.value = ''
      newColumnType.value = 'text'
      isAddingColumn.value = false
    } catch (error) {
      throw error
    }
  }

  // Add a new row at a specific position
  const addRow = (position?: 'before' | 'after', referenceRowId?: string) => {
    try {
      const newRowId = generateUUID()
      
      // Create cells object with empty values for all columns
      const cells = tableData.value.columns.reduce(
        (acc: Record<string, any>, col: { id: string }) => {
          acc[col.id] = ''
          return acc
        },
        {} as Record<string, any>,
      )
      
      // Create the new row
      const newRow = {
        id: newRowId,
        cells
      }
      
      // If position and referenceRowId are provided, insert at specific position
      if (position && referenceRowId) {
        // Find the index of the reference row
        const referenceIndex = tableData.value.rows.findIndex(row => row.id === referenceRowId)
        if (referenceIndex === -1) {
          throw new Error('Reference row not found')
        }
        
        // Calculate the insertion index
        const insertIndex = position === 'before' ? referenceIndex : referenceIndex + 1
        
        // Create a new rows array with the new row at the specified position
        const updatedRows = [
          ...tableData.value.rows.slice(0, insertIndex),
          newRow,
          ...tableData.value.rows.slice(insertIndex)
        ]
        
        // Update the table data with the new rows
        tableData.value = {
          ...tableData.value,
          rows: updatedRows
        }
      } else {
        // Add row at the end (original behavior)
        const updatedRows = [...tableData.value.rows, newRow]
        
        // Update the table data with the new rows
        tableData.value = {
          ...tableData.value,
          rows: updatedRows
        }
      }
    } catch (error) {
      throw error
    }
  }

  // Update a cell value
  const updateCell = (rowId: string, columnId: string, value: any) => {
    try {
      const rowIndex = tableData.value.rows.findIndex((r: { id: string }) => r.id === rowId)
      if (rowIndex === -1) {
        return
      }
      
      // Get the column type
      const column = tableData.value.columns.find((col: { id: string }) => col.id === columnId)
      
      // Format the value based on column type
      let formattedValue = value
      if (column?.type === 'date' && value) {
        formattedValue = formatDateForTable(value)
      }
      
      // Create a new rows array
      const updatedRows = [...tableData.value.rows]
      
      // Update the specific cell in the row
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        cells: {
          ...updatedRows[rowIndex].cells,
          [columnId]: formattedValue
        }
      }
      
      // Update the table data with the new rows
      tableData.value = {
        ...tableData.value,
        rows: updatedRows
      }
    } catch (error) {
      throw error
    }
  }

  // Delete a row
  const deleteRow = (rowId: string) => {
    try {
      const updatedRows = tableData.value.rows.filter((row: { id: string }) => row.id !== rowId)
      
      tableData.value = {
        ...tableData.value,
        rows: updatedRows
      }
    } catch (error) {
      throw error
    }
  }

  // Delete a column
  const deleteColumn = (columnId: string) => {
    try {
      // Remove the column from columns array
      const updatedColumns = tableData.value.columns.filter((col: { id: string }) => col.id !== columnId)
      
      // Remove the column data from all rows
      const updatedRows = tableData.value.rows.map((row: { id: string, cells: Record<string, any> }) => {
        const newCells = { ...row.cells }
        delete newCells[columnId]
        
        return {
          ...row,
          cells: newCells
        }
      })
      
      // Update the table data
      tableData.value = {
        ...tableData.value,
        columns: updatedColumns,
        rows: updatedRows
      }
    } catch (error) {
      throw error
    }
  }

  // Toggle type dropdown
  const toggleTypeDropdown = (columnId: string | null) => {
    activeTypeDropdown.value = activeTypeDropdown.value === columnId ? null : columnId
  }

  // Update column type
  const updateColumnType = (columnId: string, newType: ColumnType) => {
    try {
      const columnIndex = tableData.value.columns.findIndex((col: { id: string }) => col.id === columnId)
      if (columnIndex === -1) {
        return
      }
      
      // Create a new columns array
      const updatedColumns = [...tableData.value.columns]
      
      // Update the specific column
      updatedColumns[columnIndex] = {
        ...updatedColumns[columnIndex],
        type: newType
      }
      
      // Update the table data with the new columns
      tableData.value = {
        ...tableData.value,
        columns: updatedColumns
      }
      
      // Close the dropdown
      activeTypeDropdown.value = null
    } catch (error) {
      throw error
    }
  }

  return {
    isAddingColumn,
    newColumnTitle,
    newColumnType,
    isEditingName,
    tableName,
    activeTypeDropdown,
    updateTableName,
    startEditingName,
    saveName,
    addColumn,
    addRow,
    updateCell,
    deleteRow,
    deleteColumn,
    toggleTypeDropdown,
    updateColumnType
  }
} 