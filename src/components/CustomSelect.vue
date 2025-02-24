<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CircleDot, Search } from 'lucide-vue-next'

const props = defineProps<{
  options: Array<{ value: string; label: string }>
  modelValue?: string
  placeholder?: string
  searchable?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'select'])

const searchQuery = ref('')
const selectedValue = ref(props.modelValue || '')

// Watch for external value changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== selectedValue.value) {
      selectedValue.value = newValue || ''
    }
  },
)

const filteredOptions = computed(() => {
  if (!searchQuery.value || !props.searchable) return props.options

  return props.options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})
</script>

<template>
  <div class="custom-select w-full">
    <!-- Search input -->
    <div v-if="searchable" class="relative px-2 py-1.5 border-b">
      <div class="flex items-center border rounded-md px-2 bg-background">
        <Search class="h-4 w-4 text-muted-foreground mr-2" />
        <input
          v-model="searchQuery"
          type="text"
          class="w-full py-1.5 px-1 text-sm bg-transparent border-none outline-none"
          :placeholder="placeholder || 'Search...'"
        />
      </div>
    </div>

    <!-- Options list -->
    <div class="max-h-[200px] overflow-y-auto">
      <div
        v-if="filteredOptions.length === 0"
        class="py-4 text-center text-sm text-muted-foreground"
      >
        No options found.
      </div>
      <div v-else class="py-1">
        <div
          v-for="option in filteredOptions"
          :key="option.value"
          class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
          @click="emit('select', option.value)"
        >
          <CircleDot
            class="h-4 w-4 mr-2"
            :class="selectedValue === option.value ? 'opacity-100' : 'opacity-0'"
          />
          {{ option.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-select {
  @apply bg-popover text-popover-foreground;
}
</style>
