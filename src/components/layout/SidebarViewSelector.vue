<script setup lang="ts">
import { Folder, Star, Clock } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { watch } from 'vue'

type ViewType = 'all' | 'favorites' | 'recent'

interface ViewOption {
  id: ViewType
  label: string
  icon: any
}

const props = defineProps<{
  modelValue: ViewType
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
  <div class="flex gap-1">
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
</template> 