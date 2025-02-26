<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  StarIcon,
  FolderPlusIcon,
  XMarkIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TableCellsIcon,
} from '@heroicons/vue/24/solid'
import { useDebounceFn } from '@vueuse/core'
import { ref } from 'vue'
import { useNotaStore } from '@/stores/nota'
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
  { id: 'grid', icon: Squares2X2Icon, label: 'Grid View' },
  { id: 'list', icon: ListBulletIcon, label: 'List View' },
  { id: 'compact', icon: TableCellsIcon, label: 'Compact View' },
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
  {
    title: 'New Nota',
    icon: PlusIcon,
    action: () => emit('create-nota'),
  },
  {
    title: 'Import',
    icon: FolderPlusIcon,
    action: handleImport,
  },
  {
    title: 'Favorites',
    icon: StarIcon,
    action: () => emit('update:showFavorites', !props.showFavorites),
  },
]
</script>

<template>
  <div :class="['flex items-center justify-between gap-4', props.class]">
    <div class="relative flex-1">
      <MagnifyingGlassIcon
        class="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
      />
      <Input
        :value="search"
        class-name="pl-10"
        placeholder="Search your notas..."
        @input="(e: Event) => debouncedSearch((e.target as HTMLInputElement).value)"
      />
      <Button
        v-if="search"
        variant="ghost"
        size="icon"
        class="absolute right-2 top-1/2 -translate-y-1/2"
        @click="clearSearch"
      >
        <XMarkIcon class="h-4 w-4" />
      </Button>
    </div>

    <div class="flex items-center gap-2">
      <Button
        v-for="action in quickActions"
        :key="action.title"
        variant="ghost"
        size="icon"
        class="h-9 w-9"
        :class="[
          action.title === 'Favorites' &&
            showFavorites &&
            'bg-primary/10 text-primary hover:bg-primary/20',
        ]"
        :title="action.title"
        @click="action.action"
      >
        <component :is="action.icon" class="h-5 w-5" />
      </Button>
    </div>

    <div class="flex items-center gap-2">
      <Button
        v-for="option in viewOptions"
        :key="option.id"
        variant="ghost"
        size="icon"
        :class="[
          'h-8 w-8',
          viewType === option.id && 'bg-primary/10 text-primary hover:bg-primary/20',
        ]"
        @click="emit('update:viewType', option.id as 'grid' | 'list' | 'compact')"
        :title="option.label"
      >
        <component :is="option.icon" class="h-4 w-4" />
      </Button>
    </div>
  </div>

  <input type="file" accept=".nota" class="hidden" ref="fileInput" @change="handleFileSelect" />
</template>
