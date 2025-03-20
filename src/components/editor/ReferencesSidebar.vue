<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileText, BookIcon, Plus, Trash2, Edit } from 'lucide-vue-next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCitationStore, type CitationEntry } from '@/stores/citationStore'
import type { Editor } from '@tiptap/vue-3'
import { toast } from '@/lib/utils'

const props = defineProps<{
  editor?: Editor
  notaId: string
}>()

const citationStore = useCitationStore()

// References for the current nota
const notaCitations = computed(() => {
  return citationStore.getCitationsByNotaId(props.notaId)
})

// Dialog state
const showAddDialog = ref(false)
const isEditing = ref(false)
const currentCitation = ref<CitationEntry | null>(null)

// Form data
const formData = ref({
  key: '',
  title: '',
  authors: '',
  year: '',
  journal: '',
  volume: '',
  number: '',
  pages: '',
  publisher: '',
  url: '',
  doi: ''
})

// Watch for editor changes
watch(() => props.editor, (newEditor) => {
  if (newEditor) {
    // Initialize
  }
})

const openAddDialog = () => {
  isEditing.value = false
  resetForm()
  showAddDialog.value = true
}

const openEditDialog = (citation: CitationEntry) => {
  isEditing.value = true
  currentCitation.value = citation
  formData.value = {
    key: citation.key,
    title: citation.title,
    authors: citation.authors.join(', '),
    year: citation.year,
    journal: citation.journal || '',
    volume: citation.volume || '',
    number: citation.number || '',
    pages: citation.pages || '',
    publisher: citation.publisher || '',
    url: citation.url || '',
    doi: citation.doi || ''
  }
  showAddDialog.value = true
}

const resetForm = () => {
  formData.value = {
    key: '',
    title: '',
    authors: '',
    year: '',
    journal: '',
    volume: '',
    number: '',
    pages: '',
    publisher: '',
    url: '',
    doi: ''
  }
}

const saveCitation = () => {
  try {
    // Validate required fields
    if (!formData.value.key || !formData.value.title || !formData.value.authors || !formData.value.year) {
      toast('Please fill out all required fields')
      return
    }

    const authorsArray = formData.value.authors.split(',').map(author => author.trim())
    
    if (isEditing.value && currentCitation.value) {
      // Update existing citation
      citationStore.updateCitation(currentCitation.value.id, {
        key: formData.value.key,
        title: formData.value.title,
        authors: authorsArray,
        year: formData.value.year,
        journal: formData.value.journal || undefined,
        volume: formData.value.volume || undefined,
        number: formData.value.number || undefined,
        pages: formData.value.pages || undefined,
        publisher: formData.value.publisher || undefined,
        url: formData.value.url || undefined,
        doi: formData.value.doi || undefined
      })
      toast('Citation updated')
    } else {
      // Add new citation
      citationStore.addCitation({
        key: formData.value.key,
        title: formData.value.title,
        authors: authorsArray,
        year: formData.value.year,
        journal: formData.value.journal || undefined,
        volume: formData.value.volume || undefined,
        number: formData.value.number || undefined,
        pages: formData.value.pages || undefined,
        publisher: formData.value.publisher || undefined,
        url: formData.value.url || undefined,
        doi: formData.value.doi || undefined,
        notaId: props.notaId
      })
      toast('Citation added')
    }
    
    showAddDialog.value = false
    resetForm()
  } catch (error) {
    console.error('Error saving citation:', error)
    toast('Failed to save citation')
  }
}

const deleteCitation = (citation: CitationEntry) => {
  if (confirm(`Are you sure you want to delete the citation "${citation.title}"?`)) {
    citationStore.deleteCitation(citation.id)
    toast('Citation deleted')
  }
}

const insertCitation = (citation: CitationEntry) => {
  if (!props.editor) return
  
  // Insert citation at current cursor position
  props.editor.chain().focus().insertContent({
    type: 'citation',
    attrs: {
      citationKey: citation.key,
      citationNumber: getOrderNumber(citation)
    }
  }).run()
  
  toast(`Citation [${citation.key}] inserted`)
}

// Get order number for a citation (based on the order in the array)
const getOrderNumber = (citation: CitationEntry): number => {
  return notaCitations.value.findIndex(c => c.id === citation.id) + 1
}

