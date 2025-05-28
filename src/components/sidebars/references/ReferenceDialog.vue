<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, Wand2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-vue-next'
import { useCitationStore } from '@/stores/citationStore'
import type { CitationEntry } from '@/types/nota'
import { toast } from '@/lib/utils'
import { useBibTexParser } from './composables/useBibTexParser'
import { useReferenceForm } from './composables/useReferenceForm'

const props = defineProps<{
  open: boolean
  isEditing: boolean
  currentCitation: CitationEntry | null
  notaId: string
  existingCitations: CitationEntry[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
  close: []
}>()

const citationStore = useCitationStore()
const activeTab = ref('fields')
const isSaving = ref(false)

// Use form composable
const {
  formData,
  validationErrors,
  validateForm,
  resetForm,
  populateForm
} = useReferenceForm(props.existingCitations, () => props.currentCitation)

// Use BibTeX parser composable
const {
  bibtexInput,
  parseBibTex,
  isParsing,
  parseError,
  clearBibTex
} = useBibTexParser((parsedData) => {
  populateForm(parsedData)
  activeTab.value = 'fields'
  toast('BibTeX parsed successfully')
})

// Watch for dialog open/close
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.isEditing && props.currentCitation) {
      populateForm(props.currentCitation)
    } else {
      resetForm()
    }
    activeTab.value = 'fields'
  }
})

// Save citation
const saveCitation = async () => {
  if (!validateForm()) {
    toast('Please fix the validation errors', 'destructive')
    return
  }
  
  isSaving.value = true
  
  try {
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
    
    if (props.isEditing && props.currentCitation) {
      await citationStore.updateCitation(
        props.currentCitation.id,
        props.notaId,
        {
          ...props.currentCitation,
          ...citationData
        }
      )
    } else {
      await citationStore.addCitation(props.notaId, citationData as Omit<CitationEntry, 'id' | 'createdAt'>)
    }
    
    emit('saved')
  } catch (error) {
    console.error('Failed to save citation:', error)
    toast('Failed to save reference', 'destructive')
  } finally {
    isSaving.value = false
  }
}

// Close dialog
const closeDialog = () => {
  emit('update:open', false)
  emit('close')
}

// Check if form has validation errors
const hasValidationErrors = computed(() => {
  return Object.values(validationErrors.value).some(error => error !== '')
})

