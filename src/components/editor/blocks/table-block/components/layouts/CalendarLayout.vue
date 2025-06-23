<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Calendar, Clock, LayoutGrid, Plus } from 'lucide-vue-next'
import type { TableData } from '@/components/editor/blocks/table-block/TableExtension'
import MonthView from './calendar/MonthView.vue'
import WeekView from './calendar/WeekView.vue'
import DayView from './calendar/DayView.vue'
import EventForm from './calendar/EventForm.vue'
import DayDetailsModal from './calendar/DayDetailsModal.vue'

const props = defineProps<{
  tableData: TableData
  isActive: boolean
}>()

const emit = defineEmits<{
  (e: 'update:tableData', data: TableData): void
}>()

// State
const currentDate = ref(new Date())
const viewMode = ref<'month' | 'week' | 'day'>('month')
const showEventForm = ref(false)
const selectedEvent = ref<any>(null)
const selectedDate = ref<Date | undefined>(undefined)
const showDayDetails = ref(false)
const editingEvent = ref<any | null>(null)
const newEvent = ref<any>({
  title: '',
  description: '',
  startDate: new Date(),
  endDate: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour later
  category: 'event',
  priority: 'medium',
  status: 'scheduled'
})

// Navigation methods
const goToToday = () => {
  currentDate.value = new Date()
}

const goToPrevious = () => {
  const newDate = new Date(currentDate.value)
  switch (viewMode.value) {
    case 'month':
      newDate.setMonth(newDate.getMonth() - 1)
      break
    case 'week':
      newDate.setDate(newDate.getDate() - 7)
      break
    case 'day':
      newDate.setDate(newDate.getDate() - 1)
      break
  }
  currentDate.value = newDate
}

const goToNext = () => {
  const newDate = new Date(currentDate.value)
  switch (viewMode.value) {
    case 'month':
      newDate.setMonth(newDate.getMonth() + 1)
      break
    case 'week':
      newDate.setDate(newDate.getDate() + 7)
      break
    case 'day':
      newDate.setDate(newDate.getDate() + 1)
      break
  }
  currentDate.value = newDate
}

