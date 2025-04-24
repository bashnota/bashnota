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
import { useCitationStore } from '@/stores/citationStore'
import { BaseSidebar, SidebarSection, KeyboardShortcut } from '@/components/ui/sidebars'
import { useSidebarComposable } from '@/composables/useSidebarComposable'
import type { CitationEntry } from '@/types/nota'
import type { Editor } from '@tiptap/vue-3'
import { toast } from '@/lib/utils'
import { logger } from '@/services/logger'

const props = defineProps<{
  editor?: Editor
  notaId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const citationStore = useCitationStore()

// Use our sidebar composable for consistent behavior but without width settings
const { } = useSidebarComposable({
  id: 'references-sidebar',
  keyboard: {
    ctrl: true,
    shift: true,
    key: 'r'
  }
})

// References for the current nota
const notaCitations = computed(() => {
  return citationStore.getCitationsByNotaId(props.notaId)
})

// Search functionality
const searchQuery = ref('')
const filteredCitations = computed(() => {
  if (!searchQuery.value.trim()) {
    return notaCitations.value
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  return notaCitations.value.filter(citation => {
    return (
      (citation.title || '').toLowerCase().includes(query) ||
      citation.key.toLowerCase().includes(query) ||
      (citation.authors || []).some(author => author.toLowerCase().includes(query)) ||
      (citation.journal || '').toLowerCase().includes(query) ||
      (citation.publisher || '').toLowerCase().includes(query) ||
      (citation.year || '').toLowerCase().includes(query) ||
      (citation.doi || '').toLowerCase().includes(query)
    )
  })
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

// Parse BibTeX input and extract citation information
const parseBibTex = () => {
  if (!bibtexInput.value.trim()) {
    toast('Please enter BibTeX data')
    return
  }

  try {
    // Check if we have multiple entries by looking for multiple @article, @book, etc.
    const entries = bibtexInput.value.split(/(?=@\w+{)/g).filter(entry => entry.trim());
    
    if (entries.length > 1) {
      // Handle multiple entries
      handleMultipleEntries(entries);
      return;
    }
    
    // Process single entry
    const parsedEntry = parseSingleBibTexEntry(bibtexInput.value.trim());
    if (parsedEntry) {
      updateFormWithParsedData(parsedEntry);
      // Switch to fields tab to show the parsed data
      activeTab.value = 'fields';
      toast('BibTeX parsed successfully');
    }
  } catch (error) {
    console.error('Failed to parse BibTeX:', error);
    toast('Failed to parse BibTeX format. Please check your input.', 'destructive');
  }
}

// Parse a single BibTeX entry and return structured data
const parseSingleBibTexEntry = (bibTexString: string) => {
  const keyMatch = bibTexString.match(/@\w+{([^,]+),/);
  const titleMatch = bibTexString.match(/title\s*=\s*{([^}]+)}/);
  const authorMatch = bibTexString.match(/author\s*=\s*{([^}]+)}/);
  const yearMatch = bibTexString.match(/year\s*=\s*{(\d{4})}/);
  const journalMatch = bibTexString.match(/journal\s*=\s*{([^}]+)}/);
  const volumeMatch = bibTexString.match(/volume\s*=\s*{([^}]+)}/);
  const numberMatch = bibTexString.match(/number\s*=\s*{([^}]+)}/);
  const pagesMatch = bibTexString.match(/pages\s*=\s*{([^}]+)}/);
  const publisherMatch = bibTexString.match(/publisher\s*=\s*{([^}]+)}/);
  const urlMatch = bibTexString.match(/url\s*=\s*{([^}]+)}/);
  const doiMatch = bibTexString.match(/doi\s*=\s*{([^}]+)}/);
    
  // Create parsed data object
  const parsedData = {
    key: keyMatch ? keyMatch[1].trim() : '',
    title: titleMatch ? titleMatch[1].trim() : '',
    authors: authorMatch ? authorMatch[1].split(' and ')
      .map((author: string) => author.trim())
      .join(', ') : '',
    year: yearMatch ? yearMatch[1].trim() : '',
    journal: journalMatch ? journalMatch[1].trim() : '',
    volume: volumeMatch ? volumeMatch[1].trim() : '',
    number: numberMatch ? numberMatch[1].trim() : '',
    pages: pagesMatch ? pagesMatch[1].trim() : '',
    publisher: publisherMatch ? publisherMatch[1].trim() : '',
    url: urlMatch ? urlMatch[1].trim() : '',
    doi: doiMatch ? doiMatch[1].trim() : ''
  };
  
  return parsedData;
}

