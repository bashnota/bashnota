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

// Load table data on component mount
onMounted(async () => {
  await loadTableData()
})

// Handle adding a new column from the dialog
const handleAddColumn = async (title: string, type: ColumnType) => {
  lastOperation.value = `Adding column: ${title} (${type})`
  
  try {
    if (!title || !title.trim()) {
      operationStatus.value = 'error'
      return
    }
    
    // Set the values in the composable
    newColumnTitle.value = title
    newColumnType.value = type
    
    // Call the addColumn function
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

// Handle adding a new row
const handleAddRow = async () => {
  lastOperation.value = 'Adding new row'
  
  try {
    addRow()
    
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
          @add-row="handleAddRow"
        />

        <!-- Add Column Dialog -->
        <AddColumnDialog
          :is-visible="isAddingColumn"
          @close="isAddingColumn = false"
          @add="handleAddColumn"
        />

        <!-- Table Content -->
        <TableContent
          :table-data="tableData"
          :active-type-dropdown="activeTypeDropdown"
          @toggle-type-dropdown="toggleTypeDropdown"
          @update-column-type="updateColumnType"
          @delete-column="deleteColumn"
          @delete-row="deleteRow"
          @update-cell="updateCell"
        />
        
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
