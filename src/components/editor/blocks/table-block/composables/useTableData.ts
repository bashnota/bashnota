import { ref, watch } from 'vue'
import { useTableStore } from '@/stores/tableStore'
import type { TableData } from '@/components/editor/extensions/TableExtension'

export function useTableData(tableId: string, notaId: string) {
  const tableStore = useTableStore()
  const isLoading = ref(true)
  const error = ref<Error | null>(null)
  const isSaving = ref(false)

  // Initialize all reactive refs
  const tableData = ref<TableData>({
    id: tableId,
    name: 'Untitled',
    columns: [],
    rows: [],
  })

  // Load table data
  const loadTableData = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const data = await tableStore.getTable(tableId)
      if (data) {
        // Update all properties individually to ensure reactivity
        tableData.value = {
          id: data.id,
          name: data.name,
          columns: [...data.columns],
          rows: [...data.rows],
        }
      } else {
        // Initialize new table with default column
        const columnID = crypto.randomUUID()
        const newTable: TableData & { notaId: string } = {
          id: tableId,
          notaId: notaId,
          name: 'Untitled',
          columns: [
            {
              id: columnID,
              title: 'Title',
              type: 'text',
            },
          ],
          rows: [
            {
              id: crypto.randomUUID(),
              cells: {
                [columnID]: '',
              },
            },
          ],
        }
        await tableStore.createTable(newTable)
        tableData.value = { ...newTable }
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error loading table')
    } finally {
      isLoading.value = false
    }
  }

  // Save table data
  const saveTableData = async () => {
    if (isSaving.value) {
      return false
    }
    
    isSaving.value = true
    
    try {
      // Validate data before saving
      if (!tableData.value.id) {
        throw new Error('Table ID is missing')
      }
      
      if (!tableData.value.columns || !Array.isArray(tableData.value.columns)) {
        throw new Error('Table columns are invalid')
      }
      
      if (!tableData.value.rows || !Array.isArray(tableData.value.rows)) {
        throw new Error('Table rows are invalid')
      }
      
      // Create a clean copy of the data by serializing and deserializing
      const sanitizedData = {
        id: tableData.value.id,
        name: tableData.value.name || 'Untitled',
        columns: tableData.value.columns.map((column) => ({
          id: column.id,
          title: column.title || '',
          type: column.type,
        })),
        rows: tableData.value.rows.map((row) => ({
          id: row.id,
          cells: { ...row.cells },
        })),
      }

      // Verify data is serializable
      JSON.parse(JSON.stringify(sanitizedData))

      await tableStore.updateTable(sanitizedData)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error saving table')
      return false
    } finally {
      isSaving.value = false
    }
  }

  // Use a debounced watch to avoid too many saves
  let saveTimeout: number | null = null;
  
  // Watch for changes and save
  watch(
    tableData,
    async () => {
      // Clear any existing timeout
      if (saveTimeout !== null) {
        clearTimeout(saveTimeout);
      }
      
      // Set a new timeout to save after 500ms of inactivity
      saveTimeout = setTimeout(async () => {
        await saveTableData();
        saveTimeout = null;
      }, 500) as unknown as number;
    },
    { deep: true }
  )

  // Force immediate save
  const forceSave = async () => {
    // Clear any existing timeout
    if (saveTimeout !== null) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    
    // Save immediately
    return await saveTableData();
  }

  return {
    tableData,
    isLoading,
    isSaving,
    error,
    loadTableData,
    saveTableData: forceSave
  }
} 