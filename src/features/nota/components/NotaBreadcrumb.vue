<template>
  <nav class="nota-breadcrumb" aria-label="Nota navigation">
    <ol class="flex items-center space-x-1 text-sm text-muted-foreground">
      <li v-for="(nota, index) in hierarchy" :key="nota.id" class="flex items-center">
        <!-- Separator -->
        <ChevronRight v-if="index > 0" class="h-4 w-4 mx-1" />
        
        <!-- Breadcrumb item -->
        <button
          v-if="index < hierarchy.length - 1"
          @click="navigateToNota(nota.id)"
          class="hover:text-foreground transition-colors duration-200 px-2 py-1 rounded-md hover:bg-muted/50"
          :title="`Go to ${nota.title}`"
        >
          {{ nota.title }}
        </button>
        
        <!-- Current nota (not clickable) -->
        <span v-else class="px-2 py-1 font-medium text-foreground">
          {{ nota.title }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/features/nota/stores/nota'
import { ChevronRight } from 'lucide-vue-next'
import type { Nota } from '@/features/nota/types/nota'

interface Props {
  notaId: string
}

const props = defineProps<Props>()
const router = useRouter()
const notaStore = useNotaStore()

// Get the hierarchy for the current nota
const hierarchy = computed(() => notaStore.getNotaHierarchy(props.notaId))

// Navigate to a specific nota
const navigateToNota = (notaId: string) => {
  router.push(`/nota/${notaId}`)
}
</script>

<style scoped>
.nota-breadcrumb {
  @apply flex-shrink-0;
}

.nota-breadcrumb ol {
  @apply flex-wrap;
}
</style>
