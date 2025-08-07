<script setup lang="ts">
import { computed } from 'vue'
import type { TableData } from '@/features/editor/components/blocks/table-block/TableExtension'

const props = defineProps<{
  currentDate: Date
  tableData: TableData
}>()

const emit = defineEmits<{
  (e: 'update:tableData', data: TableData): void
}>()

// Get date columns
const startDateColumn = computed(() => {
  return props.tableData.columns.find(col => col.id === 'startDate')
})

const endDateColumn = computed(() => {
  return props.tableData.columns.find(col => col.id === 'endDate')
})

// Get events for the current day
const events = computed(() => {
  if (!startDateColumn.value || !endDateColumn.value) return []

  const startOfDay = new Date(props.currentDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setHours(23, 59, 59, 999)

  return props.tableData.rows.filter(row => {
    const startDate = new Date(row.cells[startDateColumn.value!.id])
    const endDate = new Date(row.cells[endDateColumn.value!.id])
    return startDate <= endOfDay && endDate >= startOfDay
  })
})

// Generate time slots
const timeSlots = computed(() => {
  const slots: number[] = []
  for (let hour = 0; hour < 24; hour++) {
    slots.push(hour)
  }
  return slots
})

// Get events for a specific hour
const getEventsForHour = (hour: number) => {
  if (!startDateColumn.value || !endDateColumn.value) return []
  
  return events.value.filter(row => {
    const startDate = new Date(row.cells[startDateColumn.value!.id])
    const endDate = new Date(row.cells[endDateColumn.value!.id])
    return startDate.getHours() <= hour && endDate.getHours() >= hour
  })
}

// Format time for display
const formatTime = (hour: number) => {
  return new Date(2000, 0, 1, hour).toLocaleTimeString('default', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Format date for display
const formatDate = () => {
  return props.currentDate.toLocaleDateString('default', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Get event color based on category
const getEventColor = (event: any) => {
  const category = event.cells.category
  switch (category) {
    case 'Meeting':
      return 'bg-blue-100 text-blue-800'
    case 'Task':
      return 'bg-green-100 text-green-800'
    case 'Event':
      return 'bg-purple-100 text-purple-800'
    case 'Reminder':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-primary/10'
  }
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Date header -->
    <div class="bg-muted p-2 text-center text-sm font-medium">
      {{ formatDate() }}
    </div>

    <!-- Time slots -->
    <div class="grid grid-cols-[100px_1fr] divide-y divide-border">
      <div
        v-for="hour in timeSlots"
        :key="hour"
        class="flex flex-col"
      >
        <!-- Time label -->
        <div class="h-12 border-b border-border bg-muted/50 p-1 text-xs text-muted-foreground">
          {{ formatTime(hour) }}
        </div>

        <!-- Events for this hour -->
        <div class="min-h-[60px] p-1">
          <div
            v-for="event in getEventsForHour(hour)"
            :key="event.id"
            class="mb-1 rounded p-1 text-xs"
            :class="getEventColor(event)"
          >
            <div class="font-medium">{{ event.cells.title }}</div>
            <div class="text-xs opacity-75">
              {{ formatTime(new Date(event.cells[startDateColumn!.id]).getHours()) }} -
              {{ formatTime(new Date(event.cells[endDateColumn!.id]).getHours()) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 







