<script setup lang="ts">
import { BookOpen, FileText, Fingerprint } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

defineProps<{ open: boolean }>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [method: 'manual' | 'bibtex' | 'doi']
}>()

const selectMethod = (method: 'manual' | 'bibtex' | 'doi') => {
  emit('update:open', false)
  emit('select', method)
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add a reference</DialogTitle>
        <DialogDescription>Choose the quickest source for this reference.</DialogDescription>
      </DialogHeader>

      <div class="grid gap-2" aria-label="Reference source">
        <Button
          type="button"
          variant="outline"
          class="h-auto justify-start gap-3 p-4 text-left"
          @click="selectMethod('manual')"
        >
          <FileText class="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            <span class="block font-medium">Enter manually</span>
            <span class="block text-xs font-normal text-muted-foreground">
              Add title, authors, year, and publication details.
            </span>
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          class="h-auto justify-start gap-3 p-4 text-left"
          @click="selectMethod('doi')"
        >
          <Fingerprint class="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            <span class="block font-medium">Look up a DOI</span>
            <span class="block text-xs font-normal text-muted-foreground">
              Fetch verified publication details from Crossref.
            </span>
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          class="h-auto justify-start gap-3 p-4 text-left"
          @click="selectMethod('bibtex')"
        >
          <BookOpen class="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            <span class="block font-medium">Import BibTeX</span>
            <span class="block text-xs font-normal text-muted-foreground">
              Paste one or many entries from a reference manager.
            </span>
          </span>
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
