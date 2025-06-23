<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Calendar as CalendarIcon } from 'lucide-vue-next'
import Calendar from '@/components/ui/calendar.vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { TableData } from '@/components/editor/blocks/table-block/TableExtension'
import { cn } from '@/lib/utils'

const props = defineProps<{
  rowId: string
  columnId: string
  value: any
  type: string
  isEditing: boolean
  alignment: 'left' | 'center' | 'right'
  options?: string[]
  tableData?: TableData
}>()

const emit = defineEmits<{
  (e: 'update', value: any): void
  (e: 'startEditing'): void
  (e: 'stopEditing'): void
}>()

const isDropdownOpen = ref(false)
const newOption = ref('')
const dateInput = ref<HTMLInputElement | null>(null)
const isCalendarOpen = ref(false)

const uniqueValues = computed(() => {
  if (!props.tableData || !props.columnId) return []
  
  // Collect all non-empty values from the column
  const values = props.tableData.rows
    .map((row: any) => row.cells[props.columnId])
    .filter((value: any) => value !== undefined && value !== null && value !== '')
  
  // Return unique values, sorted alphabetically
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)))
})

const handleNewOption = () => {
  if (newOption.value.trim()) {
    emit('update', newOption.value.trim())
    newOption.value = ''
    isDropdownOpen.value = false
  }
}

const formatDateForInput = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const formatDateForDisplay = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('default', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update', target.value)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === 'Escape') {
    event.preventDefault()
    emit('stopEditing')
  }
}

const alignmentClass = computed(() => {
  switch (props.alignment) {
    case 'left': return 'text-left'
    case 'center': return 'text-center'
    case 'right': return 'text-right'
    default: return 'text-left'
  }
})

// Add computed property for date icon
const showDateIcon = computed(() => {
  return props.type === 'date' && !props.isEditing
})

const handleTimeInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const [hours, minutes] = target.value.split(':')
  const currentDate = props.value ? new Date(props.value) : new Date()
  currentDate.setHours(parseInt(hours), parseInt(minutes))
  emit('update', currentDate.toISOString())
}

const handleDateSelect = (date: Date | undefined) => {
  if (date) {
    const currentDate = props.value ? new Date(props.value) : new Date()
    date.setHours(currentDate.getHours(), currentDate.getMinutes())
    emit('update', date.toISOString())
  }
}

const handleCellClick = () => {
  if (props.type === 'select') {
    emit('startEditing')
  } else if (props.type === 'date') {
    isCalendarOpen.value = true
  } else {
    // For all other cell types, start editing
    emit('startEditing')
  }
}
</script>

