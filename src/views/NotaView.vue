<script setup lang="ts">
import NotaEditor from '@/components/NotaEditor.vue'
import NotaConfigPage from '@/components/NotaConfigPage.vue'
import { watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { computed } from 'vue'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  id: string
}>()

const route = useRoute()
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
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col flex-1 h-full overflow-hidden bg-background">
    <header class="flex items-center justify-between px-6 py-4 border-b">
      <h1 class="text-2xl font-semibold tracking-tight">{{ nota?.title }}</h1>

      <Button variant="outline" class="flex items-center gap-2" @click="toggleConfigPage">
        <Cog6ToothIcon class="w-4 h-4" />
        {{ showConfigPage ? 'Hide Settings' : 'Settings' }}
      </Button>
    </header>

    <main class="flex-1 overflow-auto">
      <NotaEditor v-if="!showConfigPage" :nota-id="id" />
      <NotaConfigPage v-else :nota-id="id" />
    </main>
  </div>
</template>