// Define interface for parsed data
interface ParsedBibTexData {
  key: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  volume: string;
  number: string;
  pages: string;
  publisher: string;
  url: string;
  doi: string;
}

// Update form with parsed BibTeX data
const updateFormWithParsedData = (parsedData: ParsedBibTexData) => {
  // Type-safe way to update form data
  formData.value.key = parsedData.key || formData.value.key;
  formData.value.title = parsedData.title || formData.value.title;
  formData.value.authors = parsedData.authors || formData.value.authors;
  formData.value.year = parsedData.year || formData.value.year;
  formData.value.journal = parsedData.journal || formData.value.journal;
  formData.value.volume = parsedData.volume || formData.value.volume;
  formData.value.number = parsedData.number || formData.value.number;
  formData.value.pages = parsedData.pages || formData.value.pages;
  formData.value.publisher = parsedData.publisher || formData.value.publisher;
  formData.value.url = parsedData.url || formData.value.url;
  formData.value.doi = parsedData.doi || formData.value.doi;
}

// Handle multiple BibTeX entries at once
const handleMultipleEntries = async (entries: string[]) => {
  const confirmMultiple = window.confirm(`Found ${entries.length} BibTeX entries. Do you want to import all of them?`);
  if (!confirmMultiple) return;
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const entry of entries) {
    try {
      const parsedData = parseSingleBibTexEntry(entry);
      if (!parsedData.key || !parsedData.title || !parsedData.authors || !parsedData.year) {
        failureCount++;
        continue; // Skip entries with missing required fields
      }
      
      // Check for duplicate keys
      if (notaCitations.value.some(c => c.key === parsedData.key)) {
        failureCount++;
        continue; // Skip entries with duplicate keys
      }
      
      // Convert authors string to array
      const authorsArray = parsedData.authors.split(',').map((author: string) => author.trim());
      
      // Create citation data
      const citationData = {
        notaId: props.notaId,
        key: parsedData.key,
        title: parsedData.title,
        authors: authorsArray,
        year: parsedData.year,
        journal: parsedData.journal,
        volume: parsedData.volume,
        number: parsedData.number,
        pages: parsedData.pages,
        publisher: parsedData.publisher,
        url: parsedData.url,
        doi: parsedData.doi
      };
      
      // Add citation
      await citationStore.addCitation(props.notaId, citationData);
      successCount++;
    } catch (error) {
      console.error('Failed to process BibTeX entry:', error);
      failureCount++;
    }
  }
  
  // Show results and close dialog
  toast(`Imported ${successCount} references${failureCount > 0 ? ` (${failureCount} failed)` : ''}`);
  showAddDialog.value = false;
  resetForm();
}

// Reset form
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
  bibtexInput.value = ''
  currentCitation.value = null
  validationErrors.value = {
    key: '',
    title: '',
    authors: '',
    year: ''
  }
  activeTab.value = 'fields'
}

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

