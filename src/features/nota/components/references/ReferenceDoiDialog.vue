<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCitationStore } from '@/features/editor/stores/citationStore'
import type { CitationEntry } from '@/features/nota/types/nota'

interface CrossrefMessage {
  DOI?: string
  URL?: string
  title?: string[]
  author?: Array<{ given?: string; family?: string }>
  published?: { 'date-parts'?: number[][] }
  'published-print'?: { 'date-parts'?: number[][] }
  'published-online'?: { 'date-parts'?: number[][] }
  'container-title'?: string[]
  volume?: string
  issue?: string
  page?: string
  publisher?: string
}

const props = defineProps<{
  open: boolean
  notaId: string
  existingCitations: CitationEntry[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [citation: CitationEntry]
}>()

const citationStore = useCitationStore()
const doi = ref('')
const errorMessage = ref('')
const isLookingUp = ref(false)
const isSaving = ref(false)
const result = ref<Omit<CitationEntry, 'id' | 'createdAt'> | null>(null)
const doiInput = ref<InstanceType<typeof Input> | null>(null)

const normalizedDoi = computed(() =>
  doi.value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, ''),
)

const reset = () => {
  doi.value = ''
  errorMessage.value = ''
  isLookingUp.value = false
  isSaving.value = false
  result.value = null
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      reset()
      return
    }
    await nextTick()
    const element = doiInput.value?.$el as HTMLInputElement | undefined
    element?.focus()
  },
  { immediate: true },
)

const citationKey = (message: CrossrefMessage, year: string) => {
  const family = message.author?.[0]?.family || 'reference'
  const base = `${family}${year}`.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'reference'
  const keys = new Set(props.existingCitations.map((citation) => citation.key))
  if (!keys.has(base)) return base
  let suffix = 2
  while (keys.has(`${base}${suffix}`)) suffix += 1
  return `${base}${suffix}`
}

const lookup = async () => {
  errorMessage.value = ''
  result.value = null
  if (!/^10\.\d{4,9}\/\S+$/i.test(normalizedDoi.value)) {
    errorMessage.value = 'Enter a valid DOI, such as 10.1000/example.'
    return
  }

  isLookingUp.value = true
  try {
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(normalizedDoi.value)}`,
      { headers: { Accept: 'application/json' } },
    )
    if (response.status === 404) throw new Error('Crossref could not find that DOI.')
    if (!response.ok) throw new Error(`Crossref lookup failed (${response.status}).`)

    const payload = (await response.json()) as { message?: CrossrefMessage }
    const message = payload.message
    const title = message?.title?.[0]?.trim()
    const authors = message?.author
      ?.map(({ given, family }) => [given, family].filter(Boolean).join(' ').trim())
      .filter(Boolean)
    const dateParts =
      message?.published?.['date-parts'] ??
      message?.['published-print']?.['date-parts'] ??
      message?.['published-online']?.['date-parts']
    const year = dateParts?.[0]?.[0]?.toString() ?? ''
    if (!message || !title || !authors?.length || !year) {
      throw new Error(
        'Crossref returned incomplete citation details. Enter this reference manually.',
      )
    }

    result.value = {
      key: citationKey(message, year),
      title,
      authors,
      year,
      journal: message['container-title']?.[0] ?? '',
      volume: message.volume ?? '',
      number: message.issue ?? '',
      pages: message.page ?? '',
      publisher: message.publisher ?? '',
      doi: message.DOI ?? normalizedDoi.value,
      url: `https://doi.org/${normalizedDoi.value}`,
    } as Omit<CitationEntry, 'id' | 'createdAt'>
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'DOI lookup failed. Check your connection and retry.'
  } finally {
    isLookingUp.value = false
  }
}

const save = async () => {
  if (!result.value || isSaving.value) return
  isSaving.value = true
  try {
    const citation = await citationStore.addCitation(props.notaId, result.value)
    if (!citation) throw new Error('The reference could not be saved to this nota.')
    emit('saved', citation)
    emit('update:open', false)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save reference.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-xl">
      <DialogHeader>
        <DialogTitle>Look up a DOI</DialogTitle>
        <DialogDescription>
          Paste a DOI or doi.org link. BashNota fetches the publication details from Crossref.
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="lookup">
        <div class="space-y-2">
          <Label for="reference-doi">DOI</Label>
          <Input
            id="reference-doi"
            ref="doiInput"
            v-model="doi"
            autocomplete="off"
            placeholder="10.1000/example"
            :aria-invalid="Boolean(errorMessage)"
            :aria-describedby="errorMessage ? 'reference-doi-error' : undefined"
          />
        </div>
        <Button type="submit" :disabled="isLookingUp || !doi.trim()">
          <Loader2 v-if="isLookingUp" class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {{ isLookingUp ? 'Looking up…' : 'Look up DOI' }}
        </Button>
      </form>

      <Alert v-if="errorMessage" id="reference-doi-error" variant="destructive" role="alert">
        <AlertCircle class="h-4 w-4" aria-hidden="true" />
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <div v-if="result" class="rounded-md border p-4" role="status" aria-live="polite">
        <div class="flex items-start gap-3">
          <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div class="min-w-0">
            <p class="font-medium">{{ result.title }}</p>
            <p class="mt-1 text-sm text-muted-foreground">{{ result.authors.join(', ') }}</p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ result.journal || 'Publication' }} · {{ result.year }} · {{ result.doi }}
            </p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" @click="$emit('update:open', false)">Cancel</Button>
        <Button type="button" :disabled="!result || isSaving" @click="save">
          <Loader2 v-if="isSaving" class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {{ isSaving ? 'Adding…' : 'Add reference' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
