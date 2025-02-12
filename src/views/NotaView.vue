<script setup lang="ts">
import NotaEditor from '@/components/editor/NotaEditor.vue'
import NotaConfigPage from '@/components/NotaConfigPage.vue'
import { ref, onMounted, watch } from 'vue'
import { useNotaStore } from '@/stores/nota'
import { computed } from 'vue'
import { Cog6ToothIcon, CheckCircleIcon, ArrowPathIcon, StarIcon } from '@heroicons/vue/24/outline'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { ImageExtension } from '@/components/editor/extensions/ImageExtension'
import { TagsInput } from '@/components/ui/tags-input'
import TagsInputItem from '@/components/ui/tags-input/TagsInputItem.vue'
import TagsInputItemText from '@/components/ui/tags-input/TagsInputItemText.vue'
import TagsInputItemDelete from '@/components/ui/tags-input/TagsInputItemDelete.vue'
import TagsInputInput from '@/components/ui/tags-input/TagsInputInput.vue'

const props = defineProps<{
  id: string
}>()

const store = useNotaStore()
const isReady = ref(false)

const nota = computed(() => store.getCurrentNota(props.id))
const showConfigPage = ref(false)
const isSaving = ref(false)
const showSaved = ref(false)

// Add watch to save changes when tags are updated
watch(
  () => nota.value?.tags,
  async (newTags) => {
    if (nota.value && newTags) {
      await store.saveItem(nota.value)
    }
  },
)

onMounted(async () => {
  // Ensure the nota is loaded before showing the editor
  const loadedNota = await store.loadNota(props.id)
  if (loadedNota && !loadedNota.tags) {
    loadedNota.tags = []
    await store.saveItem(loadedNota)
  }
  isReady.value = true
})

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

// Add ImageExtension to additional extensions
const additionalExtensions = computed(() => [ImageExtension])
</script>

<template>
  <div class="flex flex-col flex-1 h-full overflow-hidden bg-background">
    <header class="flex items-center justify-between px-6 py-4 border-b">
      <div class="flex-1">
        <div class="flex items-center gap-3">
          <div class="flex-1 flex items-center gap-4">
            <h1 class="text-2xl font-semibold tracking-tight whitespace-nowrap">
              {{ nota?.title || 'Untitled' }}
            </h1>

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

            <!-- Tags moved here -->
            <TagsInput v-if="nota" v-model="nota.tags" class="w-full border-none">
              <TagsInputItem v-for="item in nota.tags" :key="item" :value="item">
                <TagsInputItemText />
                <TagsInputItemDelete />
              </TagsInputItem>

              <TagsInputInput placeholder="Enter Tags ..." />
            </TagsInput>
          </div>
        </div>

        <span v-if="nota?.updatedAt" class="text-xs text-muted-foreground mt-1">
          Last updated {{ formatDate(nota.updatedAt) }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          title="Star"
          @click="store.toggleFavorite(id)"
          v-if="nota"
        >
          <StarIcon
            class="w-5 h-5"
            :class="{ 'text-yellow-400 fill-yellow-400': nota?.favorite }"
          />
        </Button>

        <Button variant="ghost" size="icon" title="Settings" @click="toggleConfigPage" v-if="nota">
          <Cog6ToothIcon class="w-5 h-5" />
        </Button>
      </div>
    </header>

    <main class="flex-1 overflow-auto">
      <template v-if="isReady">
        <NotaEditor
          v-if="!showConfigPage && nota"
          :nota-id="id"
          @saving="handleSaving"
          :extensions="additionalExtensions"
        />
        <NotaConfigPage v-else-if="nota" :nota-id="id" />
      </template>
      <div v-else class="flex items-center justify-center h-full">
        <p class="text-muted-foreground">Loading...</p>
      </div>
    </main>
  </div>
</template>
