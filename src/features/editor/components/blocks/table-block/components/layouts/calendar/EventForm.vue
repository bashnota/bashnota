<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toTypedSchema } from "@vee-validate/zod"
import { useForm } from "vee-validate"
import * as z from "zod"
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from '@/components/ui/input'
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

// Form schema
const formSchema = toTypedSchema(z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  startDate: z.date({
    required_error: "Start date is required",
    invalid_type_error: "Invalid start date",
  }),
  endDate: z.date({
    required_error: "End date is required", 
    invalid_type_error: "Invalid end date",
  }),
  status: z.enum(['Not Started', 'In Progress', 'Completed']),
  priority: z.enum(['Low', 'Medium', 'High']),
  category: z.enum(['Meeting', 'Task', 'Event', 'Reminder'])
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"]
}))

// Form setup
const { handleSubmit, resetForm, setValues, values } = useForm({
  validationSchema: formSchema,
  initialValues: {
    title: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    status: 'Not Started' as const,
    priority: 'Medium' as const,
    category: 'Meeting' as const
  }
})

// Add helper function
const parseDateFromTable = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Initialize form with event data or selected date
watch(() => props.event, (newEvent) => {
  if (newEvent) {
    setValues({
      title: newEvent.cells.title || '',
      description: newEvent.cells.description || '',
      startDate: parseDateFromTable(newEvent.cells.startDate),
      endDate: parseDateFromTable(newEvent.cells.endDate),
      status: newEvent.cells.status || 'Not Started',
      priority: newEvent.cells.priority || 'Medium',
      category: newEvent.cells.category || 'Meeting'
    })
  }
}, { immediate: true })

// Initialize with selected date if creating new event
watch(() => props.selectedDate, (newDate) => {
  if (newDate && !props.event) {
    const endDate = new Date(newDate)
    endDate.setHours(endDate.getHours() + 1)
    
    setValues({
      ...values,
      startDate: new Date(newDate),
      endDate: endDate
    })
  }
}, { immediate: true })

// Form submission handler
const onSubmit = handleSubmit((formValues) => {
  const eventData = {
    title: formValues.title.trim(),
    description: formValues.description?.trim() || '',
    startDate: formValues.startDate,
    endDate: formValues.endDate,
    status: formValues.status,
    priority: formValues.priority,
    category: formValues.category
  }

  emit('save', eventData)
})

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
  get: () => values.startDate ? formatDateForInput(values.startDate) : '',
  set: (value: string) => {
    const newStartDate = parseDateFromInput(value)
    setValues({
      ...values,
      startDate: newStartDate,
      // Update end date if it's before start date
      endDate: values.endDate && values.endDate < newStartDate 
        ? new Date(newStartDate.getTime() + 3600000) 
        : values.endDate
    })
  }
})

const endDateInput = computed({
  get: () => values.endDate ? formatDateForInput(values.endDate) : '',
  set: (value: string) => {
    setValues({
      ...values,
      endDate: parseDateFromInput(value)
    })
  }
})

// Handle cancel
const handleCancel = () => {
  resetForm()
  emit('cancel')
}
</script>

<template>
  <form @submit="onSubmit" class="space-y-4">
    <FormField v-slot="{ componentField }" name="title">
      <FormItem>
        <FormLabel>Title</FormLabel>
        <FormControl>
          <Input
            placeholder="Enter event title"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="description">
      <FormItem>
        <FormLabel>Description</FormLabel>
        <FormControl>
          <Textarea
            placeholder="Enter event description"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="grid grid-cols-2 gap-4">
      <FormField name="startDate">
        <FormItem>
          <FormLabel>Start Date</FormLabel>
          <FormControl>
            <Input
              type="datetime-local"
              :value="startDateInput"
              @input="(e: Event) => startDateInput = (e.target as HTMLInputElement).value"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField name="endDate">
        <FormItem>
          <FormLabel>End Date</FormLabel>
          <FormControl>
            <Input
              type="datetime-local"
              :value="endDateInput"
              @input="(e: Event) => endDateInput = (e.target as HTMLInputElement).value"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <FormField v-slot="{ componentField }" name="status">
        <FormItem>
          <FormLabel>Status</FormLabel>
          <FormControl>
            <Select v-bind="componentField">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="status in statusOptions"
                  :key="status"
                  :value="status"
                >
                  {{ status }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="priority">
        <FormItem>
          <FormLabel>Priority</FormLabel>
          <FormControl>
            <Select v-bind="componentField">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="priority in priorityOptions"
                  :key="priority"
                  :value="priority"
                >
                  {{ priority }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="category">
        <FormItem>
          <FormLabel>Category</FormLabel>
          <FormControl>
            <Select v-bind="componentField">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="category in categoryOptions"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>

    <div class="flex justify-end gap-2">
      <Button type="button" variant="outline" @click="handleCancel">
        Cancel
      </Button>
      <Button type="submit">
        {{ props.event ? 'Update' : 'Create' }}
      </Button>
    </div>
  </form>
</template>