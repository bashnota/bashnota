<script setup lang="ts">
import { computed } from 'vue'
import type { TableData } from '@/features/editor/components/blocks/table-block/TableExtension'

const props = defineProps<{
  currentDate: Date
  tableData: TableData
}>()

const emit = defineEmits<{
  (e: 'update:tableData', data: TableData): void
  (e: 'create-event', date: Date): void
  (e: 'edit-event', event: any): void
  (e: 'day-click', date: Date): void
}>()

// Get date columns
const startDateColumn = computed(() => {
  return props.tableData.columns.find(col => col.id === 'startDate')
})

const endDateColumn = computed(() => {
  return props.tableData.columns.find(col => col.id === 'endDate')
})

// Get events for the current month
const events = computed(() => {
  if (!startDateColumn.value || !endDateColumn.value) return []

  const startOfMonth = new Date(props.currentDate.getFullYear(), props.currentDate.getMonth(), 1)
  const endOfMonth = new Date(props.currentDate.getFullYear(), props.currentDate.getMonth() + 1, 0)

  return props.tableData.rows.filter(row => {
    const startDate = new Date(row.cells[startDateColumn.value!.id])
    const endDate = new Date(row.cells[endDateColumn.value!.id])
    return startDate <= endOfMonth && endDate >= startOfMonth
  })
})

// Get days in the current month
const daysInMonth = computed(() => {
  const year = props.currentDate.getFullYear()
  const month = props.currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []

  // Add empty cells for days before the first day of the month
  const firstDayOfWeek = firstDay.getDay()
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null)
  }

  // Add days of the month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  return days
})

// Get events for a specific day
const getEventsForDay = (date: Date | null) => {
  if (!date || !startDateColumn.value || !endDateColumn.value) return []
  
  return events.value.filter(row => {
    const startDate = new Date(row.cells[startDateColumn.value!.id])
    const endDate = new Date(row.cells[endDateColumn.value!.id])
    return date >= startDate && date <= endDate
  })
}

// Format date for display
const formatDay = (date: Date) => {
  return date.getDate()
}

// Get day of week name
const getDayName = (index: number) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[index]
}

// Add this function after getDayName
const getEventColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'meeting':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
    case 'task':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
    case 'event':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
    case 'reminder':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
  }
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('default', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}
</script>

<template>
  <div class="grid grid-cols-7 gap-px bg-border">
    <!-- Day headers -->
    <div
      v-for="dayIndex in 7"
      :key="dayIndex"
      class="bg-muted p-2 text-center text-sm font-medium"
    >
      {{ getDayName(dayIndex - 1) }}
    </div>

    <!-- Calendar days -->
    <div
      v-for="(day, index) in daysInMonth"
      :key="index"
      class="min-h-[120px] bg-background p-2 cursor-pointer relative"
      :class="{
        'bg-muted/50': !day,
        'hover:bg-muted/50': day,
        'bg-primary/5': day && day.toDateString() === new Date().toDateString()
      }"
      @click="day && emit('day-click', day)"
    >
      <div v-if="day" class="flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium">{{ formatDay(day) }}</div>
          <div v-if="day.toDateString() === new Date().toDateString()" class="text-xs text-primary">
            Today
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <div
            v-for="event in getEventsForDay(day)"
            :key="event.id"
            class="rounded p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
            :class="getEventColor(event.cells.category)"
            @click.stop="emit('edit-event', event)"
          >
            <div class="font-medium truncate">{{ event.cells.title }}</div>
            <div class="text-xs opacity-80">
              {{ formatTime(event.cells.startDate) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 







