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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
const bibtexInput = ref('')
const validationErrors = ref({
  key: '',
  title: '',
  authors: '',
  year: ''
})
const isSaving = ref(false)

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

const activeTab = ref('fields')

// Watch for editor changes
watch(() => props.editor, (newEditor) => {
  if (newEditor) {
    // Initialize
  }
})

const openAddDialog = () => {
  isEditing.value = false
  resetForm()
  validationErrors.value = { key: '', title: '', authors: '', year: '' }
  showAddDialog.value = true
}

const openEditDialog = (citation: CitationEntry) => {
  isEditing.value = true
  currentCitation.value = citation
  validationErrors.value = { key: '', title: '', authors: '', year: '' }
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

const validateForm = () => {
  let isValid = true
  validationErrors.value = { key: '', title: '', authors: '', year: '' }
  
  if (!formData.value.key) {
    validationErrors.value.key = 'Citation key is required'
    isValid = false
  }
  
  if (!formData.value.title) {
    validationErrors.value.title = 'Title is required'
    isValid = false
  }
  
  if (!formData.value.authors) {
    validationErrors.value.authors = 'At least one author is required'
    isValid = false
  }
  
  if (!formData.value.year) {
    validationErrors.value.year = 'Year is required'
    isValid = false
  }
  
  return isValid
}

const saveCitation = async () => {
  if (!validateForm()) return
  
  try {
    isSaving.value = true
    
    // Small delay to show loading state
    await new Promise(r => setTimeout(r, 300))
    
    const authorsArray = formData.value.authors.split(',').map(author => author.trim()).filter(a => a)
    
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
  } finally {
    isSaving.value = false
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

// Parse a single BibTeX entry
const parseSingleBibTeX = (entry: string): any => {
  if (!entry.trim()) return null
  
  // Try to match the BibTeX entry pattern
  const typeKeyMatch = entry.match(/@(\w+)\s*[\{\(]\s*([^,]+)/)
  if (!typeKeyMatch) return null
  
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
  
  return {
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
}

// Extract multiple BibTeX entries from text
const extractBibEntries = (text: string): string[] => {
  if (!text || typeof text !== 'string') return []
  
  const entries: string[] = []
  let nestingLevel = 0
  let currentEntry = ''
  let inEntry = false
  
  try {
    // Improved parser that handles nested braces
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      
      if (char === '@' && !inEntry) {
        // Start of a new entry
        inEntry = true
        currentEntry = '@'
      } else if (inEntry) {
        currentEntry += char
        
        if (char === '{') nestingLevel++
        else if (char === '}') {
          nestingLevel--
          // End of entry when we reach the outer closing brace
          if (nestingLevel === 0) {
            entries.push(currentEntry)
            currentEntry = ''
            inEntry = false
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in BibTeX parsing:', error)
  }
  
  return entries
}

// Parse BibTeX text and handle multiple entries
const parseBibTeX = (bibtex: string) => {
  try {
    if (!bibtex || !bibtex.trim()) return
    
    const entries = extractBibEntries(bibtex)
    if (entries.length === 0) {
      toast('No valid BibTeX entries found')
      return
    }
    
    // For single entry, update the form directly
    if (entries.length === 1) {
      const parsedEntry = parseSingleBibTeX(entries[0])
      if (parsedEntry) {
        formData.value = parsedEntry
        toast('BibTeX entry parsed successfully')
        activeTab.value = 'fields' // Switch to fields tab after parsing
      } else {
        toast('Failed to parse BibTeX entry')
      }
      return
    }
    
    // For multiple entries, ask for confirmation
    if (confirm(`Found ${entries.length} BibTeX entries. Import all of them?`)) {
      let importedCount = 0
      
      entries.forEach(entry => {
        const parsedEntry = parseSingleBibTeX(entry)
        if (!parsedEntry) return
        
        // Add directly to citation store
        try {
          citationStore.addCitation({
            ...parsedEntry,
            authors: parsedEntry.authors.split(' and ').map((a: string) => a.trim()),
            notaId: props.notaId
          })
          importedCount++
        } catch (error) {
          console.error('Error importing citation:', error)
        }
      })
      
      toast(`Successfully imported ${importedCount} of ${entries.length} citations`)
      showAddDialog.value = false
    } else {
      // User declined multi-import, parse just the first entry for the form
      const parsedEntry = parseSingleBibTeX(entries[0])
      if (parsedEntry) {
        formData.value = parsedEntry
        toast('Only the first entry was parsed')
        activeTab.value = 'fields'
      }
    }
  } catch (error) {
    console.error('Error parsing BibTeX:', error)
    toast('Failed to parse BibTeX')
  }
}

// Handle BIB file upload and parsing
const handleBibFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    if (content) {
      parseBibTeX(content)
    }
  }
  reader.readAsText(file)
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
          class="p-3 rounded-md border border-border bg-card text-card-foreground shadow-sm hover:shadow transition-all"
        >
          <div class="flex items-start gap-1.5">
            <span class="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm shrink-0">
              [{{ index + 1 }}]
            </span>
            <span class="font-medium text-sm truncate">{{ citation.key }}</span>
          </div>
          
          <p class="text-sm font-medium mt-2 line-clamp-2">{{ citation.title }}</p>
          <p class="text-xs text-muted-foreground mt-1.5 truncate">
            {{ citation.authors.join(', ') }} ({{ citation.year }})
          </p>
          
          <div class="flex flex-wrap gap-2 mt-2">
            <span v-if="citation.journal" class="text-xs bg-muted px-1.5 py-0.5 rounded-sm text-muted-foreground truncate max-w-full">
              {{ citation.journal }}
            </span>
            <span v-if="citation.doi" class="text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-sm shrink-0">
              DOI
            </span>
          </div>
          
          <div class="flex justify-end gap-1 mt-3 pt-2 border-t border-border/50">
            <Button size="sm" variant="ghost" class="h-7 px-2" @click="insertCitation(citation)" title="Insert citation">
              <Plus class="h-3 w-3 mr-1" />
              <span class="text-xs">Cite</span>
            </Button>
            <Button size="icon" variant="ghost" class="h-7 w-7" @click="openEditDialog(citation)" title="Edit citation">
              <Edit class="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" class="h-7 w-7 text-destructive hover:text-destructive/90 hover:bg-destructive/10" @click="deleteCitation(citation)" title="Delete citation">
              <Trash2 class="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
    
    <!-- Add/Edit Citation Dialog -->
    <Dialog v-model:open="showAddDialog">
      <DialogContent class="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Edit Reference' : 'Add Reference' }}</DialogTitle>
          <DialogDescription>
            Fill out the citation details or import from BibTeX/BIB file.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs v-model:value="activeTab" class="w-full">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="fields">Manual Entry</TabsTrigger>
            <TabsTrigger value="bibtex">Import BibTeX</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bibtex" class="pt-4">
            <div class="bg-muted/30 rounded-lg p-4 border border-border">
              <h4 class="text-sm font-medium mb-3 flex items-center">
                <FileText class="h-4 w-4 mr-1.5 text-primary" />
                Import from BibTeX
              </h4>
              
              <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-2">
                  <Label>Paste BibTeX</Label>
                  <div class="flex gap-2">
                    <Textarea 
                      placeholder="@article{key1, title={...}, ...}
@book{key2, title={...}, ...}" 
                      rows="6"
                      v-model="bibtexInput"
                    />
                  </div>
                  <Button 
                    size="sm" 
                    class="self-end mt-1" 
                    @click="() => parseBibTeX(bibtexInput)"
                  >
                    Parse BibTeX
                  </Button>
                  <p class="text-xs text-muted-foreground mt-1">
                    Multiple BibTeX entries are supported - paste several entries and they'll all be imported at once.
                  </p>
                </div>
                
                <div class="flex flex-col gap-2 mt-2">
                  <Label>Or upload .bib file</Label>
                  <div class="flex flex-col gap-2">
                    <input
                      type="file"
                      accept=".bib"
                      class="w-full py-2 px-3 rounded-md border border-input"
                      @change="handleBibFileUpload"
                    />
                    <p class="text-xs text-muted-foreground">
                      BibTeX files can contain multiple entries - all entries will be detected and you'll be asked to confirm the import.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="fields" class="space-y-6 pt-4">
            <!-- Required fields -->
            <div>
              <h4 class="text-sm font-medium mb-2 text-primary">Required Fields</h4>
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <Label for="key">Citation Key*</Label>
                  <Input 
                    id="key" 
                    v-model="formData.key" 
                    placeholder="smith2020" 
                    required
                    :class="{ 'border-red-500 focus-visible:ring-red-500': validationErrors.key }"
                  />
                  <p v-if="validationErrors.key" class="text-xs text-red-500 mt-1">{{ validationErrors.key }}</p>
                </div>
                <div class="flex flex-col gap-2">
                  <Label for="year">Year*</Label>
                  <Input 
                    id="year" 
                    v-model="formData.year" 
                    placeholder="2020" 
                    required
                    :class="{ 'border-red-500 focus-visible:ring-red-500': validationErrors.year }"
                  />
                  <p v-if="validationErrors.year" class="text-xs text-red-500 mt-1">{{ validationErrors.year }}</p>
                </div>
              </div>
              
              <div class="flex flex-col gap-2 mt-3">
                <Label for="title">Title*</Label>
                <Input 
                  id="title" 
                  v-model="formData.title" 
                  placeholder="Title of the publication" 
                  required
                  :class="{ 'border-red-500 focus-visible:ring-red-500': validationErrors.title }"
                />
                <p v-if="validationErrors.title" class="text-xs text-red-500 mt-1">{{ validationErrors.title }}</p>
              </div>
              
              <div class="flex flex-col gap-2 mt-3">
                <Label for="authors">Authors* (comma-separated)</Label>
                <Input 
                  id="authors" 
                  v-model="formData.authors" 
                  placeholder="Smith, J., Doe, J." 
                  required
                  :class="{ 'border-red-500 focus-visible:ring-red-500': validationErrors.authors }"
                />
                <p v-if="validationErrors.authors" class="text-xs text-red-500 mt-1">{{ validationErrors.authors }}</p>
              </div>
            </div>
            
            <!-- Optional fields -->
            <div class="border-t border-border pt-4">
              <h4 class="text-sm font-medium mb-2 text-muted-foreground">Optional Fields</h4>
              
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
              
              <div class="grid grid-cols-3 gap-4 mt-3">
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
              
              <div class="grid grid-cols-2 gap-4 mt-3">
                <div class="flex flex-col gap-2">
                  <Label for="url">URL</Label>
                  <Input id="url" v-model="formData.url" placeholder="https://example.com" />
                </div>
                <div class="flex flex-col gap-2">
                  <Label for="doi">DOI</Label>
                  <Input id="doi" v-model="formData.doi" placeholder="10.1000/xyz123" />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" @click="showAddDialog = false">Cancel</Button>
          <Button type="submit" @click="saveCitation" :disabled="isSaving">
            <span v-if="isSaving" class="animate-spin mr-2">⟳</span>
            {{ isEditing ? 'Update' : 'Save' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template> 