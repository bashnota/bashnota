<script setup lang="ts">
import { Folder, Star, Clock } from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { watch } from 'vue'

type ViewType = 'all' | 'favorites' | 'recent'

interface ViewOption {
  id: ViewType
  label: string
  icon: any
}

const props = defineProps<{
  modelValue: ViewType
  condensed?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ViewType]
}>()

const viewOptions: ViewOption[] = [
  { id: 'all', label: 'All Notes', icon: Folder },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'recent', label: 'Recent', icon: Clock },
]

// Save view preference to localStorage
watch(() => props.modelValue, (newView) => {
  localStorage.setItem('sidebar-view', newView)
})
</script>

<template>
  <div v-if="!condensed" class="flex gap-1">
    <Button
      v-for="option in viewOptions"
      :key="option.id"
      variant="ghost"
      size="sm"
      :class="[
        'h-7 w-7',
        modelValue === option.id && 'bg-primary/10 text-primary hover:bg-primary/20',
      ]"
      @click="emit('update:modelValue', option.id)"
      :title="option.label"
    >
      <component :is="option.icon" class="h-4 w-4" />
    </Button>
  </div>
  
  <!-- Condensed view when searching - shows only active view -->
  <div v-else class="flex gap-1">
    <Button
      variant="ghost"
      size="sm"
      class="h-7 px-2 bg-primary/10 text-primary hover:bg-primary/20"
      :title="`Filtering by: ${viewOptions.find(v => v.id === modelValue)?.label}`"
    >
      <component 
        :is="viewOptions.find(v => v.id === modelValue)?.icon" 
        class="h-3.5 w-3.5 mr-1" 
      />
      <span class="text-xs">{{ viewOptions.find(v => v.id === modelValue)?.label.split(' ')[0] }}</span>
    </Button>
  </div>
</template> 