const editCitation = (citation: CitationEntry) => {
  isEditing.value = true
  currentCitation.value = citation
  
  // Populate form data
  formData.value = {
    key: citation.key,
    title: citation.title || '',
    authors: Array.isArray(citation.authors) ? citation.authors.join(', ') : citation.authors || '',
    year: citation.year || '',
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

const validateForm = () => {
  let isValid = true
  validationErrors.value = {
    key: '',
    title: '',
    authors: '',
    year: ''
  }
  
  // Key is required and must be unique
  if (!formData.value.key.trim()) {
    validationErrors.value.key = 'Citation key is required'
    isValid = false
  } else if (!isEditing.value && notaCitations.value.some(c => c.key === formData.value.key.trim())) {
    validationErrors.value.key = 'Citation key must be unique'
    isValid = false
  } else if (isEditing.value && notaCitations.value.some(c => c.key === formData.value.key.trim() && c.id !== currentCitation.value?.id)) {
    validationErrors.value.key = 'Citation key must be unique'
    isValid = false
  }
  
  // Title is required
  if (!formData.value.title.trim()) {
    validationErrors.value.title = 'Title is required'
    isValid = false
  }
  
  // Authors is required
  if (!formData.value.authors.trim()) {
    validationErrors.value.authors = 'Authors is required'
    isValid = false
  }
  
  // Year is required and must be a number
  if (!formData.value.year.trim()) {
    validationErrors.value.year = 'Year is required'
    isValid = false
  } else if (!/^\d{4}$/.test(formData.value.year.trim())) {
    validationErrors.value.year = 'Year must be a 4-digit number'
    isValid = false
  }
  
  return isValid
}

const saveCitation = async () => {
  console.log('Save citation button clicked')
  
  if (!validateForm()) {
    console.log('Form validation failed', validationErrors.value)
    toast('Please fix the validation errors')
    return
  }
  
  isSaving.value = true
  
  try {
    console.log('Preparing citation data')
    const citationData = {
      notaId: props.notaId,
      key: formData.value.key.trim(),
      title: formData.value.title.trim(),
      authors: formData.value.authors.trim().split(',').map(author => author.trim()),
      year: formData.value.year.trim(),
      journal: formData.value.journal.trim(),
      volume: formData.value.volume.trim(),
      number: formData.value.number.trim(),
      pages: formData.value.pages.trim(),
      publisher: formData.value.publisher.trim(),
      url: formData.value.url.trim(),
      doi: formData.value.doi.trim()
    }
    
    console.log('Citation data prepared:', citationData)
    
    if (isEditing.value && currentCitation.value) {
      console.log('Updating existing citation')
      await citationStore.updateCitation(
        currentCitation.value.id,
        props.notaId,
        {
          ...currentCitation.value,
          ...citationData
        }
      )
      toast('Reference has been updated successfully')
    } else {
      // Add new citation
      console.log('Adding new citation')
      await citationStore.addCitation(props.notaId, citationData as Omit<CitationEntry, 'id' | 'createdAt'>)
      toast('Reference has been added successfully')
    }
    
    showAddDialog.value = false
    resetForm()
  } catch (error) {
    console.error('Failed to save citation:', error)
    logger.error('Failed to save citation:', error)
    toast('Failed to save reference')
  } finally {
    isSaving.value = false
  }
}

const deleteCitation = async (id: string) => {
  try {
    await citationStore.deleteCitation(props.notaId, id)
    toast('Reference has been deleted successfully')
  } catch (error) {
    logger.error('Failed to delete citation:', error)
    toast('Failed to delete reference')
  }
}

const insertCitation = (citation: CitationEntry) => {
  if (!props.editor) return
  
  // Find the citation index to determine its number
  const citations = citationStore.getCitationsByNotaId(props.notaId)
  const citationIndex = citations.findIndex(c => c.key === citation.key)
  
  // Use the citation extension to insert a proper citation node
  props.editor.chain().focus().insertContent({
    type: 'citation',
    attrs: {
      citationKey: citation.key,
      citationNumber: citationIndex + 1
    }
  }).run()
  
  toast(`Citation ${citation.key} has been inserted`)
}

// Format a citation according to academic style
const formatCitationDisplay = (citation: CitationEntry) => {
  if (!citation) return 'Citation not found'
  
  // Format authors for display
  const formatAuthors = (authors: string[]) => {
    if (!authors || authors.length === 0) return 'Unknown'
    if (authors.length === 1) return authors[0]
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}`
    return `${authors[0]} et al.`
  }

  const authorsFormatted = formatAuthors(citation.authors)
  let formatted = `${authorsFormatted} (${citation.year})`
  
  // Add journal or publisher info if available
  if (citation.journal) {
    formatted += `. ${citation.title}.`
    formatted += ` ${citation.journal}`
    if (citation.volume) {
      formatted += ` ${citation.volume}`
      if (citation.number) {
        formatted += `(${citation.number})`
      }
    }
    if (citation.pages) {
      formatted += `: ${citation.pages}`
    }
  } else {
    formatted += `. ${citation.title}.`
    if (citation.publisher) {
      formatted += ` ${citation.publisher}.`
    }
  }
  
  return formatted
}
</script>

<template>
  <BaseSidebar 
    id="references-sidebar"
    title="References" 
    :icon="BookIcon" 
    position="right" 
    @close="$emit('close')"
  >
    <template #actions>
      <Button 
        variant="ghost" 
        size="sm" 
        @click="openAddDialog"
      >
        <Plus class="h-3.5 w-3.5" />
      </Button>
    </template>
    
    <!-- References List -->
    <ScrollArea class="flex-1 w-full h-full">
      <div class="p-3 space-y-2">
        <!-- Search input -->
        <div class="mb-4">
          <Input 
            :value="searchQuery"
            @input="(e: Event) => searchQuery = (e.target as HTMLInputElement).value" 
            placeholder="Search references..." 
            class="w-full"
          />
        </div>

        <!-- No references message -->
        <div v-if="filteredCitations.length === 0" class="flex flex-col items-center justify-center py-8">
          <BookIcon class="h-12 w-12 text-muted-foreground/20 mb-4" />
          <h3 class="text-base font-medium mb-2">No References</h3>
          <p class="text-sm text-muted-foreground text-center mb-4">
            Add references to your document for citation.
          </p>
          <Button @click="openAddDialog" size="sm" class="shadow-sm">
            <Plus class="w-4 h-4 mr-2" />
            Add Reference
          </Button>
        </div>
        
        <!-- Citation list -->
        <div
          v-for="citation in filteredCitations"
          :key="citation.id"
          class="p-3 border rounded-md hover:border-primary transition-colors group"
        >
          <div class="flex justify-between items-start gap-2">
            <div class="flex-1 min-w-0">
              <h4 class="font-semibold text-sm mb-1 truncate">{{ citation.title || 'Untitled Reference' }}</h4>
              <div class="text-xs space-y-1">
                <p class="text-muted-foreground">{{ formatCitationDisplay(citation) }}</p>
              </div>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" class="h-7 w-7" @click="editCitation(citation)">
                <Edit class="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="h-7 w-7" @click="deleteCitation(citation.id)">
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          <!-- Links when available -->
          <div v-if="citation.doi || citation.url" class="flex flex-wrap gap-2 mt-2 text-xs text-blue-600">
            <a v-if="citation.doi" :href="`https://doi.org/${citation.doi}`" target="_blank" class="hover:underline">
              DOI: {{ citation.doi }}
            </a>
            <a v-if="citation.url" :href="citation.url" target="_blank" class="hover:underline truncate max-w-full">
              {{ citation.url }}
            </a>
          </div>
          
          <div class="flex justify-between items-center mt-2">
            <div class="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                class="h-7 text-xs"
                @click="insertCitation(citation)"
              >
                Insert
              </Button>
            </div>
            <div class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
              {{ citation.key }}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>

    <!-- Keyboard shortcut info -->
    <KeyboardShortcut 
      ctrl
      shift
      keyName="R" 
      action="toggle references"
    />

    <!-- Add/Edit Citation Dialog -->
    <Dialog :open="showAddDialog" @update:open="showAddDialog = $event">
      <DialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
        <!-- Dialog content remains the same -->
        <DialogHeader>
          <DialogTitle>{{ isEditing ? 'Edit Reference' : 'Add Reference' }}</DialogTitle>
          <DialogDescription>
            {{ isEditing ? 'Edit the details of your reference' : 'Add a new reference to your document' }}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs v-model="activeTab" class="w-full">
          <TabsList class="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="fields">Manual Entry</TabsTrigger>
            <TabsTrigger value="bibtex">BibTeX Import</TabsTrigger>
          </TabsList>
          
          <!-- Validation error message -->
          <div v-if="validationErrors.key || validationErrors.title || validationErrors.authors || validationErrors.year" 
               class="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
            <p class="font-medium text-sm">Please fill in the required fields:</p>
            <ul class="text-xs mt-1 list-disc list-inside">
              <li v-if="validationErrors.key">Citation Key is required</li>
              <li v-if="validationErrors.title">Title is required</li>
              <li v-if="validationErrors.authors">Authors is required</li>
              <li v-if="validationErrors.year">Year is required</li>
            </ul>
          </div>
          
          <TabsContent value="fields">
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <Label for="key">
                    Citation Key
                    <span class="text-destructive" v-if="validationErrors.key">*</span>
                  </Label>
                  <Input 
                    id="key" 
                    v-model="formData.key" 
                    placeholder="smith2023"
                    :class="{ 'border-destructive': validationErrors.key }"
                  />
                  <p v-if="validationErrors.key" class="text-xs text-destructive">
                    {{ validationErrors.key }}
                  </p>
                </div>
                <div class="flex flex-col gap-2">
                  <Label for="year">
                    Year
                    <span class="text-destructive" v-if="validationErrors.year">*</span>
                  </Label>
                  <Input 
                    id="year" 
                    v-model="formData.year" 
                    placeholder="2023" 
                    :class="{ 'border-destructive': validationErrors.year }"
                  />
                  <p v-if="validationErrors.year" class="text-xs text-destructive">
                    {{ validationErrors.year }}
                  </p>
                </div>
              </div>
              
              <div class="flex flex-col gap-2">
                <Label for="title">
                  Title
                  <span class="text-destructive" v-if="validationErrors.title">*</span>
                </Label>
                <Input 
                  id="title" 
                  v-model="formData.title" 
                  placeholder="The Title of the Paper or Book"
                  :class="{ 'border-destructive': validationErrors.title }"
                />
                <p v-if="validationErrors.title" class="text-xs text-destructive">
                  {{ validationErrors.title }}
                </p>
              </div>
              
              <div class="flex flex-col gap-2">
                <Label for="authors">
                  Authors
                  <span class="text-destructive" v-if="validationErrors.authors">*</span>
                </Label>
                <Input 
                  id="authors" 
                  v-model="formData.authors" 
                  placeholder="John Smith, Jane Doe"
                  :class="{ 'border-destructive': validationErrors.authors }"
                />
                <p v-if="validationErrors.authors" class="text-xs text-destructive">
                  {{ validationErrors.authors }}
                </p>
              </div>
              
              <div class="flex flex-col gap-2">
                <Label for="journal">Journal / Publisher</Label>
                <Input id="journal" v-model="formData.journal" placeholder="Journal of Science" />
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
            </div>
          </TabsContent>
          
          <TabsContent value="bibtex">
            <div class="space-y-4">
              <div class="flex flex-col gap-2">
                <Label for="bibtex">BibTeX</Label>
                <Textarea 
                  id="bibtex" 
                  v-model="bibtexInput" 
                  placeholder="Paste BibTeX entry here..."
                  class="min-h-[200px] font-mono text-sm"
                />
              </div>
              <div class="text-xs text-muted-foreground">
                <p>Paste a BibTeX entry to automatically fill in the citation details.</p>
                <p class="mt-1">Example:</p>
                <pre class="bg-muted p-2 rounded text-xs mt-1">@article{smith2023,
  author = {Smith, John and Doe, Jane},
  title = {Example Paper Title},
  journal = {Journal of Science},
  year = {2023},
  volume = {10},
  number = {2},
  pages = {123--145}
}</pre>
              </div>
              <Button 
                variant="outline" 
                @click="parseBibTex"
                class="mt-4"
              >
                Parse BibTeX
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" @click="showAddDialog = false">Cancel</Button>
          <Button 
            type="button" 
            @click="saveCitation" 
            :disabled="isSaving"
            class="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <span v-if="isSaving" class="animate-spin mr-2">⟳</span>
            {{ isEditing ? 'Update' : 'Save' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </BaseSidebar>
</template>