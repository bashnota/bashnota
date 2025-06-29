<template>
  <div class="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
    <Home class="w-4 h-4 text-muted-foreground" />
    <div class="flex items-center gap-1 text-sm">
      <Button
        v-for="(segment, index) in pathSegments"
        :key="index"
        @click="navigateTo(index + 1)"
        variant="ghost"
        size="sm"
        class="h-auto p-1 text-xs hover:bg-muted/70"
      >
        {{ segment || 'Home' }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/ui/button'
import { Home } from 'lucide-vue-next'

interface Props {
  pathSegments: string[]
}

interface Emits {
  (e: 'navigate', path: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

function navigateTo(endIndex: number) {
  const path = props.pathSegments.slice(0, endIndex).join('/')
  emit('navigate', path)
}
</script> 








