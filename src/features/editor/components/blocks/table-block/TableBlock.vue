<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import LoadingSpinner from '@/ui/LoadingSpinner.vue'
import type { TableData } from '@/features/editor/components/blocks/table-block/TableExtension'
import type { NodeViewProps } from '@tiptap/vue-3'
import { logger } from '@/services/logger'

// Import composables
import { useTableOperations } from '@/features/editor/components/blocks/table-block/composables/useTableOperations'

// Import components
import TableHeader from '@/features/editor/components/blocks/table-block/components/TableHeader.vue'
import AddColumnDialog from '@/features/editor/components/blocks/table-block/components/AddColumnDialog.vue'
import TableContent from '@/features/editor/components/blocks/table-block/components/TableContent.vue'
import LayoutSwitcher, { type TableLayout } from '@/features/editor/components/blocks/table-block/components/layouts/LayoutSwitcher.vue'
import BaseLayout from '@/features/editor/components/blocks/table-block/components/layouts/BaseLayout.vue'
import ChartLayout from '@/features/editor/components/blocks/table-block/components/layouts/ChartLayout.vue'
import KanbanLayout from '@/features/editor/components/blocks/table-block/components/layouts/KanbanLayout.vue'
import CalendarLayout from '@/features/editor/components/blocks/table-block/components/layouts/CalendarLayout.vue'

// Import types
import type { ColumnType } from '@/features/editor/components/blocks/table-block/composables/useTableOperations'

const props = defineProps<NodeViewProps & {
  node: {
    attrs: {
      tableData: TableData
    }
  }
}>()

// Initialize table data using node attributes
const tableData = ref<TableData>(props.node.attrs.tableData)
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<Error | null>(null)

// Initialize table operations using composable
const {
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
} = useTableOperations(tableData)

const lastOperation = ref<string>('')
const operationStatus = ref<'success' | 'error' | ''>('')
const currentLayout = ref<TableLayout>('table')

// Create a prefixed logger for TableBlock
const tableLogger = {
  log: (...args: any[]) => logger.log('[TableBlock]', ...args),
  error: (...args: any[]) => logger.error('[TableBlock]', ...args),
  info: (...args: any[]) => logger.info('[TableBlock]', ...args),
  warn: (...args: any[]) => logger.warn('[TableBlock]', ...args)
}

// Add a function to update node attributes when table data changes
const updateNodeAttributes = () => {
  if (props.node?.attrs) {
    // Create a clean copy of the table data
    const cleanTableData = {
      id: tableData.value.id,
      name: tableData.value.name || 'Untitled',
      columns: tableData.value.columns.map(col => ({
        id: col.id,
        title: col.title || '',
        type: col.type
      })),
      rows: tableData.value.rows.map(row => ({
        id: row.id,
        cells: { ...row.cells }
      }))
    };
    
    // Update node attributes with clean data
    props.node.attrs.tableData = cleanTableData;
    
    // Use updateAttributes if available (preferred method)
    if (props.updateAttributes) {
      props.updateAttributes({
        tableData: cleanTableData
      });
    }
    // Fallback to direct transaction if updateAttributes isn't available
    else if (props.editor && typeof props.getPos === 'function') {
      const pos = props.getPos();
      if (typeof pos === 'number') {
        props.editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, {
            tableData: cleanTableData
          });
          return true;
        });
      }
    }
    
    tableLogger.log('Table data updated:', cleanTableData);
  }
};

// Listen for table data changes
watch(() => tableData.value, () => {
  updateNodeAttributes();
}, { deep: true });

// Force update node attributes on component mount
onMounted(() => {
  updateNodeAttributes();
});

// Handle adding a new row at a specific position
const handleAddRow = async (position: 'before' | 'after', rowId: string) => {
  lastOperation.value = `Adding new row ${position} row ${rowId}`
  
  try {
    addRow(position, rowId)
    operationStatus.value = 'success'
  } catch (error) {
    operationStatus.value = 'error'
    tableLogger.error('Error in addRow:', error);
  }
}

// Handle adding a new column at a specific position
const handleAddColumn = async (position: 'before' | 'after', columnId: string) => {
  lastOperation.value = `Adding new column ${position} column ${columnId}`
  
  try {
    addColumn(position, columnId)
    operationStatus.value = 'success'
  } catch (error) {
    operationStatus.value = 'error'
    tableLogger.error('Error in addColumn:', error);
  }
}

// Handle adding a new column from the dialog
const handleAddColumnFromDialog = async (title: string, type: ColumnType) => {
  lastOperation.value = `Adding column: ${title} (${type})`
  
  try {
    if (!title || !title.trim()) {
      operationStatus.value = 'error'
      return
    }
    
    // Set the values in the composable
    newColumnTitle.value = title
    newColumnType.value = type
    
    // Call the addColumn function without parameters (will add at the end)
    addColumn()
    
    // Close the dialog
    isAddingColumn.value = false
    
    operationStatus.value = 'success'
  } catch (error) {
    operationStatus.value = 'error'
    tableLogger.error('Error in addColumnFromDialog:', error);
  }
}

// Handle adding a new row from the header
const handleAddRowFromHeader = async () => {
  lastOperation.value = 'Adding new row'
  
  try {
    // Add row at the end
    addRow('after', tableData.value.rows[tableData.value.rows.length - 1]?.id || '')
    operationStatus.value = 'success'
  } catch (error) {
    operationStatus.value = 'error'
    tableLogger.error('Error in addRowFromHeader:', error);
  }
}