// Format date for display
const formatDate = () => {
  return currentDate.value.toLocaleDateString('default', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Add this helper function
const formatDateForTable = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Event handling methods
const handleCreateEvent = (date: Date) => {
  selectedDate.value = date
  selectedEvent.value = undefined
  showEventForm.value = true
}

const handleEditEvent = (event: any) => {
  selectedEvent.value = event
  showEventForm.value = true
}

const handleSaveEvent = (eventData: any) => {
  const newTableData = { ...props.tableData }
  const eventRow = {
    id: selectedEvent.value?.id || Date.now().toString(),
    cells: {
      title: eventData.title,
      description: eventData.description,
      startDate: formatDateForTable(eventData.startDate),
      endDate: formatDateForTable(eventData.endDate),
      status: eventData.status,
      priority: eventData.priority,
      category: eventData.category
    }
  }

  if (selectedEvent.value) {
    // Update existing event
    const index = newTableData.rows.findIndex(row => row.id === selectedEvent.value.id)
    if (index !== -1) {
      newTableData.rows[index] = eventRow
    }
  } else {
    // Create new event
    newTableData.rows.push(eventRow)
  }

  emit('update:tableData', newTableData)
  showEventForm.value = false
  selectedEvent.value = undefined
  selectedDate.value = undefined
}

const handleCancelEvent = () => {
  showEventForm.value = false
  selectedEvent.value = undefined
  selectedDate.value = undefined
}

// Initialize required columns if they don't exist
const initializeColumns = () => {
  const requiredColumns = [
    { id: 'title', title: 'Title', type: 'text' as const },
    { id: 'description', title: 'Description', type: 'text' as const },
    { id: 'startDate', title: 'Start Date', type: 'date' as const },
    { id: 'endDate', title: 'End Date', type: 'date' as const },
    { id: 'status', title: 'Status', type: 'select' as const, options: ['Not Started', 'In Progress', 'Completed'] },
    { id: 'priority', title: 'Priority', type: 'select' as const, options: ['Low', 'Medium', 'High'] },
    { id: 'category', title: 'Category', type: 'select' as const, options: ['Meeting', 'Task', 'Event', 'Reminder'] }
  ]

  const newTableData = { ...props.tableData }
  let hasChanges = false

  requiredColumns.forEach(column => {
    const existingColumn = newTableData.columns.find(col => col.id === column.id)
    if (!existingColumn) {
      newTableData.columns.push(column)
      hasChanges = true
    }
  })

  if (hasChanges) {
    emit('update:tableData', newTableData)
  }
}

// Initialize columns on mount and when layout becomes active
onMounted(() => {
  initializeColumns()
})

watch(() => props.isActive, (isActive) => {
  if (isActive) {
    initializeColumns()
  }
})

// Add this function after the existing functions
const handleDayClick = (date: Date) => {
  selectedDate.value = date
  showDayDetails.value = true
}

// Add these functions after handleDayClick
const handleCreateEventFromDay = (date: Date) => {
  showDayDetails.value = false
  showEventForm.value = true
  editingEvent.value = null
  newEvent.value = {
    title: '',
    description: '',
    startDate: date,
    endDate: new Date(date.getTime() + 60 * 60 * 1000), // 1 hour later
    category: 'event',
    priority: 'medium',
    status: 'scheduled'
  }
}

const handleEditEventFromDay = (event: any) => {
  showDayDetails.value = false
  showEventForm.value = true
  editingEvent.value = event
}

const handleCloseDayDetails = () => {
  showDayDetails.value = false
  selectedDate.value = undefined
}

// Add this computed property after the existing ones
const viewModeLabel = computed(() => {
  switch (viewMode.value) {
    case 'month':
      return currentDate.value.toLocaleDateString('default', { month: 'long', year: 'numeric' })
    case 'week':
      const startOfWeek = new Date(currentDate.value)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      return `${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`
    case 'day':
      return currentDate.value.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }
})

// Update the handleUpdateEvent function
const handleUpdateEvent = (updatedEvent: any) => {
  const newTableData = { ...props.tableData }
  const rowIndex = newTableData.rows.findIndex(row => row.id === updatedEvent.id)
  
  if (rowIndex !== -1) {
    // Ensure dates are properly formatted
    const formattedEvent = {
      ...updatedEvent,
      cells: {
        ...updatedEvent.cells,
        startDate: formatDateForTable(new Date(updatedEvent.cells.startDate)),
        endDate: formatDateForTable(new Date(updatedEvent.cells.endDate))
      }
    }
    newTableData.rows[rowIndex] = formattedEvent
    emit('update:tableData', newTableData)
  }
}

// Add this function after handleUpdateEvent
const handleDeleteEvent = (eventToDelete: any) => {
  const rowIndex = props.tableData.rows.findIndex(row => row.id === eventToDelete.id)
  if (rowIndex !== -1) {
    const newTableData = { ...props.tableData }
    newTableData.rows.splice(rowIndex, 1)
    emit('update:tableData', newTableData)
  }
}

// Add these functions before the template
const getEventsForDay = (date: Date) => {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setHours(23, 59, 59, 999)

  return props.tableData.rows.filter(row => {
    const startDate = new Date(row.cells.startDate)
    const endDate = new Date(row.cells.endDate)
    return startDate <= endOfDay && endDate >= startOfDay
  })
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('default', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

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
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="goToToday">
          Today
        </Button>
        <div class="flex items-center gap-1">
          <Button variant="outline" size="icon" @click="goToPrevious">
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <div class="text-lg font-medium">{{ viewModeLabel }}</div>
          <Button variant="outline" size="icon" @click="goToNext">
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1 bg-muted p-1 rounded-md">
          <Button
            variant="ghost"
            size="sm"
            :class="{ 'bg-background shadow-sm': viewMode === 'month' }"
            @click="viewMode = 'month'"
          >
            <Calendar class="mr-2 h-4 w-4" />
            Month
          </Button>
          <Button
            variant="ghost"
            size="sm"
            :class="{ 'bg-background shadow-sm': viewMode === 'week' }"
            @click="viewMode = 'week'"
          >
            <LayoutGrid class="mr-2 h-4 w-4" />
            Week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            :class="{ 'bg-background shadow-sm': viewMode === 'day' }"
            @click="viewMode = 'day'"
          >
            <Clock class="mr-2 h-4 w-4" />
            Day
          </Button>
        </div>
        <Button @click="handleCreateEvent(currentDate)">
          <Plus class="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>
    </div>

    <!-- Calendar View -->
    <Card class="overflow-hidden">
      <MonthView
        v-if="viewMode === 'month'"
        :current-date="currentDate"
        :table-data="tableData"
        @create-event="handleCreateEvent"
        @edit-event="handleEditEvent"
        @day-click="handleDayClick"
      />
      <WeekView
        v-else-if="viewMode === 'week'"
        :current-date="currentDate"
        :table-data="tableData"
        @create-event="handleCreateEvent"
        @edit-event="handleEditEvent"
        @day-click="handleDayClick"
      />
      <DayView
        v-else
        :current-date="currentDate"
        :table-data="tableData"
        @create-event="handleCreateEvent"
        @edit-event="handleEditEvent"
        @day-click="handleDayClick"
      />
    </Card>

    <!-- Event Form Dialog -->
    <Dialog v-model:open="showEventForm">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ selectedEvent ? 'Edit Event' : 'Create Event' }}</DialogTitle>
          <DialogDescription>
            {{ selectedEvent ? 'Edit the event details below.' : 'Fill in the event details below.' }}
          </DialogDescription>
        </DialogHeader>
        <EventForm
          :event="selectedEvent"
          :selected-date="selectedDate"
          @save="handleSaveEvent"
          @cancel="handleCancelEvent"
        />
      </DialogContent>
    </Dialog>

    <!-- Day Details Modal -->
    <DayDetailsModal
      v-if="showDayDetails"
      :is-open="showDayDetails"
      :selected-date="selectedDate"
      :table-data="tableData"
      @close="handleCloseDayDetails"
      @create-event="handleCreateEventFromDay"
      @edit-event="handleEditEventFromDay"
      @update-event="handleUpdateEvent"
      @delete-event="handleDeleteEvent"
    />
  </div>
</template>

<style scoped>
/* Add these styles */
.calendar-grid {
  grid-template-columns: repeat(7, 1fr);
}

.calendar-grid-week {
  grid-template-columns: repeat(7, 1fr);
}

.calendar-grid-month {
  grid-template-columns: repeat(7, 1fr);
}

/* Make event text more compact */
.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

/* Ensure events don't overflow */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style> 