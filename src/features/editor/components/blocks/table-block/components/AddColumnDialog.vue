<script setup lang="ts">
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ref, watch, onMounted } from 'vue'
import { COLUMN_TYPES } from '@/features/editor/components/blocks/table-block/constants/columnTypes'
import type { ColumnType } from '@/features/editor/components/blocks/table-block/composables/useTableOperations'

const props = defineProps<{
  isVisible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add', title: string, type: ColumnType): void
}>()

// Form schema
const formSchema = toTypedSchema(z.object({
  title: z.string()
    .min(1, "Column name is required")
    .max(100, "Column name must be less than 100 characters")
    .refine((val) => val.trim().length > 0, "Column name cannot be empty"),
  type: z.enum(['text', 'number', 'date', 'select'] as const)
}))

// Form setup
const { handleSubmit, resetForm, setValues } = useForm({
  validationSchema: formSchema,
  initialValues: {
    title: '',
    type: 'text' as ColumnType
  }
})

// Focus the input when dialog becomes visible
watch(() => props.isVisible, (isVisible) => {
  if (isVisible) {
    // Reset form on open
    resetForm()
    
    // Focus the input after the dialog is rendered
    setTimeout(() => {
      const input = document.querySelector('.add-column-dialog input') as HTMLInputElement
      if (input) {
        input.focus()
      }
    }, 100)
  } else {
    // Reset form when dialog is closed
    resetForm()
  }
})

const onSubmit = handleSubmit((values) => {
  // Emit the add event with the column title and type
  emit('add', values.title, values.type)
  
  // Reset form
  resetForm()
})

// Handle keyboard events
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}
</script>

<template>
  <div
    v-if="isVisible"
    class="add-column-dialog absolute top-16 right-4 z-10 w-72 p-4 rounded-lg border bg-card shadow-lg"
  >
    <h4 class="text-sm font-medium mb-2">New Column</h4>
    <form @submit="onSubmit" class="space-y-3">
      <FormField v-slot="{ componentField }" name="title">
        <FormItem>
          <FormLabel>Column name</FormLabel>
          <FormControl>
            <Input
              placeholder="Column name"
              @keydown="handleKeyDown"
              autofocus
              class="add-column-input"
              v-bind="componentField"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="type">
        <FormItem>
          <FormLabel>Column type</FormLabel>
          <FormControl>
            <Select v-bind="componentField">
              <SelectTrigger>
                <SelectValue placeholder="Select column type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="type in COLUMN_TYPES"
                  :key="type.value"
                  :value="type.value"
                >
                  <div class="flex items-center gap-2">
                    <component :is="type.icon" class="h-4 w-4" />
                    {{ type.label }}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <div class="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" @click="emit('close')">Cancel</Button>
        <Button type="submit" size="sm">
          Add
        </Button>
      </div>
    </form>
  </div>
</template> 








