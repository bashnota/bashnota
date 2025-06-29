<script setup lang="ts">
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import {
  Search,
  Star,
  X,
  LayoutGrid,
  List,
  Table2
} from 'lucide-vue-next'
import { useDebounceFn } from '@vueuse/core'
import { ref } from 'vue'
import { useNotaStore } from '@/features/nota/stores/nota'
import { toast } from '@/lib/utils'

const props = defineProps<{
  search: string
  viewType: 'grid' | 'list' | 'compact'
  showFavorites: boolean
  class?: string
}>()

const emit = defineEmits<{
  (e: 'update:search', value: string): void
  (e: 'update:viewType', value: 'grid' | 'list' | 'compact'): void
  (e: 'update:showFavorites', value: boolean): void
  (e: 'create-nota'): void
}>()

const viewOptions = [
  { id: 'grid', icon: LayoutGrid, label: 'Grid View' },
  { id: 'list', icon: List, label: 'List View' },
  { id: 'compact', icon: Table2, label: 'Compact View' },
]

const debouncedSearch = useDebounceFn((value: string) => {
  emit('update:search', value)
}, 300)

const clearSearch = () => {
  emit('update:search', '')
}

const fileInput = ref<HTMLInputElement | null>(null)
const store = useNotaStore()

const handleImport = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const file = input.files[0]
  if (!file.name.endsWith('.nota')) {
    alert('Please select a .nota file')
    return
  }

  const success = await store.importNotas(file)
  if (success) {
    // Reload notas after successful import
    await store.loadNotas()
  } else {
    toast('Failed to import notas')
  }

  // Reset input
  input.value = ''
}

const quickActions = [
  // TODO: remove this later
  // {
  //   title: 'New Nota',
  //   icon: Plus,
  //   action: () => emit('create-nota'),
  // },
  // {
  //   title: 'Import',
  //   icon: FolderPlus,
  //   action: handleImport,
  // },
  {
    title: 'Favorites',
    icon: Star,
    action: () => emit('update:showFavorites', !props.showFavorites),
  },
]
</script>

<template>
  <div :class="['flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full', props.class]">
    <!-- Search Input - Full width on mobile -->
    <div class="relative flex-1 min-w-0">
      <Search
        class="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
      />
      <Input
        :value="search"
        class="pl-10 w-full"
        placeholder="Search your notas..."
        @input="(e: Event) => debouncedSearch((e.target as HTMLInputElement).value)"
      />
      <Button
        v-if="search"
        variant="ghost"
        size="icon"
        class="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
        @click="clearSearch"
      >
        <X class="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    </div>

    <!-- Actions - Responsive layout -->
    <div class="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
      <!-- Quick Actions -->
      <div class="flex items-center gap-1 sm:gap-2">
        <Button
          v-for="action in quickActions"
          :key="action.title"
          variant="ghost"
          size="icon"
          class="h-8 w-8 sm:h-9 sm:w-9"
          :class="[
            action.title === 'Favorites' &&
              showFavorites &&
              'bg-primary/10 text-primary hover:bg-primary/20',
          ]"
          :title="action.title"
          @click="action.action"
        >
          <component :is="action.icon" class="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      <!-- View Options -->
      <div class="flex items-center gap-1 border rounded-md p-0.5">
        <Button
          v-for="option in viewOptions"
          :key="option.id"
          variant="ghost"
          size="icon"
          :class="[
            'h-7 w-7 sm:h-8 sm:w-8',
            viewType === option.id && 'bg-primary/10 text-primary hover:bg-primary/20',
          ]"
          @click="emit('update:viewType', option.id as 'grid' | 'list' | 'compact')"
          :title="option.label"
        >
          <component :is="option.icon" class="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  </div>

  <input type="file" accept=".nota" class="hidden" ref="fileInput" @change="handleFileSelect" />
</template>








