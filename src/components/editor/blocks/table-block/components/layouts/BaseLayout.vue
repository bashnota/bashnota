<script setup lang="ts">
import { computed } from 'vue'
import type { TableData } from '@/components/editor/blocks/table-block/TableExtension'

const props = defineProps<{
  tableData: TableData
  isLoading?: boolean
  isSaving?: boolean
  error?: Error | null
}>()

const emit = defineEmits<{
  (e: 'update:tableData', data: TableData): void
  (e: 'save'): void
}>()

// Computed properties for common data transformations
const columns = computed(() => props.tableData.columns)
const rows = computed(() => props.tableData.rows)
const tableName = computed(() => props.tableData.name)

// Common methods that can be used by child layouts
const updateTableName = (name: string) => {
  emit('update:tableData', {
    ...props.tableData,
    name,
  })
}

const updateCell = (rowIndex: number, columnIndex: number, value: any) => {
  const newRows = [...props.tableData.rows]
  const columnId = props.tableData.columns[columnIndex].id
  newRows[rowIndex].cells[columnId] = value
  emit('update:tableData', {
    ...props.tableData,
    rows: newRows,
  })
}

// Expose common functionality to child components
defineExpose({
  updateTableName,
  updateCell,
})
</script>

<template>
  <div class="w-full">
    <!-- Loading State -->
    <div v-if="isLoading" class="p-8 flex justify-center items-center">
      <slot name="loading">
        <div class="text-muted-foreground">Loading...</div>
      </slot>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 text-destructive">
      <slot name="error">
        <div>Error: {{ error.message }}</div>
      </slot>
    </div>

    <!-- Content -->
    <div v-else>
      <slot
        :tableData="tableData"
        :columns="columns"
        :rows="rows"
        :tableName="tableName"
        :updateTableName="updateTableName"
        :updateCell="updateCell"
      />
    </div>

    <!-- Saving Indicator -->
    <div v-if="isSaving" class="p-2 border-t">
      <slot name="saving">
        <div class="text-sm px-3 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
          Saving changes...
        </div>
      </slot>
    </div>
  </div>
</template> 