const parseBibTeX = (bibtex: string) => {
  // A more robust BibTeX parser
  try {
    const entry = bibtex.trim()
    if (!entry) return
    
    // Try to match the BibTeX entry pattern
    // This handles both @type{key, fields...} and @type(key, fields...)
    const typeKeyMatch = entry.match(/@(\w+)\s*[\{\(]\s*([^,]+)/)
    if (!typeKeyMatch) {
      console.warn('Invalid BibTeX format - could not extract type and key')
      return
    }
    
    const key = typeKeyMatch[2].trim()
    
    // Function to extract field value with various formats
    const extractField = (fieldName: string): string => {
      // Match both {value} and "value" formats
      const patterns = [
        new RegExp(`${fieldName}\\s*=\\s*{([^}]*)}`, 'i'),
        new RegExp(`${fieldName}\\s*=\\s*"([^"]*)"`, 'i'),
        new RegExp(`${fieldName}\\s*=\\s*([^,}\\s]*)`, 'i')
      ]
      
      for (const pattern of patterns) {
        const match = entry.match(pattern)
        if (match && match[1]) {
          return match[1].trim()
        }
      }
      return ''
    }
    
    formData.value = {
      key,
      title: extractField('title'),
      authors: extractField('author'),
      year: extractField('year'),
      journal: extractField('journal'),
      volume: extractField('volume'),
      number: extractField('number'),
      pages: extractField('pages'),
      publisher: extractField('publisher'),
      url: extractField('url'),
      doi: extractField('doi')
    }
    
    toast('BibTeX parsed successfully')
  } catch (error) {
    console.error('Error parsing BibTeX:', error)
    toast('Failed to parse BibTeX')
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div class="flex flex-col gap-2 sticky top-0 z-10 bg-background">
      <div class="flex items-center gap-2 px-2">
        <BookIcon class="w-4 h-4 text-primary" />
        <h3 class="font-semibold">References</h3>
      </div>
      <Separator class="w-full" />
    </div>
    
    <!-- Add Reference Button -->
    <Button 
      variant="outline" 
      size="sm" 
      class="gap-1 self-start ml-2"
      @click="openAddDialog"
    >
      <Plus class="w-3 h-3" />
      <span>Add Reference</span>
    </Button>

    <ScrollArea class="flex-1">
      <div v-if="notaCitations.length === 0" class="px-4 py-8 text-center">
        <BookIcon class="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
        <p class="text-sm font-medium text-muted-foreground">No references found</p>
        <p class="text-xs text-muted-foreground/80 mt-1">
          Add references to cite them in your document
        </p>
      </div>

      <div v-else class="flex flex-col gap-2 px-2">
        <div 
          v-for="(citation, index) in notaCitations" 
          :key="citation.id"
          class="p-2 rounded-md border hover:bg-muted transition-colors"
        >
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-1">
              <span class="text-xs font-medium text-primary bg-primary/10 px-1 py-0.5 rounded">
                [{{ index + 1 }}]
              </span>
              <span class="font-medium">{{ citation.key }}</span>
            </div>
            <div class="flex gap-1">
              <Button size="icon" variant="ghost" class="h-6 w-6" @click="insertCitation(citation)">
                <Plus class="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" class="h-6 w-6" @click="openEditDialog(citation)">
                <Edit class="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" class="h-6 w-6" @click="deleteCitation(citation)">
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p class="text-sm mt-1">{{ citation.title }}</p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ citation.authors.join(', ') }} ({{ citation.year }})
          </p>
          <p v-if="citation.journal" class="text-xs italic text-muted-foreground mt-0.5">
            {{ citation.journal }} 
            <template v-if="citation.volume">{{ citation.volume }}</template>
            <template v-if="citation.number">({{ citation.number }})</template>
            <template v-if="citation.pages">: {{ citation.pages }}</template>
          </p>
        </div>
      </div>
    </ScrollArea>
    
    <!-- Add/Edit Citation Dialog -->
    <Dialog v-model:open="showAddDialog">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Edit Reference' : 'Add Reference' }}</DialogTitle>
          <DialogDescription>
            Fill out the citation details or paste a BibTeX entry below.
          </DialogDescription>
        </DialogHeader>
        
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <Label for="key">Citation Key*</Label>
              <Input id="key" v-model="formData.key" placeholder="smith2020" />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="year">Year*</Label>
              <Input id="year" v-model="formData.year" placeholder="2020" />
            </div>
          </div>
          
          <div class="flex flex-col gap-2">
            <Label for="title">Title*</Label>
            <Input id="title" v-model="formData.title" placeholder="Title of the publication" />
          </div>
          
          <div class="flex flex-col gap-2">
            <Label for="authors">Authors* (comma-separated)</Label>
            <Input id="authors" v-model="formData.authors" placeholder="Smith, J., Doe, J." />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <Label for="journal">Journal/Source</Label>
              <Input id="journal" v-model="formData.journal" placeholder="Journal name" />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="publisher">Publisher</Label>
              <Input id="publisher" v-model="formData.publisher" placeholder="Publisher name" />
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col gap-2">
              <Label for="volume">Volume</Label>
              <Input id="volume" v-model="formData.volume" placeholder="10" />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="number">Number</Label>
              <Input id="number" v-model="formData.number" placeholder="2" />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="pages">Pages</Label>
              <Input id="pages" v-model="formData.pages" placeholder="123-145" />
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <Label for="url">URL</Label>
              <Input id="url" v-model="formData.url" placeholder="https://example.com" />
            </div>
            <div class="flex flex-col gap-2">
              <Label for="doi">DOI</Label>
              <Input id="doi" v-model="formData.doi" placeholder="10.1000/xyz123" />
            </div>
          </div>
          
          <div class="flex flex-col gap-2">
            <Label>Or paste BibTeX</Label>
            <Textarea 
              placeholder="@article{key, title={...}, ...}" 
              rows="4"
              @input="(e: Event) => parseBibTeX((e.target as HTMLTextAreaElement).value)"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="showAddDialog = false">Cancel</Button>
          <Button type="submit" @click="saveCitation">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template> 