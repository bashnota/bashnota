<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { XMarkIcon } from '@heroicons/vue/24/solid'
import type { Nota } from '@/types/nota'

const props = defineProps<{
  selectedTag: string
  notas: Nota[]
}>()

const emit = defineEmits<{
  (e: 'update:selectedTag', value: string): void
}>()

const allTags = computed(() => {
  const tagSet = new Set<string>()
  props.notas.forEach((nota) => {
    if (nota.tags) {
      nota.tags.forEach((tag) => tagSet.add(tag))
    }
  })
  return Array.from(tagSet).sort()
})
</script>

<template>
  <div class="flex items-center gap-4">
    <div class="relative flex-1">
      <select
        :value="selectedTag"
        @change="emit('update:selectedTag', ($event.target as HTMLSelectElement).value)"
        class="w-full pl-3 pr-10 py-2 text-sm border rounded-md focus:outline-none dark:bg-gray-800"
      >
        <option value="">All tags</option>
        <option v-for="tag in allTags" :key="tag" :value="tag">
          {{ tag }}
        </option>
      </select>
      <Button
        v-if="selectedTag"
        variant="ghost"
        size="sm"
        class="absolute right-2 top-1/2 -translate-y-1/2"
        @click="emit('update:selectedTag', '')"
      >
        <XMarkIcon class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
