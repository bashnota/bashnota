<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { ChevronRightIcon, HomeIcon } from '@heroicons/vue/24/solid'

const route = useRoute()
const store = useNotaStore()

const breadcrumbs = computed(() => {
  const items = []
  const id = route.params.id as string

  const nota = store.getCurrentNota(id)

  if (nota) {
    items.push({ name: nota.title, path: `/nota/${nota.id}` })

    // Add parent notas to breadcrumbs
    const parentNotas = store.getParents(nota.id)
    for (const parentNota of parentNotas) {
      items.push({ name: parentNota.title, path: `/nota/${parentNota.id}` })
    }
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
      <HomeIcon class="h-4 w-4" />
    </RouterLink>

    <ChevronRightIcon class="h-4 w-4 mx-2 text-muted-foreground/50" aria-hidden="true" />

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

        <ChevronRightIcon
          v-if="index < breadcrumbs.length - 1"
          class="h-4 w-4 mx-2 text-muted-foreground/50"
          aria-hidden="true"
        />
      </li>
    </ol>
  </nav>
</template>