<template>
  <div class="relative h-8">
    <template v-if="isEditing && type !== 'date'">
      <Input
        v-if="type !== 'select'"
        :type="type === 'number' ? 'number' : 'text'"
        :value="value"
        @input="handleInput"
        @blur="$emit('stopEditing')"
        @keydown="handleKeyDown"
        class="h-8 w-full absolute inset-0 px-2"
        autofocus
      />
      <DropdownMenu v-else v-model:open="isDropdownOpen">
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            class="h-8 w-full justify-between absolute inset-0 px-2"
          >
            <span class="truncate">{{ value || 'Select an option' }}</span>
            <ChevronDown class="h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-full">
          <div class="p-2">
            <div class="flex gap-2">
              <Input
                :value="newOption"
                @input="(e: Event) => newOption = (e.target as HTMLInputElement).value"
                placeholder="Add new option"
                class="mb-2"
                @keydown.enter="handleNewOption"
              />
              <Button 
                size="sm" 
                @click="handleNewOption"
                :disabled="!newOption.trim()"
              >
                Add
              </Button>
            </div>
          </div>
          <DropdownMenuItem
            v-for="option in uniqueValues"
            :key="String(option)"
            @click="emit('update', option)"
          >
            {{ option }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
    <template v-else>
      <div 
        class="h-8 flex items-center px-2 group"
        :class="alignmentClass"
        @click="handleCellClick"
        @dblclick="handleCellClick"
      >
        <template v-if="type === 'date'">
          <Popover v-model:open="isCalendarOpen">
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                class="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
              >
                <CalendarIcon class="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0" align="start">
              <div class="flex flex-col gap-2 p-3">
                <Calendar
                  mode="single"
                  :selected="value ? new Date(value) : undefined"
                  @select="handleDateSelect"
                  :initial-focus="true"
                />
                <div class="flex items-center gap-2">
                  <Input
                    type="time"
                    :value="value ? new Date(value).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''"
                    @input="handleTimeInput"
                    class="w-24"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <span class="truncate ml-2">{{ formatDateForDisplay(value) }}</span>
        </template>
        <template v-else>
          <span class="truncate">{{ value }}</span>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.relative {
  @apply h-8;
}

/* Add styles for cell content */
.truncate {
  @apply overflow-hidden text-ellipsis whitespace-nowrap;
}

/* Add styles for input focus */
input:focus {
  @apply outline-none ring-2 ring-primary ring-offset-2;
}

/* Add styles for cell hover */
div:hover {
  @apply bg-muted/20;
}

/* Add styles for cell editing */
div.editing {
  @apply bg-muted/30;
}

/* Add styles for cell alignment */
.text-left {
  @apply justify-start;
}

.text-center {
  @apply justify-center;
}

.text-right {
  @apply justify-end;
}

/* Add styles for empty cells */
div:empty::before {
  content: 'Click to edit';
  @apply text-muted-foreground text-sm;
}

/* Add styles for date cells */
.date-cell {
  @apply flex items-center gap-2 cursor-pointer;
}

.date-cell:hover .calendar-icon {
  @apply opacity-100;
}

/* Add styles for calendar button */
.calendar-button {
  @apply opacity-0 group-hover:opacity-100 transition-opacity duration-200;
}

.calendar-button:hover {
  @apply bg-transparent;
}

/* Add styles for date value */
.date-value {
  @apply ml-2;
}

/* Add styles for select cells */
.select-cell {
  @apply flex items-center justify-between;
}

/* Add styles for number cells */
.number-cell {
  @apply font-mono;
}

/* Add styles for text cells */
.text-cell {
  @apply font-sans;
}

/* Add styles for date input */
input[type="datetime-local"] {
  @apply cursor-pointer;
}

input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  @apply cursor-pointer;
}

/* Add styles for calendar popover */
:deep(.calendar) {
  @apply p-3;
}

:deep(.calendar-day) {
  @apply h-9 w-9 p-0 font-normal aria-selected:opacity-100;
}

:deep(.calendar-day-selected) {
  @apply bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground;
}

:deep(.calendar-day-today) {
  @apply bg-accent text-accent-foreground;
}

:deep(.calendar-day-outside) {
  @apply text-muted-foreground opacity-50;
}

:deep(.calendar-day-disabled) {
  @apply text-muted-foreground opacity-50;
}

:deep(.calendar-day-range-middle) {
  @apply bg-accent text-accent-foreground;
}

:deep(.calendar-day-range-end) {
  @apply bg-primary text-primary-foreground;
}

:deep(.calendar-day-range-start) {
  @apply bg-primary text-primary-foreground;
}

:deep(.calendar-day-selected) {
  @apply bg-primary text-primary-foreground;
}

:deep(.calendar-day-selected:hover) {
  @apply bg-primary text-primary-foreground;
}

:deep(.calendar-day-selected:focus) {
  @apply bg-primary text-primary-foreground;
}

:deep(.calendar-day-selected:active) {
  @apply bg-primary text-primary-foreground;
}

:deep(.calendar-day-selected:disabled) {
  @apply bg-primary text-primary-foreground opacity-50;
}

:deep(.calendar-day-selected[aria-disabled="true"]) {
  @apply bg-primary text-primary-foreground opacity-50;
}

:deep(.calendar-day-selected[aria-selected="true"]) {
  @apply bg-primary text-primary-foreground;
}

:deep(.calendar-day-selected[aria-selected="true"]:hover) {
  @apply bg-primary text-primary-foreground;
}

:deep(.calendar-day-selected[aria-selected="true"]:focus) {
  @apply bg-primary text-primary-foreground;
}

:deep(.calendar-day-selected[aria-selected="true"]:active) {
  @apply bg-primary text-primary-foreground;
}

:deep(.calendar-day-selected[aria-selected="true"]:disabled) {
  @apply bg-primary text-primary-foreground opacity-50;
}

:deep(.calendar-day-selected[aria-selected="true"][aria-disabled="true"]) {
  @apply bg-primary text-primary-foreground opacity-50;
}

/* Add styles for time input */
input[type="time"] {
  @apply h-8 px-2 py-1 rounded-md border border-input bg-background text-sm;
}

input[type="time"]::-webkit-calendar-picker-indicator {
  @apply cursor-pointer;
}
</style> 