<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value?: number
}>()

const percent = computed(() => {
  return props.value != null ? Math.max(0, Math.min(100, props.value)) : 0
})
</script>

<template>
  <div
    class="relative h-2 w-full overflow-hidden rounded-full bg-primary/10"
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="h-full w-full flex-1 bg-primary transition-all"
      :style="{ transform: `translateX(-${100 - percent}%)` }"
    ></div>
  </div>
</template> 