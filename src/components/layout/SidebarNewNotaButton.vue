<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  showInput: boolean
  title: string
  parentId: string | null
}>()

const emit = defineEmits<{
  'update:showInput': [value: boolean]
  'update:title': [value: string]
  'create': [parentId: string | null]
}>()

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('update:showInput', false)
    emit('update:title', '')
  } else if (event.key === 'Enter') {
    emit('create', props.parentId)
  }
}
</script>

<template>
  <div>
    <!-- New Nota Button -->
    <Button
      v-if="!showInput"
      @click="emit('update:showInput', true)"
      class="h-7 text-xs px-2 gap-1"
      variant="default"
      size="sm"
    >
      <Plus class="h-4 w-4" />
      <span>New Nota</span>
    </Button>

    <!-- New Nota Input -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showInput" class="flex gap-1">
        <Input
          :value="title"
          @input="(e: Event) => emit('update:title', (e.target as HTMLInputElement).value)"
          placeholder="Enter nota title..."
          class="h-7 text-xs flex-1"
          @keydown="handleKeydown"
          autofocus
        />
        <Button
          @click="emit('create', parentId)"
          variant="default"
          size="sm"
          class="h-7 text-xs"
        >
          Create
        </Button>
      </div>
    </Transition>
  </div>
</template> 