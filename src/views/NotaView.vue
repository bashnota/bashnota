<script setup lang="ts">
import NotaEditor from '@/components/NotaEditor.vue'
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { computed } from 'vue'

const props = defineProps<{
  id: string
}>()

const route = useRoute()
const router = useRouter()
const store = useNotaStore()

const nota = computed(() => store.getCurrentNota(props.id))

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
    <div class="nota-content">
      <div class="nota-header">
        <h1>{{ nota?.title }}</h1>
      </div>
      <NotaEditor :nota-id="id" />
    </div>
  </div>
</template>

<style scoped>
.nota-view {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.nota-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nota-header {
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--color-border);
}

.nota-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-heading);
  margin: 0;
}
</style> 