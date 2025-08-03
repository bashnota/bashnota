<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{
  event?: any
  selectedDate?: Date
}>()

const emit = defineEmits<{
  (e: 'save', data: any): void
  (e: 'cancel'): void
}>()

// Form state
const title = ref('')
const description = ref('')
const startDate = ref<Date>(new Date())
const endDate = ref<Date>(new Date())
const status = ref('Not Started')
const priority = ref('Medium')
const category = ref('Meeting')

// Computed properties for form validation
const isFormValid = computed(() => {
  return title.value.trim() !== '' &&
    startDate.value instanceof Date &&
    endDate.value instanceof Date &&
    endDate.value >= startDate.value
})

// Add this helper function
const parseDateFromTable = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Initialize form with event data or selected date
watch(() => props.event, (newEvent) => {
  if (newEvent) {
    title.value = newEvent.cells.title || ''
    description.value = newEvent.cells.description || ''
    startDate.value = parseDateFromTable(newEvent.cells.startDate)
    endDate.value = parseDateFromTable(newEvent.cells.endDate)
    status.value = newEvent.cells.status || 'Not Started'
    priority.value = newEvent.cells.priority || 'Medium'
    category.value = newEvent.cells.category || 'Meeting'
  }
}, { immediate: true })

// Initialize with selected date if creating new event
watch(() => props.selectedDate, (newDate) => {
  if (newDate && !props.event) {
    startDate.value = new Date(newDate)
    endDate.value = new Date(newDate)
    endDate.value.setHours(endDate.value.getHours() + 1)
  }
}, { immediate: true })

// Form submission handler
const handleSubmit = () => {
  if (!isFormValid.value) return

  const eventData = {
    title: title.value.trim(),
    description: description.value.trim(),
    startDate: startDate.value,
    endDate: endDate.value,
    status: status.value,
    priority: priority.value,
    category: category.value
  }

  emit('save', eventData)
}

// Options
const statusOptions = ['Not Started', 'In Progress', 'Completed']
const priorityOptions = ['Low', 'Medium', 'High']
const categoryOptions = ['Meeting', 'Task', 'Event', 'Reminder']

// Format date for input
const formatDateForInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Parse date from input
const parseDateFromInput = (value: string) => {
  return new Date(value)
}

// Computed properties for date inputs
const startDateInput = computed({
  get: () => formatDateForInput(startDate.value),
  set: (value: string) => {
    startDate.value = parseDateFromInput(value)
    // Update end date if it's before start date
    if (endDate.value < startDate.value) {
      endDate.value = new Date(startDate.value.getTime() + 3600000)
    }
  }
})

const endDateInput = computed({
  get: () => formatDateForInput(endDate.value),
  set: (value: string) => {
    endDate.value = parseDateFromInput(value)
  }
})

// Validation
const isValid = computed(() => {
  return title.value.trim() && startDate.value && endDate.value && endDate.value > startDate.value
})
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div class="space-y-2">
      <Label for="title">Title</Label>
      <Input
        id="title"
        :value="title"
        @input="(e: Event) => title = (e.target as HTMLInputElement).value"
        placeholder="Enter event title"
        required
      />
    </div>

    <div class="space-y-2">
      <Label for="description">Description</Label>
      <Textarea
        id="description"
        :value="description"
        @input="(e: Event) => description = (e.target as HTMLTextAreaElement).value"
        placeholder="Enter event description"
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label for="startDate">Start Date</Label>
        <Input
          id="startDate"
          type="datetime-local"
          :value="startDateInput"
          @input="(e: Event) => startDateInput = (e.target as HTMLInputElement).value"
          required
        />
      </div>

      <div class="space-y-2">
        <Label for="endDate">End Date</Label>
        <Input
          id="endDate"
          type="datetime-local"
          :value="endDateInput"
          @input="(e: Event) => endDateInput = (e.target as HTMLInputElement).value"
          required
        />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="space-y-2">
        <Label for="status">Status</Label>
        <Select :value="status" @update:value="(value: string) => status = value">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Not Started">Not Started</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="priority">Priority</Label>
        <Select :value="priority" @update:value="(value: string) => priority = value">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="category">Category</Label>
        <Select :value="category" @update:value="(value: string) => category = value">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Meeting">Meeting</SelectItem>
            <SelectItem value="Task">Task</SelectItem>
            <SelectItem value="Event">Event</SelectItem>
            <SelectItem value="Reminder">Reminder</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="flex justify-end gap-2">
      <Button type="button" variant="outline" @click="emit('cancel')">
        Cancel
      </Button>
      <Button type="submit" :disabled="!isFormValid">
        {{ props.event ? 'Update' : 'Create' }}
      </Button>
    </div>
  </form>
</template> 








