<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { ChevronRightIcon } from '@heroicons/vue/24/solid'

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
  <nav v-if="breadcrumbs.length" class="breadcrumbs">
    <RouterLink to="/" class="home-link">Home</RouterLink>
    <ChevronRightIcon class="separator" />
    <template v-for="(item, index) in breadcrumbs" :key="item.path">
      <RouterLink :to="item.path" :class="{ active: index === breadcrumbs.length - 1 }">
        {{ item.name }}
      </RouterLink>
      <ChevronRightIcon v-if="index < breadcrumbs.length - 1" class="separator" />
    </template>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}

.separator {
  width: 1rem;
  height: 1rem;
  color: var(--color-text-light);
}

a {
  color: var(--color-text-light);
  text-decoration: none;
  font-size: 0.875rem;
}

a:hover {
  color: var(--color-text);
}

.active {
  color: var(--color-text);
  font-weight: 500;
}

.home-link {
  font-weight: 500;
}
</style>
