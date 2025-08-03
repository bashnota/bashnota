<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { onKeyStroke } from '@vueuse/core'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  modelValue: string
  showSearch: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:showSearch': [value: boolean]
}>()

const searchInput = ref<HTMLInputElement | null>(null)

// Focus the search input when it becomes visible
watch(() => props.showSearch, (newValue) => {
  if (newValue) {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})

// Handle keyboard shortcuts
onKeyStroke('k', (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    emit('update:showSearch', true)
  }
})

onKeyStroke('Escape', () => {
  if (props.showSearch) {
    emit('update:showSearch', false)
    emit('update:modelValue', '')
  }
})

const clearSearch = () => {
  emit('update:modelValue', '')
  emit('update:showSearch', false)
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="showSearch" class="relative w-full">
      <div class="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <Search class="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        :value="modelValue"
        @input="(e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value)"
        placeholder="Search notes... (⌘K)"
        class="pl-7 pr-7 h-7 text-xs w-full bg-background transition-all duration-200"
        ref="searchInput"
      />
      <Button
        v-if="modelValue"
        variant="ghost"
        size="sm"
        class="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 opacity-60 hover:opacity-100 transition-opacity"
        @click="clearSearch"
        title="Clear search (Esc)"
      >
        <X class="h-3 w-3" />
      </Button>
    </div>
    <Button
      v-else
      variant="ghost"
      size="sm"
      class="h-7 w-7 flex-shrink-0"
      @click="emit('update:showSearch', true)"
      title="Search (⌘K)"
    >
      <Search class="h-3.5 w-3.5" />
    </Button>
  </Transition>
</template> 








