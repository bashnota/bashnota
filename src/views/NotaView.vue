<script setup lang="ts">
import NotaEditor from '@/components/NotaEditor.vue'
import NotaConfigPage from '@/components/NotaConfigPage.vue'
import { watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { computed } from 'vue'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  id: string
}>()

const route = useRoute()
const router = useRouter()
const store = useNotaStore()

const nota = computed(() => store.getCurrentNota(props.id))
const showConfigPage = ref(false)

const toggleConfigPage = () => {
  showConfigPage.value = !showConfigPage.value
}

// Watch for route changes to handle navigation between notas
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      console.log('Loading nota:', newId)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="nota-view">
    <div class="nota-header">
      <h1>{{ nota?.title }}</h1>
      <button class="config-button" @click="toggleConfigPage" :title="showConfigPage ? 'Hide settings' : 'Show settings'">
        <Cog6ToothIcon class="icon" />
        {{ showConfigPage ? 'Hide Settings' : 'Settings' }}
      </button>
    </div>
    
    <div class="nota-content">
      <NotaEditor v-if="!showConfigPage" :nota-id="id" />
      <NotaConfigPage v-else :nota-id="id" />
    </div>
  </div>
</template>

<style scoped>
.nota-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nota-header {
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nota-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}

.nota-content {
  flex: 1;
  overflow: auto;
}

.config-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.config-button:hover {
  background: var(--color-background-mute);
}

.config-button .icon {
  width: 1.25rem;
  height: 1.25rem;
}
</style> 