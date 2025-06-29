<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  mode?: 'single' | 'multiple' | 'range'
  selected?: Date | Date[] | { from: Date; to: Date }
  initialFocus?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', date: Date | undefined): void
}>()

const today = new Date()
const month = ref(today.getMonth())
const year = ref(today.getFullYear())

const daysInMonth = computed(() => {
  return new Date(year.value, month.value + 1, 0).getDate()
})

const firstDayOfMonth = computed(() => {
  return new Date(year.value, month.value, 1).getDay()
})

const days = computed(() => {
  const daysArray = []
  const daysInPrevMonth = new Date(year.value, month.value, 0).getDate()
  
  // Add days from previous month
  for (let i = firstDayOfMonth.value - 1; i >= 0; i--) {
    daysArray.push({
      date: new Date(year.value, month.value - 1, daysInPrevMonth - i),
      isCurrentMonth: false
    })
  }
  
  // Add days from current month
  for (let i = 1; i <= daysInMonth.value; i++) {
    daysArray.push({
      date: new Date(year.value, month.value, i),
      isCurrentMonth: true
    })
  }
  
  // Add days from next month
  const remainingDays = 42 - daysArray.length // 6 rows * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    daysArray.push({
      date: new Date(year.value, month.value + 1, i),
      isCurrentMonth: false
    })
  }
  
  return daysArray
})

const isSelected = (date: Date) => {
  if (!props.selected) return false
  if (props.selected instanceof Date) {
    return date.toDateString() === props.selected.toDateString()
  }
  return false
}

const isToday = (date: Date) => {
  return date.toDateString() === today.toDateString()
}

const handleDateClick = (date: Date) => {
  emit('select', date)
}

const prevMonth = () => {
  if (month.value === 0) {
    month.value = 11
    year.value = year.value - 1
  } else {
    month.value = month.value - 1
  }
}

const nextMonth = () => {
  if (month.value === 11) {
    month.value = 0
    year.value = year.value + 1
  } else {
    month.value = month.value + 1
  }
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
</script>

<template>
  <div class="calendar">
    <div class="calendar-header">
      <button @click="prevMonth" class="calendar-nav-button">
        <ChevronLeft class="h-4 w-4" />
      </button>
      <div class="calendar-title">
        {{ monthNames[month] }} {{ year }}
      </div>
      <button @click="nextMonth" class="calendar-nav-button">
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-weekday" v-for="day in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" :key="day">
        {{ day }}
      </div>
      <button
        v-for="(day, index) in days"
        :key="index"
        class="calendar-day"
        :class="{
          'calendar-day-selected': isSelected(day.date),
          'calendar-day-today': isToday(day.date),
          'calendar-day-outside': !day.isCurrentMonth
        }"
        @click="handleDateClick(day.date)"
      >
        {{ day.date.getDate() }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendar {
  @apply w-full max-w-sm p-3;
}

.calendar-header {
  @apply flex items-center justify-between mb-4;
}

.calendar-title {
  @apply text-sm font-medium;
}

.calendar-nav-button {
  @apply h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground rounded-md;
}

.calendar-grid {
  @apply grid grid-cols-7 gap-1;
}

.calendar-weekday {
  @apply h-9 w-9 flex items-center justify-center text-sm font-medium text-muted-foreground;
}

.calendar-day {
  @apply h-9 w-9 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2;
}

.calendar-day-selected {
  @apply bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground;
}

.calendar-day-today {
  @apply bg-accent text-accent-foreground;
}

.calendar-day-outside {
  @apply text-muted-foreground opacity-50;
}
</style> 








