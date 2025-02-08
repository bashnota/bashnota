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

  if (route.name === 'nota') {
    const nota = store.getCurrentNota(id)
    if (nota) items.push({ name: nota.title, path: `/nota/${nota.id}` })
  } else if (route.name === 'page') {
    const page = store.getCurrentPage(id)
    if (page) {
      // Add parent nota or page
      if (page.parentId) {
        const parentNota = store.getCurrentNota(page.parentId)
        if (parentNota) {
          items.push({ name: parentNota.title, path: `/nota/${parentNota.id}` })
        } else {
          const parentPage = store.getCurrentPage(page.parentId)
          if (parentPage) {
            items.push({ name: parentPage.title, path: `/page/${parentPage.id}` })
          }
        }
      }
      items.push({ name: page.title, path: `/page/${page.id}` })
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