// Get citation type from form data
const getCitationType = computed(() => {
  if (formData.value.journal) return 'Journal Article'
  if (formData.value.publisher) return 'Book'
  return 'Other'
})
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <FileText class="h-5 w-5" />
          {{ isEditing ? 'Edit Reference' : 'Add Reference' }}
        </DialogTitle>
        <DialogDescription>
          {{ isEditing ? 'Edit the details of your reference' : 'Add a new reference to your document' }}
        </DialogDescription>
      </DialogHeader>
      
      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="fields" class="flex items-center gap-2">
            <FileText class="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="bibtex" class="flex items-center gap-2">
            <Wand2 class="h-4 w-4" />
            BibTeX Import
          </TabsTrigger>
        </TabsList>
        
        <!-- Validation Errors Alert -->
        <Alert v-if="hasValidationErrors" variant="destructive" class="mb-6">
          <AlertCircle class="h-4 w-4" />
          <AlertDescription>
            <p class="font-medium mb-2">Please fix the following errors:</p>
            <ul class="text-sm space-y-1">
              <li v-if="validationErrors.key">• {{ validationErrors.key }}</li>
              <li v-if="validationErrors.title">• {{ validationErrors.title }}</li>
              <li v-if="validationErrors.authors">• {{ validationErrors.authors }}</li>
              <li v-if="validationErrors.year">• {{ validationErrors.year }}</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <TabsContent value="fields" class="space-y-6">
          <!-- Citation Type Badge -->
          <div v-if="formData.title" class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">Type:</span>
              <Badge variant="secondary">{{ getCitationType }}</Badge>
            </div>
          </div>
          
          <!-- Required Fields -->
          <div class="space-y-4">
            <h4 class="text-sm font-semibold text-foreground">Required Information</h4>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="key" class="flex items-center gap-1">
                  Citation Key
                  <span class="text-destructive">*</span>
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
              
              <div class="space-y-2">
                <Label for="year" class="flex items-center gap-1">
                  Year
                  <span class="text-destructive">*</span>
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
            
            <div class="space-y-2">
              <Label for="title" class="flex items-center gap-1">
                Title
                <span class="text-destructive">*</span>
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
            
            <div class="space-y-2">
              <Label for="authors" class="flex items-center gap-1">
                Authors
                <span class="text-destructive">*</span>
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
              <p class="text-xs text-muted-foreground">
                Separate multiple authors with commas
              </p>
            </div>
          </div>
          
          <Separator />
          
          <!-- Publication Details -->
          <div class="space-y-4">
            <h4 class="text-sm font-semibold text-foreground">Publication Details</h4>
            
            <div class="space-y-2">
              <Label for="journal">Journal / Publisher</Label>
              <Input 
                id="journal" 
                v-model="formData.journal" 
                placeholder="Journal of Science or Publisher Name" 
              />
            </div>
            
            <div class="grid grid-cols-3 gap-4">
              <div class="space-y-2">
                <Label for="volume">Volume</Label>
                <Input id="volume" v-model="formData.volume" placeholder="10" />
              </div>
              <div class="space-y-2">
                <Label for="number">Issue/Number</Label>
                <Input id="number" v-model="formData.number" placeholder="2" />
              </div>
              <div class="space-y-2">
                <Label for="pages">Pages</Label>
                <Input id="pages" v-model="formData.pages" placeholder="123-145" />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <!-- Links & Identifiers -->
          <div class="space-y-4">
            <h4 class="text-sm font-semibold text-foreground">Links & Identifiers</h4>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="doi">DOI</Label>
                <Input 
                  id="doi" 
                  v-model="formData.doi" 
                  placeholder="10.1000/xyz123" 
                />
              </div>
              <div class="space-y-2">
                <Label for="url">URL</Label>
                <Input 
                  id="url" 
                  v-model="formData.url" 
                  placeholder="https://example.com" 
                />
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="bibtex" class="space-y-6">
          <!-- Parse Error Alert -->
          <Alert v-if="parseError" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>
              {{ parseError }}
            </AlertDescription>
          </Alert>
          
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <Label for="bibtex" class="text-sm font-semibold">BibTeX Entry</Label>
              <Button 
                variant="default" 
                size="sm" 
                @click="parseBibTex"
                :disabled="isParsing || !bibtexInput.trim()"
                class="gap-2"
              >
                <Loader2 v-if="isParsing" class="h-4 w-4 animate-spin" />
                <Wand2 v-else class="h-4 w-4" />
                {{ isParsing ? 'Parsing...' : 'Parse BibTeX' }}
              </Button>
            </div>
            
            <Textarea 
              id="bibtex" 
              v-model="bibtexInput" 
              placeholder="Paste your BibTeX entry here..."
              class="min-h-[200px] font-mono text-sm"
            />
          </div>
          
          <!-- Help Section -->
          <Alert>
            <CheckCircle2 class="h-4 w-4" />
            <AlertDescription>
              <div class="space-y-3">
                <p class="font-medium">How to use BibTeX import:</p>
                <ol class="text-sm space-y-1 ml-4 list-decimal">
                  <li>Copy BibTeX from your reference manager (Zotero, Mendeley, etc.)</li>
                  <li>Paste it in the text area above</li>
                  <li>Click "Parse BibTeX" to extract the data</li>
                  <li>Review and edit in the Manual Entry tab</li>
                  <li>Save to add the reference</li>
                </ol>
                
                <div class="mt-4">
                  <p class="text-sm font-medium mb-2">Example BibTeX format:</p>
                  <pre class="bg-muted p-3 rounded text-xs overflow-x-auto">@article{smith2023,
  author = {Smith, John and Doe, Jane},
  title = {Example Paper Title},
  journal = {Journal of Science},
  year = {2023},
  volume = {10},
  number = {2},
  pages = {123--145},
  doi = {10.1000/xyz123}
}</pre>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
      
      <DialogFooter class="gap-2">
        <Button variant="outline" @click="closeDialog">
          Cancel
        </Button>
        <Button 
          @click="saveCitation" 
          :disabled="isSaving || hasValidationErrors"
          class="gap-2"
        >
          <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
          {{ isEditing ? 'Update Reference' : 'Add Reference' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template> 