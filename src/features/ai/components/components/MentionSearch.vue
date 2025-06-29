<script setup lang="ts">
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/ui/command'
import { FileText, Calendar } from 'lucide-vue-next'
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  isVisible: boolean
  query: string
  searchResults: any[]
  position?: { top: number; left: number } | null
}>()

const emit = defineEmits([
  'select',
  'close',
  'updateQuery'
])

// Track currently selected index for keyboard navigation
const selectedIndex = ref(0)

// Filter for no results state
const hasResults = computed(() => props.searchResults.length > 0)

// Format date for display
const formatDate = (date: string | Date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Handle keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.isVisible) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (props.searchResults.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % props.searchResults.length
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (props.searchResults.length > 0) {
      selectedIndex.value = (selectedIndex.value - 1 + props.searchResults.length) % props.searchResults.length
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (props.searchResults.length > 0 && selectedIndex.value >= 0) {
      selectItem(props.searchResults[selectedIndex.value])
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

// Handle item selection
const selectItem = (item: any) => {
  emit('select', item)
}

// Update search query
const updateQuery = (value: string) => {
  emit('updateQuery', value)
}

// Reset selected index when results change
watch(() => props.searchResults, () => {
  selectedIndex.value = 0
})

// Attach and remove global keyboard event listeners
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div 
    v-if="isVisible" 
    class="mention-search-popup" 
    :style="position ? { position: 'absolute', top: `${position.top}px`, left: `${position.left}px` } : {}"
  >
    <Command class="rounded-lg border shadow-md">
      <CommandInput 
        :placeholder="'Search notas...'" 
        :value="query"
        @input="(e) => updateQuery(e.target.value)"
        class="mention-search-input"
        autofocus
      />
      
      <CommandList class="mention-command-list">
        <CommandEmpty v-if="!hasResults">
          <div class="flex flex-col items-center justify-center p-4 text-sm text-muted-foreground">
            <span>No matching notas found</span>
          </div>
        </CommandEmpty>
        
        <CommandGroup v-else heading="Notas">
          <CommandItem 
            v-for="(result, index) in searchResults" 
            :key="result.id"
            :value="result.id"
            :data-highlighted="selectedIndex === index"
            @click="selectItem(result)"
            class="cursor-pointer"
          >
            <div class="flex items-center gap-2 w-full overflow-hidden">
              <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
              <div class="flex flex-col flex-1 overflow-hidden">
                <span class="truncate text-sm font-medium">{{ result.title }}</span>
                <span class="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar class="h-3 w-3" />
                  {{ formatDate(result.updatedAt) }}
                </span>
              </div>
            </div>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </div>
</template>

<style scoped>
.mention-search-popup {
  width: 100%;
  z-index: 50;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 0 1px rgba(0, 0, 0, 0.2);
  animation: fadeIn 0.2s ease-out;
}

.mention-search-input:focus {
  box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3), 0 0 0 3px hsl(var(--primary) / 0.1);
  border-color: hsl(var(--primary));
}

.mention-command-list {
  max-height: 220px;
  overflow-y: auto;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .mention-search-popup {
    width: 100%;
  }
  
  .mention-command-list {
    max-height: 180px;
  }
}

[data-highlighted="true"] {
  background-color: hsl(var(--muted));
  border-radius: 4px;
  transition: background-color 0.15s ease;
}
</style>








