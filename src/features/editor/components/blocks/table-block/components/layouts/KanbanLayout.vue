<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, GripVertical } from 'lucide-vue-next'
import type { TableData } from '@/features/editor/components/blocks/table-block/TableExtension'

const props = defineProps<{
  tableData: TableData
}>()

const emit = defineEmits<{
  (e: 'update:tableData', data: TableData): void
}>()

// Add drag-and-drop state
const draggedCard = ref<{ id: string; columnId: string } | null>(null)
const dragOverColumn = ref<string | null>(null)
const dragPosition = ref<'top' | 'bottom' | null>(null)

const isDragging = computed(() => draggedCard.value !== null)

// Kanban state
const columnsKanban = ref([
  { id: 'todo', title: 'To Do', color: '#94a3b8', icon: '📝' },
  { id: 'in-progress', title: 'In Progress', color: '#3b82f6', icon: '⚡' },
  { id: 'done', title: 'Done', color: '#22c55e', icon: '✅' }
])

// Initialize required columns if they don't exist
const initializeColumns = () => {
  const requiredColumns = [
    { id: 'title', title: 'Title', type: 'text' as const },
    { id: 'description', title: 'Description', type: 'text' as const },
    { id: 'status', title: 'Status', type: 'text' as const }
  ]

  const existingColumns = props.tableData.columns
  const missingColumns = requiredColumns.filter(
    col => !existingColumns.some(existing => existing.id === col.id)
  )

  if (missingColumns.length > 0) {
    emit('update:tableData', {
      ...props.tableData,
      columns: [...existingColumns, ...missingColumns]
    })
  }
}

// Get status column
const statusColumn = computed(() => {
  return props.tableData.columns.find(col => col.id === 'status')
})

// Group rows by status
const groupedRows = computed(() => {
  if (!statusColumn.value) return {}
  
  const groups: Record<string, typeof props.tableData.rows> = {}
  columnsKanban.value.forEach((col: { id: string; title: string; color: string; icon: string }) => {
    groups[col.id] = props.tableData.rows.filter((row: { id: string; cells: Record<string, any> }) => 
      row.cells[statusColumn.value!.id]?.toLowerCase() === col.id
    )
  })
  return groups
})

// Add drag-and-drop methods
const startDrag = (cardId: string, columnId: string) => {
  draggedCard.value = { id: cardId, columnId }
}

const handleDragOver = (e: DragEvent, columnId: string) => {
  e.preventDefault()
  dragOverColumn.value = columnId
  
  if (!e.currentTarget) return
  
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  dragPosition.value = e.clientY < midY ? 'top' : 'bottom'
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  if (e.currentTarget && e.relatedTarget) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const isOutside = 
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    
    if (isOutside) {
      dragOverColumn.value = null
      dragPosition.value = null
    }
  }
}

const endDrag = () => {
  if (draggedCard.value && dragOverColumn.value && dragOverColumn.value !== draggedCard.value.columnId) {
    // Move card to new column
    const card = props.tableData.rows.find((row: { id: string; cells: Record<string, any> }) => row.id === draggedCard.value?.id)
    if (card && statusColumn.value) {
      const newStatus = dragOverColumn.value
      const updatedCard = {
        ...card,
        cells: {
          ...card.cells,
          [statusColumn.value.id]: newStatus
        }
      }
      emit('update:tableData', {
        ...props.tableData,
        rows: props.tableData.rows.map((row: { id: string; cells: Record<string, any> }) => 
          row.id === card.id ? updatedCard : row
        )
      })
    }
  }
  draggedCard.value = null
  dragOverColumn.value = null
  dragPosition.value = null
}

// Add card management methods
const deleteCard = (cardId: string) => {
  emit('update:tableData', {
    ...props.tableData,
    rows: props.tableData.rows.filter((row: { id: string; cells: Record<string, any> }) => row.id !== cardId)
  })
}

// Add computed properties for column IDs
const titleColumnId = computed(() => 'title')
const descriptionColumnId = computed(() => 'description')

// Add card method
const addCard = (columnId: string) => {
  const newRow = {
    id: Math.random().toString(36).substring(7),
    cells: {
      title: '',
      description: '',
      status: columnId
    }
  }
  emit('update:tableData', {
    ...props.tableData,
    rows: [...props.tableData.rows, newRow]
  })
}

// Initialize columns when component is mounted
onMounted(() => {
  initializeColumns()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Kanban Board</h3>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div
        v-for="column in columnsKanban"
        :key="column.id"
        class="flex flex-col gap-4"
        :class="{
          'bg-muted/50': dragOverColumn === column.id,
          'transition-colors duration-200': true
        }"
        @dragenter.prevent="dragOverColumn = column.id"
        @dragover.prevent="(e) => handleDragOver(e, column.id)"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="endDrag"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ column.icon }}</span>
            <h4 class="font-medium">{{ column.title }}</h4>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">
              {{ groupedRows[column.id]?.length || 0 }}
            </span>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              @click="addCard(column.id)"
            >
              <Plus class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div 
          class="flex flex-col gap-2 min-h-[200px] p-2 rounded-lg transition-colors duration-200 relative"
          :class="{
            'bg-muted/30': dragOverColumn === column.id
          }"
        >
          <!-- Drop zone indicators -->
          <div
            v-if="dragOverColumn === column.id && dragPosition === 'top'"
            class="absolute top-0 left-0 right-0 h-1 bg-primary rounded-full"
          />
          <div
            v-if="dragOverColumn === column.id && dragPosition === 'bottom'"
            class="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"
          />

          <div
            v-for="row in groupedRows[column.id]"
            :key="row.id"
            class="group relative"
            draggable="true"
            @dragstart="startDrag(row.id, column.id)"
            @dragend="endDrag"
          >
            <Card 
              class="p-4 transition-all duration-200 hover:shadow-md"
              :class="{
                'opacity-50': isDragging && draggedCard?.id === row.id,
                'border-l-4': true,
                'border-l-primary': isDragging && draggedCard?.id === row.id,
                'scale-105': isDragging && draggedCard?.id === row.id
              }"
              :style="{
                borderLeftColor: isDragging && draggedCard?.id === row.id ? column.color : 'transparent'
              }"
            >
              <div class="flex items-start gap-2">
                <div
                  class="absolute left-0 top-0 bottom-0 w-1 cursor-move opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  :style="{ backgroundColor: column.color }"
                >
                  <GripVertical class="h-4 w-4 text-white/50" />
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <input
                      v-model="row.cells[titleColumnId]"
                      class="font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
                      placeholder="Card title"
                    />
                    <span class="text-sm text-muted-foreground">
                      #{{ row.id.slice(0, 4) }}
                    </span>
                  </div>
                  <textarea
                    v-model="row.cells[descriptionColumnId]"
                    class="mt-2 w-full bg-transparent border-none focus:outline-none focus:ring-0 p-0 resize-none"
                    placeholder="Add description..."
                    rows="2"
                  />
                </div>
                <div class="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="deleteCard(row.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <!-- Empty state -->
          <div
            v-if="!groupedRows[column.id]?.length"
            class="flex flex-col items-center justify-center h-32 text-muted-foreground"
          >
            <p class="text-sm">No cards</p>
            <p class="text-xs">Drag cards here or click + to add</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 