// Handle table name update
const handleUpdateTableName = async (name: string) => {
  lastOperation.value = `Updating table name to: ${name}`
  
  try {
    updateTableName(name)
    operationStatus.value = 'success'
  } catch (error) {
    operationStatus.value = 'error'
    tableLogger.error('Error in updateTableName:', error);
  }
}

// Toggle the add column dialog
const toggleAddColumnDialog = () => {
  isAddingColumn.value = !isAddingColumn.value
}

// Clear operation status after 3 seconds
watch(operationStatus, (newStatus) => {
  if (newStatus) {
    setTimeout(() => {
      operationStatus.value = ''
    }, 3000)
  }
})

const emit = defineEmits<{
  (e: 'update:tableData', data: TableData): void
}>()

// Add this function after handleSaveName
const handleColumnTitleUpdate = async (columnId: string, title: string) => {
  lastOperation.value = `Updating column title to: ${title}`
  
  try {
    // Find the column index
    const columnIndex = tableData.value.columns.findIndex(col => col.id === columnId)
    if (columnIndex === -1) return
    
    // Create a new columns array with the updated title
    const updatedColumns = [...tableData.value.columns]
    updatedColumns[columnIndex] = {
      ...updatedColumns[columnIndex],
      title
    }
    
    // Update the table data
    tableData.value = {
      ...tableData.value,
      columns: updatedColumns
    }
    
    operationStatus.value = 'success'
  } catch (error) {
    operationStatus.value = 'error'
    tableLogger.error('Error in columnTitleUpdate:', error);
  }
}

// Add this function after handleColumnTitleUpdate
const handleReorderRows = async (fromRowId: string, toRowId: string) => {
  lastOperation.value = `Reordering rows from ${fromRowId} to ${toRowId}`
  
  try {
    const fromIndex = tableData.value.rows.findIndex(row => row.id === fromRowId)
    const toIndex = tableData.value.rows.findIndex(row => row.id === toRowId)
    
    if (fromIndex === -1 || toIndex === -1) return
    
    const newRows = [...tableData.value.rows]
    const [movedRow] = newRows.splice(fromIndex, 1)
    newRows.splice(toIndex, 0, movedRow)
    
    tableData.value = {
      ...tableData.value,
      rows: newRows
    }
    
    operationStatus.value = 'success'
  } catch (error) {
    operationStatus.value = 'error'
    tableLogger.error('Error in reorderRows:', error);
  }
}
</script>

<template>
  <NodeViewWrapper class="relative my-4">
    <div class="rounded-lg border bg-card">
      <!-- Loading State -->
      <div v-if="isLoading" class="p-8 flex justify-center items-center">
        <LoadingSpinner class="w-8 h-8" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-4 text-red-500">
        <p>Error loading table: {{ error.message }}</p>
      </div>

      <template v-else>
        <!-- Table Header -->
        <TableHeader
          :table-name="tableName"
          :is-editing-name="isEditingName"
          @start-editing-name="startEditingName"
          @save-name="handleUpdateTableName"
          @add-column="toggleAddColumnDialog"
          @add-row="handleAddRowFromHeader"
        >
          <template #right>
            <LayoutSwitcher
              :current-layout="currentLayout"
              @update:layout="currentLayout = $event"
              class="ml-4"
            />
          </template>
        </TableHeader>

        <!-- Add Column Dialog -->
        <AddColumnDialog
          :is-visible="isAddingColumn"
          @close="isAddingColumn = false"
          @add="handleAddColumnFromDialog"
        />

        <!-- Layout Content -->
        <BaseLayout
          :table-data="tableData"
          :is-loading="isLoading"
          :is-saving="isSaving"
          :error="error"
          @update:tableData="tableData = $event"
        >
          <!-- Table Layout -->
          <template v-if="currentLayout === 'table'">
            <TableContent
              :table-data="tableData"
              :active-type-dropdown="activeTypeDropdown"
              @toggle-type-dropdown="toggleTypeDropdown"
              @update-column-type="updateColumnType"
              @delete-column="deleteColumn"
              @delete-row="deleteRow"
              @update-cell="updateCell"
              @add-row="handleAddRow"
              @add-column="handleAddColumn"
              @reorder-rows="handleReorderRows"
              @update-column-title="handleColumnTitleUpdate"
            />
          </template>

          <!-- Chart Layout -->
          <template v-else-if="currentLayout === 'chart'">
            <ChartLayout
              :table-data="tableData"
              @update:tableData="tableData = $event"
            />
          </template>

          <!-- Kanban Layout -->
          <template v-else-if="currentLayout === 'kanban'">
            <KanbanLayout
              :table-data="tableData"
              :is-active="currentLayout === 'kanban'"
              @update:tableData="tableData = $event"
            />
          </template>

          <!-- Calendar Layout -->
          <template v-else-if="currentLayout === 'calendar'">
            <CalendarLayout
              :table-data="tableData"
              :is-active="currentLayout === 'calendar'"
              @update:tableData="tableData = $event"
            />
          </template>


          <!-- Other layouts will be added here -->
        </BaseLayout>
        
        <!-- Saving Indicator -->
        <div v-if="isSaving" class="p-2 border-t">
          <div class="text-sm px-3 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
            Saving changes...
          </div>
        </div>
        
        <!-- Operation Status -->
        <div v-else-if="operationStatus" class="p-2 border-t">
          <div 
            class="text-sm px-3 py-1 rounded-md" 
            :class="{
              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100': operationStatus === 'success',
              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100': operationStatus === 'error'
            }"
          >
            {{ operationStatus === 'success' ? '✓' : '✗' }} {{ lastOperation }}
          </div>
        </div>
      </template>
    </div>
  </NodeViewWrapper>
</template>

<style>
.table-block-table-element {
  margin: 0 !important;
}
</style>








