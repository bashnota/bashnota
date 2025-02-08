<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import RecentItems from '@/components/RecentItems.vue'
import { DocumentTextIcon, CodeBracketIcon, LinkIcon } from '@heroicons/vue/24/outline'
import { ref, onMounted } from 'vue'

const router = useRouter()
const store = useNotaStore()

const createNewNota = async () => {
  const nota = await store.createNota('Untitled Nota')
  router.push(`/nota/${nota.id}`)
}

const recentItems = ref<
  Array<{ id: string; title: string; type: 'nota' | 'page'; updatedAt: Date }>
>([])

onMounted(async () => {
  await Promise.all([store.loadNotas(), store.loadPages()])

  const items = [
    ...store.notas.map((n) => ({
      id: n.id,
      title: n.title,
      type: 'nota' as const,
      updatedAt: n.updatedAt,
    })),
    ...store.pages.map((p) => ({
      id: p.id,
      title: p.title,
      type: 'page' as const,
      updatedAt: p.updatedAt,
    })),
  ]

  recentItems.value = items
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10)
})

const openItem = (item: { id: string; type: 'nota' | 'page' }) => {
  router.push(`/${item.type}/${item.id}`)
}
</script>

<template>
  <div class="home">
    <div v-if="!store.notas.length" class="welcome">
      <h1>Welcome to BashNota</h1>
      <p>Your personal knowledge base for code and notes</p>
      <div class="getting-started">
        <button @click="createNewNota" class="primary-button">Create your first nota</button>
        <div class="features">
          <div class="feature">
            <DocumentTextIcon class="icon" />
            <h3>Organize</h3>
            <p>Create notas and nested pages to organize your knowledge</p>
          </div>
          <div class="feature">
            <CodeBracketIcon class="icon" />
            <h3>Code</h3>
            <p>Write and format code with syntax highlighting</p>
          </div>
          <div class="feature">
            <LinkIcon class="icon" />
            <h3>Connect</h3>
            <p>Link pages together to build your knowledge network</p>
          </div>
        </div>
      </div>
    </div>
    <RecentItems v-else />
    <div class="recent-items">
      <h2>Recent Items</h2>
      <div v-if="recentItems.length" class="items-list">
        <div v-for="item in recentItems" :key="item.id" class="item" @click="openItem(item)">
          <span class="title">{{ item.title }}</span>
          <span class="type">{{ item.type }}</span>
          <span class="date">{{ new Date(item.updatedAt).toLocaleDateString() }}</span>
        </div>
      </div>
      <div v-else class="empty-state">No items yet</div>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
  padding: 2rem;
}

.welcome {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
  padding: 4rem 2rem;
}

.welcome h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, var(--color-primary), var(--color-heading));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.welcome p {
  font-size: 1.25rem;
  color: var(--color-text-light);
  margin-bottom: 3rem;
}

.getting-started {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.primary-button {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.feature {
  padding: 1.5rem;
  background: var(--color-background-soft);
  border-radius: 12px;
  transition: all 0.2s;
}

.feature:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.feature .icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-primary);
  margin-bottom: 1rem;
}

.feature h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.feature p {
  font-size: 0.875rem;
  color: var(--color-text-light);
  margin: 0;
}

.recent-items {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}

h2 {
  margin-bottom: 1rem;
  color: var(--color-heading);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--color-background-soft);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.item:hover {
  background: var(--color-background-mute);
}

.title {
  font-weight: 500;
}

.type {
  color: var(--color-text-light);
  text-transform: capitalize;
}

.date {
  color: var(--color-text-light);
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-light);
}
</style>
