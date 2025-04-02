<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-vue-next'
import type { TableData } from '@/components/editor/extensions/TableExtension'

const props = defineProps<{
  isOpen: boolean
  selectedDate: Date | undefined
  tableData: TableData
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create-event', date: Date): void
  (e: 'edit-event', event: any): void
}>()

// Format date for display
const formattedDate = computed(() => {
  return props.selectedDate?.toLocaleDateString('default', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Get events for the selected day
const events = computed(() => {
  const startDateColumn = props.tableData.columns.find(col => col.id === 'startDate')
  const endDateColumn = props.tableData.columns.find(col => col.id === 'endDate')
  
  if (!startDateColumn || !endDateColumn) return []

  const startOfDay = new Date(props.selectedDate || new Date())
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setHours(23, 59, 59, 999)

  return props.tableData.rows.filter(row => {
    const startDate = new Date(row.cells[startDateColumn.id])
    const endDate = new Date(row.cells[endDateColumn.id])
    return startDate <= endOfDay && endDate >= startOfDay
  })
})

// Format time for display
const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('default', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Get event color based on category
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

// Add these computed properties after the existing ones
const sortedEvents = computed(() => {
  return [...events.value].sort((a, b) => {
    const timeA = new Date(a.cells.startDate).getTime()
    const timeB = new Date(b.cells.startDate).getTime()
    return timeA - timeB
  })
})

const groupedEvents = computed(() => {
  const groups: { [key: string]: any[] } = {
    'Morning': [],
    'Afternoon': [],
    'Evening': []
  }

  sortedEvents.value.forEach(event => {
    const hour = new Date(event.cells.startDate).getHours()
    if (hour < 12) {
      groups['Morning'].push(event)
    } else if (hour < 17) {
      groups['Afternoon'].push(event)
    } else {
      groups['Evening'].push(event)
    }
  })

  return groups
})
</script>

<template>
  <Dialog :open="isOpen" @update:open="(open) => !open && emit('close')">
    <DialogContent class="max-w-2xl max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>{{ formattedDate }}</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-6 flex-1 overflow-hidden">
        <!-- Add Event Button -->
        <Button class="w-full" @click="emit('create-event', selectedDate || new Date())">
          <Plus class="mr-2 h-4 w-4" />
          Add Event
        </Button>

        <!-- Events List -->
        <div v-if="events.length > 0" class="space-y-6 overflow-y-auto flex-1 pr-2">
          <div v-for="(groupEvents, timeGroup) in groupedEvents" :key="timeGroup" class="space-y-4">
            <div v-if="groupEvents.length > 0">
              <h3 class="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">{{ timeGroup }}</h3>
              <div class="space-y-2">
                <div
                  v-for="event in groupEvents"
                  :key="event.id"
                  class="p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  :class="getEventColor(event.cells.category)"
                  @click="emit('edit-event', event)"
                >
                  <div class="flex items-start justify-between">
                    <div class="space-y-1">
                      <h4 class="font-medium">{{ event.cells.title }}</h4>
                      <p class="text-sm opacity-80">{{ event.cells.description }}</p>
                    </div>
                    <div class="text-sm whitespace-nowrap">
                      {{ formatTime(event.cells.startDate) }} - {{ formatTime(event.cells.endDate) }}
                    </div>
                  </div>
                  <div class="mt-3 flex items-center gap-2 text-sm">
                    <span class="px-2 py-1 rounded-full bg-background/50">
                      {{ event.cells.category }}
                    </span>
                    <span class="px-2 py-1 rounded-full bg-background/50">
                      {{ event.cells.priority }}
                    </span>
                    <span class="px-2 py-1 rounded-full bg-background/50">
                      {{ event.cells.status }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Events Message -->
        <div v-else class="text-center text-muted-foreground py-8">
          No events scheduled for this day
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template> 