<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { ChevronRight, Home } from 'lucide-vue-next'

const route = useRoute()
const store = useNotaStore()

const breadcrumbs = computed(() => {
  const items = []
  const id = route.params.id as string
  const nota = store.getCurrentNota(id)

  if (nota) {
    // Get all parents up to root
    const parentNotas = store.getParents(nota.id)
    
    // Add all parents (they're already in order from root to immediate parent)
    parentNotas.forEach(parentNota => {
      items.push({ name: parentNota.title, path: `/nota/${parentNota.id}` })
    })
    
    // Add current nota last
    items.push({ name: nota.title, path: `/nota/${nota.id}` })
  }

  return items
})
</script>

<template>
  <nav v-if="breadcrumbs.length" aria-label="Breadcrumb" class="flex items-center">
    <RouterLink
      to="/"
      class="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      <Home class="h-4 w-4" />
    </RouterLink>

    <ChevronRight class="h-4 w-4 mx-2 text-muted-foreground/50" aria-hidden="true" />

    <ol class="flex items-center">
      <li v-for="(item, index) in breadcrumbs" :key="item.path" class="flex items-center">
        <RouterLink
          :to="item.path"
          :class="[
            'text-sm transition-colors',
            index === breadcrumbs.length - 1
              ? 'font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined"
        >
          {{ item.name }}
        </RouterLink>

        <ChevronRight
          v-if="index < breadcrumbs.length - 1"
          class="h-4 w-4 mx-2 text-muted-foreground/50"
          aria-hidden="true"
        />
      </li>
    </ol>
  </nav>
</template>
