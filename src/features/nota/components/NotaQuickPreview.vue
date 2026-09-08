<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertCircle, CalendarDays, ExternalLink, FileText, Loader2 } from 'lucide-vue-next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import NotaContentViewer from '@/features/editor/components/NotaContentViewer.vue'
import { useBlockStore } from '@/features/nota/stores/blockStore'
import type { Nota } from '@/features/nota/types/nota'
import type { CloudPublishedContent } from '@/services/cloud/types'

const props = defineProps<{
  open: boolean
  nota: Nota | null
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'open-nota', nota: Nota): void
}>()

const blockStore = useBlockStore()
const content = ref<CloudPublishedContent | null>(null)
const isLoading = ref(false)
const loadError = ref<string | null>(null)
let requestGeneration = 0

const formattedUpdatedAt = computed(() => {
  if (!props.nota) return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(props.nota.updatedAt))
})

const isEmpty = computed(() => {
  const nodes = content.value?.content
  return Array.isArray(nodes) && nodes.length === 0
})

const loadPreview = async () => {
  const nota = props.nota
  const generation = ++requestGeneration

  content.value = null
  loadError.value = null
  if (!props.open || !nota) return

  isLoading.value = true
  try {
    await blockStore.loadNotaBlocks(nota.id, nota)
    const nextContent = blockStore.getTiptapContent(nota.id) as CloudPublishedContent | null
    if (generation === requestGeneration) content.value = nextContent
  } catch (error) {
    if (generation === requestGeneration) {
      loadError.value = error instanceof Error ? error.message : 'The preview could not be loaded.'
    }
  } finally {
    if (generation === requestGeneration) isLoading.value = false
  }
}

watch(
  [() => props.open, () => props.nota?.id],
  () => void loadPreview(),
  { immediate: true },
)

const handleOpenNota = () => {
  if (!props.nota) return
  emit('open-nota', props.nota)
  emit('update:open', false)
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      side="right"
      class="flex h-full w-full flex-col gap-0 p-0 sm:max-w-2xl"
      data-testid="nota-quick-preview"
    >
      <SheetHeader class="shrink-0 border-b px-5 py-5 pr-16 text-left sm:px-6">
        <div class="flex min-w-0 items-start gap-3">
          <div class="mt-0.5 rounded-lg border bg-muted/40 p-2">
            <FileText aria-hidden="true" class="h-4 w-4 text-muted-foreground" />
          </div>
          <div class="min-w-0 flex-1">
            <SheetTitle class="break-words text-xl">{{ nota?.title || 'Nota preview' }}</SheetTitle>
            <SheetDescription class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span class="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" class="h-3.5 w-3.5" />
                Updated {{ formattedUpdatedAt }}
              </span>
              <span>{{ nota?.tags.length || 0 }} tags</span>
            </SheetDescription>
          </div>
        </div>

        <div v-if="nota?.tags.length" class="flex flex-wrap gap-1.5 pt-3">
          <Badge v-for="tag in nota.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
        </div>
      </SheetHeader>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div v-if="isLoading" class="flex min-h-72 flex-col items-center justify-center gap-3 p-6">
          <Loader2 aria-hidden="true" class="h-6 w-6 animate-spin text-muted-foreground" />
          <p class="text-sm text-muted-foreground">Loading preview…</p>
        </div>

        <div v-else-if="loadError" class="p-5 sm:p-6">
          <Alert variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>
              Preview unavailable: {{ loadError }}
            </AlertDescription>
          </Alert>
        </div>

        <div v-else-if="isEmpty" class="flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <div class="rounded-full border bg-muted/40 p-3">
            <FileText aria-hidden="true" class="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 class="mt-4 font-semibold">This nota is empty</h3>
          <p class="mt-1 max-w-sm text-sm text-muted-foreground">
            Open it in the editor to start writing.
          </p>
        </div>

        <NotaContentViewer
          v-else-if="content"
          :content="content"
          :citations="nota?.citations"
          readonly
        />
      </div>

      <SheetFooter class="shrink-0 border-t bg-background px-5 py-4 sm:px-6">
        <Button class="min-h-11 w-full sm:w-auto" @click="handleOpenNota">
          Open in editor
          <ExternalLink aria-hidden="true" class="ml-2 h-4 w-4" />
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
