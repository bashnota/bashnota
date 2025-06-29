<script setup lang="ts">
import { ref, computed } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/dialog'
import { Button } from '@/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import { Textarea } from '@/ui/textarea'
import { Checkbox } from '@/ui/checkbox'
import { Label } from '@/ui/label'
import { generateCitation, type CitationFormat } from '@/lib/citation'
import { toast } from '@/lib/utils'
import { Copy, FileDown, FileCode } from 'lucide-vue-next'
import type { PublishedNota } from '@/features/nota/types/nota'

const props = defineProps<{
  nota: PublishedNota
  title?: string
  showTrigger?: boolean
}>()

const isOpen = ref(false)
const selectedFormat = ref<CitationFormat>('bibtex')
const includeAccessDate = ref(true)
const customCiteKey = ref('')
const copiedFormat = ref<string | null>(null)

// Generate the citation based on format
const generatedCitation = computed(() => {
  return generateCitation(props.nota, selectedFormat.value, {
    includeAccessDate: includeAccessDate.value,
    customCiteKey: customCiteKey.value || undefined
  })
})

// Copy citation to clipboard
const copyCitation = () => {
  navigator.clipboard
    .writeText(generatedCitation.value)
    .then(() => {
      toast('Citation copied to clipboard')
      copiedFormat.value = selectedFormat.value
      setTimeout(() => {
        copiedFormat.value = null
      }, 2000)
    })
    .catch(() => {
      toast('Failed to copy citation', '', 'destructive')
    })
}

// Download citation
const downloadCitation = () => {
  const blob = new Blob([generatedCitation.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `citation_${props.nota.title.replace(/\s+/g, '_').toLowerCase()}.${selectedFormat.value === 'bibtex' ? 'bib' : 'txt'}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast('Citation downloaded')
}

// Open dialog
const openDialog = () => {
  isOpen.value = true
  // Reset custom cite key when opening dialog
  customCiteKey.value = ''
}

// Close dialog
const closeDialog = () => {
  isOpen.value = false
}

// Define available citation formats
const citationFormats = [
  { value: 'bibtex', label: 'BibTeX' },
  { value: 'apa', label: 'APA', disabled: true },
  { value: 'mla', label: 'MLA', disabled: true },
  { value: 'chicago', label: 'Chicago', disabled: true }
]

// Determine if we should disable custom cite key based on format
const disableCustomCiteKey = computed(() => {
  return selectedFormat.value !== 'bibtex'
})

// Method for parent component to open the dialog
defineExpose({
  openDialog,
  closeDialog
})
</script>

<template>
  <Dialog 
    :open="isOpen" 
    @update:open="isOpen = $event"
  >
    <DialogTrigger v-if="showTrigger">
      <Button 
        variant="outline" 
        size="sm" 
        :title="title || 'Cite this nota'"
      >
        <FileCode class="mr-2 h-4 w-4" />
        {{ title || 'Cite' }}
      </Button>
    </DialogTrigger>

    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Cite this Nota</DialogTitle>
        <DialogDescription>
          Generate a citation for this published nota in your preferred format.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <Tabs 
          :default-value="selectedFormat" 
          @update:value="selectedFormat = $event as CitationFormat"
          class="w-full"
        >
          <TabsList class="mb-2 grid grid-cols-4">
            <TabsTrigger 
              v-for="format in citationFormats" 
              :key="format.value" 
              :value="format.value" 
              :disabled="format.disabled"
              class="text-xs"
            >
              {{ format.label }}
            </TabsTrigger>
          </TabsList>

          <TabsContent v-for="format in citationFormats" :key="format.value" :value="format.value">
            <div v-if="format.disabled" class="text-muted-foreground text-sm py-2">
              {{ format.label }} format coming soon.
            </div>
            <div v-else class="space-y-4">
              <div v-if="format.value === 'bibtex'" class="space-y-2">
                <div class="flex items-center space-x-2">
                  <Checkbox 
                    id="include-date" 
                    v-model:checked="includeAccessDate"
                  />
                  <Label for="include-date">Include access date</Label>
                </div>
                
                <div class="flex flex-col space-y-1.5">
                  <Label 
                    for="cite-key"
                    class="text-sm"
                  >
                    Custom cite key (optional)
                  </Label>
                  <div class="flex items-center gap-2">
                    <input
                      id="cite-key"
                      v-model="customCiteKey"
                      placeholder="e.g. smith2023"
                      class="flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                      :disabled="disableCustomCiteKey"
                    />
                  </div>
                </div>
              </div>

              <Textarea
                :value="generatedCitation"
                readonly
                rows="8"
                class="font-mono text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DialogFooter class="flex gap-2">
        <Button variant="outline" @click="downloadCitation">
          <FileDown class="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button @click="copyCitation">
          <Copy class="mr-2 h-4 w-4" />
          <span v-if="copiedFormat === selectedFormat">Copied!</span>
          <span v-else>Copy</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template> 







