<script setup lang="ts">
import NotaEditor from '@/components/NotaEditor.vue'
import NotaConfigPage from '@/components/NotaConfigPage.vue'
import { watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { computed } from 'vue'
import { Cog6ToothIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

const props = defineProps<{
  id: string
}>()

const route = useRoute()
const store = useNotaStore()

const nota = computed(() => store.getCurrentNota(props.id))
const showConfigPage = ref(false)
const isSaving = ref(false)
const showSaved = ref(false)

const toggleConfigPage = () => {
  showConfigPage.value = !showConfigPage.value
}

// Save status handlers
const handleSaving = (saving: boolean) => {
  isSaving.value = saving
  if (!saving) {
    showSaved.value = true
    setTimeout(() => {
      showSaved.value = false
    }, 2000)
  }
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

const formatDate = (date: Date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
</script>

<template>
  <div class="flex flex-col flex-1 h-full overflow-hidden bg-background">
    <header class="flex items-center justify-between px-6 py-4 border-b">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-semibold tracking-tight">{{ nota?.title }}</h1>

          <!-- Save Status Indicator -->
          <div
            class="flex items-center text-xs text-muted-foreground transition-opacity duration-200"
            :class="{ 'opacity-0': !isSaving && !showSaved }"
          >
            <span v-if="isSaving" class="flex items-center gap-1">
              <ArrowPathIcon class="w-3 h-3 animate-spin" />
              Saving
            </span>
            <span v-else-if="showSaved" class="flex items-center gap-1">
              <CheckCircleIcon class="w-3 h-3 text-green-600" />
              Saved
            </span>
          </div>
        </div>

        <span v-if="nota?.updatedAt" class="text-xs text-muted-foreground">
          Last updated {{ formatDate(nota?.updatedAt) }}
        </span>
      </div>

      <Button variant="outline" class="flex items-center gap-2" @click="toggleConfigPage">
        <Cog6ToothIcon class="w-4 h-4" />
        {{ showConfigPage ? 'Hide Settings' : 'Settings' }}
      </Button>
    </header>

    <main class="flex-1 overflow-auto">
      <NotaEditor v-if="!showConfigPage" :nota-id="id" @saving="handleSaving" />
      <NotaConfigPage v-else :nota-id="id" />
    </main>
  </div>
</template>
