<script setup lang="ts">
import { computed, ref } from 'vue'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-vue-next'
import type { TableData } from '@/components/editor/extensions/TableExtension'

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

const uniqueValues = computed(() => {
  if (!props.tableData || !props.columnId) return []
  
  // Collect all non-empty values from the column
  const values = props.tableData.rows
    .map(row => row.cells[props.columnId])
    .filter(value => value !== undefined && value !== null && value !== '')
  
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
</script>

<template>
  <div class="relative">
    <template v-if="isEditing">
      <Input
        v-if="type !== 'select'"
        :type="type === 'number' ? 'number' : type === 'date' ? 'datetime-local' : 'text'"
        :value="type === 'date' ? formatDateForInput(value) : value"
        @input="handleInput"
        @blur="$emit('stopEditing')"
        @keydown="handleKeyDown"
        class="h-8 w-full absolute inset-0"
        autofocus
      />
      <DropdownMenu v-else v-model:open="isDropdownOpen">
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            class="h-8 w-full justify-between absolute inset-0"
          >
            {{ value || 'Select an option' }}
            <ChevronDown class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-full">
          <div class="p-2">
            <Input
              v-model="newOption"
              placeholder="Add new option"
              class="mb-2"
              @keydown.enter="handleNewOption"
            />
          </div>
          <DropdownMenuItem
            v-for="option in uniqueValues"
            :key="option"
            @click="emit('update', option)"
          >
            {{ option }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
    <template v-else>
      <div 
        class="min-h-[2rem] flex items-center px-2"
        :class="alignmentClass"
        @click="type === 'select' ? $emit('startEditing') : null"
        @dblclick="type !== 'select' ? $emit('startEditing') : null"
      >
        <template v-if="type === 'date'">
          {{ formatDateForDisplay(value) }}
        </template>
        <template v-else>
          {{ value }}
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.relative {
  @apply h-8;
}
</style> 