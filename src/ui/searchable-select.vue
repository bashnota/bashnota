<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue: string | number
  options: Array<{
    value: string | number
    label: string
    description?: string
  }>
  placeholder?: string
  maxHeight?: string
  searchPlaceholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

const open = ref(false)
const searchQuery = ref('')

// Filter options based on search query
const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  
  const query = searchQuery.value.toLowerCase().trim()
  return props.options.filter(option => {
    const labelMatch = option.label.toLowerCase().includes(query)
    const descriptionMatch = option.description?.toLowerCase().includes(query) ?? false
    const valueMatch = option.value.toString().toLowerCase().includes(query)
    return labelMatch || descriptionMatch || valueMatch
  })
})

// Get the selected option label
const selectedOption = computed(() => {
  return props.options.find(option => option.value === props.modelValue)
})

// Reset search when popover closes
watch(open, (newValue) => {
  if (!newValue) {
    searchQuery.value = ''
  }
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        class="w-full justify-between"
        :disabled="disabled"
      >
        <span class="truncate">
          {{ selectedOption?.label || placeholder || 'Select an option' }}
        </span>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-full p-0">
      <Command>
        <CommandInput 
          :placeholder="searchPlaceholder || 'Search...'" 
          @input="(e) => {
            searchQuery = e.target.value
          }"
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup :style="{ maxHeight: maxHeight || '300px', overflow: 'auto' }">
            <CommandItem
              v-for="option in filteredOptions"
              :key="option.value"
              :value="option.label"
              @select="(event: any) => {
                emit('update:modelValue', option.value)
                open = false
              }"
            >
              <Check
                :class="cn(
                  'mr-2 h-4 w-4',
                  option.value === modelValue ? 'opacity-100' : 'opacity-0'
                )"
              />
              <div class="flex flex-col">
                <span>{{ option.label }}</span>
                <span v-if="option.description" class="text-xs text-muted-foreground">
                  {{ option.description }}
                </span>
              </div>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template> 








