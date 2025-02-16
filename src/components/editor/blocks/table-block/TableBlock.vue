<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useTableStore } from '@/stores/tableStore'
import type { TableData } from '../../extensions/TableExtension'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlusIcon, TrashIcon } from '@heroicons/vue/24/solid'
import { ScrollArea } from '@/components/ui/scroll-area'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PencilIcon, Type, Hash, ListChecks, Calendar } from 'lucide-vue-next'

const props = defineProps<{
  node: {
    attrs: {
      tableId: string
      notaId: string
    }
  }
}>()

const tableStore = useTableStore()
const isLoading = ref(true)

// Initialize all reactive refs
const tableData = ref<TableData>({
  id: props.node.attrs.tableId,
  name: 'Untitled',
  columns: [],
  rows: [],
})
const tableName = ref('Untitled')
const isAddingColumn = ref(false)
const newColumnTitle = ref('')
const isEditingName = ref(false)
const columnTypes = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'select', label: 'Select', icon: ListChecks },
  { value: 'date', label: 'Date', icon: Calendar },
] as const

const newColumnType = ref<(typeof columnTypes)[number]['value']>('text')

// Add new ref for dropdown state
const activeTypeDropdown = ref<string | null>(null)

onMounted(async () => {
  try {
    const data = await tableStore.getTable(props.node.attrs.tableId)
    if (data) {
      // Update all properties individually to ensure reactivity
      tableData.value = {
        id: data.id,
        name: data.name,
        columns: [...data.columns],
        rows: [...data.rows],
      }
      tableName.value = data.name
    } else {
      const columnID = crypto.randomUUID()

      // Initialize new table
      const newTable: TableData & { notaId: string } = {
        id: props.node.attrs.tableId,
        notaId: props.node.attrs.notaId,
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
      // Set the data with spread operators to ensure reactivity
      tableData.value = { ...newTable }
      tableName.value = newTable.name
    }
  } catch (error) {
    console.error('Error loading table:', error)
  } finally {
    isLoading.value = false
  }
})

// Update watch to properly sanitize data for IndexedDB
watch(
  tableData,
  async (newData) => {
    if (newData) {
      try {
        // Create a clean copy of the data by serializing and deserializing
        const sanitizedData = {
          id: newData.id,
          name: newData.name,
          columns: newData.columns.map((column) => ({
            id: column.id,
            title: column.title,
            type: column.type,
          })),
          rows: newData.rows.map((row) => ({
            id: row.id,
            cells: { ...row.cells },
          })),
        }

        // Verify data is serializable
        JSON.parse(JSON.stringify(sanitizedData))

        await tableStore.updateTable(sanitizedData)
      } catch (error) {
        console.error('Failed to update table:', error)
      }
    }
  },
  { deep: true },
)

const startEditingName = () => {
  isEditingName.value = true
}

const saveName = () => {
  isEditingName.value = false
  tableData.value.name = tableName.value
}

const addColumn = async () => {
  if (!newColumnTitle.value.trim()) return

  tableData.value.columns.push({
    id: crypto.randomUUID(),
    title: newColumnTitle.value,
    type: newColumnType.value,
  })

  newColumnTitle.value = ''
  newColumnType.value = 'text'
  isAddingColumn.value = false
}

const addRow = async () => {
  const newRow = {
    id: crypto.randomUUID(),
    cells: tableData.value.columns.reduce(
      (acc, col) => {
        acc[col.id] = ''
        return acc
      },
      {} as Record<string, any>,
    ),
  }

  tableData.value.rows.push(newRow)
}

const updateCell = (rowId: string, columnId: string, value: any) => {
  const row = tableData.value.rows.find((r) => r.id === rowId)
  if (row) {
    // Create a new cells object to ensure reactivity
    row.cells = {
      ...row.cells,
      [columnId]: value,
    }
    // Force update the tableData to trigger the watch
    tableData.value = { ...tableData.value }
  }
}

const deleteRow = (rowId: string) => {
  tableData.value.rows = tableData.value.rows.filter((row) => row.id !== rowId)
}

const deleteColumn = (columnId: string) => {
  tableData.value.columns = tableData.value.columns.filter((col) => col.id !== columnId)
  // Remove column data from all rows
  tableData.value.rows.forEach((row) => {
    delete row.cells[columnId]
  })
}

const getColumnTypeLabel = (type: string) => {
  return columnTypes.find((t) => t.value === type)?.label || type
}

// Add method to toggle dropdown
const toggleTypeDropdown = (columnId: string | null) => {
  activeTypeDropdown.value = activeTypeDropdown.value === columnId ? null : columnId
}

const updateColumnType = (columnId: string, newType: string) => {
  const column = tableData.value.columns.find((col) => col.id === columnId)
  if (column) {
    column.type = newType as (typeof columnTypes)[number]['value']
    // Force update to trigger reactivity
    tableData.value = { ...tableData.value }
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

      <template v-else>
        <!-- Table Header -->
        <div class="p-4 border-b">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Input
                v-if="isEditingName"
                v-model="tableName"
                class="h-8 text-lg font-semibold"
                @keyup.enter="saveName"
                @blur="saveName"
                autofocus
              />
              <h3 v-else class="text-lg font-semibold flex items-center gap-2">
                {{ tableName }}
                <Button variant="ghost" size="sm" class="h-6 w-6" @click="startEditingName">
                  <PencilIcon class="h-4 w-4" />
                </Button>
              </h3>
            </div>
            <div class="flex items-center gap-2">
              <Button variant="outline" size="sm" @click="isAddingColumn = true">
                <PlusIcon class="h-4 w-4 mr-2" />
                Add Column
              </Button>
              <Button variant="outline" size="sm" @click="addRow">
                <PlusIcon class="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>
          </div>
        </div>

        <!-- Add Column Dialog -->
        <div
          v-if="isAddingColumn"
          class="absolute top-16 right-4 z-10 w-72 p-4 rounded-lg border bg-card shadow-lg"
        >
          <h4 class="text-sm font-medium mb-2">New Column</h4>
          <div class="space-y-3">
            <div class="space-y-2">
              <label class="text-sm text-muted-foreground">Column name</label>
              <Input
                v-model="newColumnTitle"
                placeholder="Column name"
                @keyup.enter="addColumn"
                @keyup.esc="isAddingColumn = false"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm text-muted-foreground">Column type</label>
              <div class="relative">
                <Button
                  variant="outline"
                  class="w-full justify-between flex items-center gap-2"
                  @click="toggleTypeDropdown('new')"
                >
                  <div class="flex items-center gap-2">
                    <component
                      :is="columnTypes.find((t) => t.value === newColumnType)?.icon"
                      class="h-4 w-4"
                    />
                    {{ getColumnTypeLabel(newColumnType) }}
                  </div>
                </Button>

                <div
                  v-if="activeTypeDropdown === 'new'"
                  class="absolute top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md z-50"
                >
                  <div class="p-1">
                    <Button
                      v-for="type in columnTypes"
                      :key="type.value"
                      variant="ghost"
                      size="sm"
                      class="w-full justify-start flex items-center gap-2"
                      @click="
                        () => {
                          newColumnType = type.value
                          toggleTypeDropdown(null)
                        }
                      "
                    >
                      <component :is="type.icon" class="h-4 w-4" />
                      {{ type.label }}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="sm" @click="isAddingColumn = false">Cancel</Button>
              <Button size="sm" @click="addColumn">Add</Button>
            </div>
          </div>
        </div>

        <!-- Table Content -->
        <ScrollArea class="max-h-[400px] overflow-auto">
          <Table class="table-block-table-element">
            <TableHeader>
              <TableRow>
                <TableHead
                  v-for="column in tableData.columns"
                  :key="column.id"
                  class="relative group"
                >
                  <div class="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-6 w-6 p-1"
                      @click="toggleTypeDropdown(column.id)"
                    >
                      <component
                        :is="columnTypes.find((t) => t.value === column.type)?.icon"
                        class="h-4 w-4"
                      />
                    </Button>
                    {{ column.title }}

                    <!-- Dropdown Menu -->
                    <div
                      v-if="activeTypeDropdown === column.id"
                      class="absolute top-full left-0 mt-1 w-32 rounded-md border bg-popover shadow-md z-50"
                    >
                      <div class="p-1">
                        <Button
                          v-for="type in columnTypes"
                          :key="type.value"
                          variant="ghost"
                          size="sm"
                          class="w-full justify-start text-xs flex items-center gap-2"
                          @click="
                            () => {
                              updateColumnType(column.id, type.value)
                              toggleTypeDropdown(null)
                            }
                          "
                        >
                          <component :is="type.icon" class="h-3 w-3" />
                          {{ type.label }}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    v-if="tableData.columns.length > 1"
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                    @click="deleteColumn(column.id)"
                  >
                    <TrashIcon class="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead class="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in tableData.rows" :key="row.id" class="group">
                <TableCell v-for="column in tableData.columns" :key="column.id">
                  <!-- Different input types based on column type -->
                  <template v-if="column.type === 'number'">
                    <Input
                      type="number"
                      :model-value="row.cells[column.id]"
                      @update:model-value="(value) => updateCell(row.id, column.id, value)"
                      class="h-8"
                    />
                  </template>
                  <template v-else-if="column.type === 'date'">
                    <Input
                      type="date"
                      :model-value="row.cells[column.id]"
                      @update:model-value="(value) => updateCell(row.id, column.id, value)"
                      class="h-8"
                    />
                  </template>
                  <template v-else>
                    <Input
                      :model-value="row.cells[column.id]"
                      @update:model-value="(value) => updateCell(row.id, column.id, value)"
                      class="h-8"
                    />
                  </template>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6 opacity-0 group-hover:opacity-100"
                    @click="deleteRow(row.id)"
                  >
                    <TrashIcon class="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </ScrollArea>
      </template>
    </div>
  </NodeViewWrapper>
</template>

<style>
.table-block-table-element {
  margin: 0 !important;
}
</style>
