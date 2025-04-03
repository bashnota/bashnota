<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

// Import composables
import { useTableData } from './composables/useTableData'
import { useTableOperations } from './composables/useTableOperations'

// Import components
import TableHeader from './components/TableHeader.vue'
import AddColumnDialog from './components/AddColumnDialog.vue'
import TableContent from './components/TableContent.vue'
import LayoutSwitcher, { type TableLayout } from './components/layouts/LayoutSwitcher.vue'
import BaseLayout from './components/layouts/BaseLayout.vue'
import ChartLayout from './components/layouts/ChartLayout.vue'
import KanbanLayout from './components/layouts/KanbanLayout.vue'
import CalendarLayout from './components/layouts/CalendarLayout.vue'

// Import types
import type { ColumnType } from './composables/useTableOperations'

const props = defineProps<{
  node: {
    attrs: {
      tableId: string
      notaId: string
    }
  }
}>()

// Initialize table data using composable
const { tableData, isLoading, isSaving, error, loadTableData, saveTableData } = useTableData(
  props.node.attrs.tableId,
  props.node.attrs.notaId
)

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

// Load table data on component mount
onMounted(async () => {
  await loadTableData()
})

// Handle adding a new row at a specific position
const handleAddRow = async (position: 'before' | 'after', rowId: string) => {
  lastOperation.value = `Adding new row ${position} row ${rowId}`
  
  try {
    addRow(position, rowId)
    
    // Force save the table data
    const saveResult = await saveTableData()
    operationStatus.value = saveResult ? 'success' : 'error'
  } catch (error) {
    operationStatus.value = 'error'
  }
}

// Handle adding a new column at a specific position
const handleAddColumn = async (position: 'before' | 'after', columnId: string) => {
  lastOperation.value = `Adding new column ${position} column ${columnId}`
  
  try {
    addColumn(position, columnId)
    
    // Force save the table data
    const saveResult = await saveTableData()
    operationStatus.value = saveResult ? 'success' : 'error'
  } catch (error) {
    operationStatus.value = 'error'
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
    
    // Force save the table data
    const saveResult = await saveTableData()
    operationStatus.value = saveResult ? 'success' : 'error'
  } catch (error) {
    operationStatus.value = 'error'
  }
}

// Handle adding a new row from the header
const handleAddRowFromHeader = async () => {
  lastOperation.value = 'Adding new row'
  
  try {
    // Add row at the end
    addRow('after', tableData.value.rows[tableData.value.rows.length - 1]?.id || '')
    
    // Force save the table data
    const saveResult = await saveTableData()
    operationStatus.value = saveResult ? 'success' : 'error'
  } catch (error) {
    operationStatus.value = 'error'
  }
}

// Handle table name update
const handleSaveName = async (name: string) => {
  lastOperation.value = `Updating table name to: ${name}`
  
  try {
    updateTableName(name)
    
    // Force save the table data
    const saveResult = await saveTableData()
    operationStatus.value = saveResult ? 'success' : 'error'
  } catch (error) {
    operationStatus.value = 'error'
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
          @save-name="handleSaveName"
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
          @save="saveTableData"
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
