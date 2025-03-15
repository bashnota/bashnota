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
    tableName.value = name
    tableData.value = {
      ...tableData.value,
      name
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

  // Add a new column
  const addColumn = () => {
    // Validate input
    if (!newColumnTitle.value || !newColumnTitle.value.trim()) {
      throw new Error('Column title cannot be empty')
    }

    try {
      // Generate a new column ID
      const newColumnId = generateUUID()
      
      // Create a new column
      const newColumn = {
        id: newColumnId,
        title: newColumnTitle.value.trim(),
        type: newColumnType.value,
      }
      
      // Create a new columns array with the new column
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

      // Reset the form
      newColumnTitle.value = ''
      newColumnType.value = 'text'
      isAddingColumn.value = false
    } catch (error) {
      throw error
    }
  }

  // Add a new row
  const addRow = () => {
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
      
      // Create a new rows array with the new row
      const updatedRows = [...tableData.value.rows, newRow]
      
      // Update the table data with the new rows
      tableData.value = {
        ...tableData.value,
        rows: updatedRows
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
      
      // Create a new rows array
      const updatedRows = [...tableData.value.rows]
      
      // Update the specific cell in the row
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        cells: {
          ...updatedRows[rowIndex].cells,
          [columnId]: value
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