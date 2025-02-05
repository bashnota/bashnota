<script setup lang="ts">
import { computed } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { useRouter } from 'vue-router'
import { ClockIcon } from '@heroicons/vue/24/solid'

const store = useNotaStore()
const router = useRouter()

const recentItems = computed(() => {
  const allItems = [
    ...store.notas.map(nota => ({
      ...nota,
      path: `/nota/${nota.id}`
    })),
    ...store.pages.map(page => ({
      ...page,
      path: `/page/${page.id}`
    }))
  ]

  return allItems
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10)
})

const formatDate = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(date).toLocaleDateString()
}
</script>

<template>
  <div class="recent-items">
    <h2 class="title">
      <ClockIcon class="icon" style="width: 16px; height: 16px;" />
      Recent Items
    </h2>
    <div class="items-grid">
      <div 
        v-for="item in recentItems" 
        :key="item.id"
        class="item-card"
        @click="router.push(item.path)"
      >
        <div class="item-icon">
          {{ item.type === 'nota' ? '📁' : '📄' }}
        </div>
        <div class="item-info">
          <div class="item-title">{{ item.title }}</div>
          <div class="item-date">{{ formatDate(item.updatedAt) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recent-items {
  padding: 2rem;
}

.title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
  color: var(--color-heading);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.item-icon {
  font-size: 1.5rem;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-date {
  font-size: 0.75rem;
  color: var(--color-text-light);
  margin-top: 0.25rem;
}
</style> 