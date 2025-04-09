<template>
  <div class="flex flex-col items-center justify-center p-4 text-center">
    <Loader class="h-8 w-8 animate-spin mb-3" />
    <p class="text-muted-foreground">{{ props.message }}</p>
  </div>
</template>

<script setup lang="ts">
import { Loader } from 'lucide-vue-next'

// Props with default value
const props = defineProps<{
  message: string
}>()
</script> 