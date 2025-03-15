<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ref, watch, onMounted } from 'vue'
import { COLUMN_TYPES } from '../constants/columnTypes'
import type { ColumnType } from '../composables/useTableOperations'

const props = defineProps<{
  isVisible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add', title: string, type: ColumnType): void
}>()

const columnTitle = ref('')
const selectedType = ref<ColumnType>('text')
const typeDropdownOpen = ref(false)

// Focus the input when dialog becomes visible
watch(() => props.isVisible, (isVisible) => {
  if (isVisible) {
    // Reset and focus on open
    columnTitle.value = ''
    selectedType.value = 'text'
    typeDropdownOpen.value = false
    
    // Focus the input after the dialog is rendered
    setTimeout(() => {
      const input = document.querySelector('.add-column-dialog input') as HTMLInputElement
      if (input) {
        input.focus()
      }
    }, 100)
  } else {
    // Reset form when dialog is closed
    columnTitle.value = ''
    selectedType.value = 'text'
    typeDropdownOpen.value = false
  }
})

const handleAdd = () => {
  if (!columnTitle.value || !columnTitle.value.trim()) {
    return
  }
  
  // Emit the add event with the column title and type
  emit('add', columnTitle.value, selectedType.value)
  
  // Reset form
  columnTitle.value = ''
  selectedType.value = 'text'
}

const toggleTypeDropdown = () => {
  typeDropdownOpen.value = !typeDropdownOpen.value
}

const selectType = (type: ColumnType) => {
  selectedType.value = type
  typeDropdownOpen.value = false
}

// Handle keyboard events
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleAdd()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

// Handle input change
const handleInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  columnTitle.value = target.value
}
</script>

<template>
  <div
    v-if="isVisible"
    class="add-column-dialog absolute top-16 right-4 z-10 w-72 p-4 rounded-lg border bg-card shadow-lg"
  >
    <h4 class="text-sm font-medium mb-2">New Column</h4>
    <form @submit.prevent="handleAdd" class="space-y-3">
      <div class="space-y-2">
        <label class="text-sm text-muted-foreground">Column name</label>
        <Input
          :value="columnTitle"
          @input="handleInputChange"
          placeholder="Column name"
          @keydown="handleKeyDown"
          autofocus
          class="add-column-input"
        />
      </div>
      <div class="space-y-2">
        <label class="text-sm text-muted-foreground">Column type</label>
        <div class="relative">
          <Button
            type="button"
            variant="outline"
            class="w-full justify-between flex items-center gap-2"
            @click="toggleTypeDropdown"
          >
            <div class="flex items-center gap-2">
              <component
                :is="COLUMN_TYPES.find((t) => t.value === selectedType)?.icon"
                class="h-4 w-4"
              />
              {{ COLUMN_TYPES.find((t) => t.value === selectedType)?.label }}
            </div>
          </Button>

          <div
            v-if="typeDropdownOpen"
            class="absolute top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md z-50"
          >
            <div class="p-1">
              <Button
                v-for="type in COLUMN_TYPES"
                :key="type.value"
                type="button"
                variant="ghost"
                size="sm"
                class="w-full justify-start flex items-center gap-2"
                @click="selectType(type.value)"
              >
                <component :is="type.icon" class="h-4 w-4" />
                {{ type.label }}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" @click="emit('close')">Cancel</Button>
        <Button 
          type="submit" 
          size="sm"
          :disabled="!columnTitle.trim()"
        >
          Add
        </Button>
      </div>
    </form>
  </div>
</template> 