<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Upload,
  Eye,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'
import type { CitationEntry } from '@/features/nota/types/nota'
import { toast } from 'vue-sonner'
import { useReferenceBatchDialog } from '@/features/nota/composables/useReferenceBatchDialog'
import ReferencesPreviewTable from './ReferencesPreviewTable.vue'

const props = defineProps<{
  open: boolean
  notaId: string
  existingCitations: CitationEntry[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
  close: []
}>()

// Use batch dialog composable
const {
  bibtexInput,
  parsedEntries,
  isParsing,
  parseError,
  selectedCount,
  selectedEntries,
  isSaving,
  parseBatchBibTex,
  toggleSelection,
  selectAll,
  deselectAll,
  removeEntry,
  clearAll,
  saveBatch,
  validateEntry,
  validateAll,
  canSave,
  hasValidEntries
} = useReferenceBatchDialog(props.notaId, props.existingCitations)

// Watch for dialog open/close
watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    clearAll()
  }
})

// Handle save and emit events
const handleSave = async () => {
  try {
    await saveBatch()
    emit('saved')
    emit('update:open', false)
    emit('close')
  } catch (error) {
    // Error handling is done in saveBatch
  }
}

// Close dialog
const closeDialog = () => {
  emit('update:open', false)
  emit('close')
}

// Handle table events
const handleToggleSelection = (id: string) => {
  toggleSelection(id)
}

const handleRemoveEntry = (id: string) => {
  removeEntry(id)
}

const handleValidateEntry = (id: string) => {
  validateEntry(id)
}

const handleViewDetails = (entry: any) => {
  // Could open a detailed view modal in the future
  console.log('View details for:', entry)
}

// Enhanced parsing with feedback
const handleParseBibTex = async () => {
  if (!bibtexInput.value.trim()) {
    toast('Please paste BibTeX entries first')
    return
  }
  
  await parseBatchBibTex()
  
  if (parsedEntries.value.length > 0) {
    const validCount = parsedEntries.value.filter(e => e.isValid).length
    const totalCount = parsedEntries.value.length
    
    if (validCount === totalCount) {
      toast(`Successfully parsed ${totalCount} references`)
    } else {
      toast(`Parsed ${totalCount} entries (${validCount} valid, ${totalCount - validCount} with issues)`)
    }
  }
}

// Validate all entries
const handleValidateAll = async () => {
  if (parsedEntries.value.length === 0) {
    toast('No entries to validate')
    return
  }
  
  await validateAll()
  toast('Validation completed')
}

// Summary stats
const validEntriesCount = computed(() => 
  parsedEntries.value.filter(e => e.isValid).length
)

const invalidEntriesCount = computed(() => 
  parsedEntries.value.filter(e => !e.isValid).length
)

// Textarea collapse state
const isTextareaCollapsed = ref(false)

const toggleTextarea = () => {
  isTextareaCollapsed.value = !isTextareaCollapsed.value
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-7xl grid-rows-[auto_minmax(0,1fr)_auto] p-0 max-h-[90dvh]">
      <DialogHeader class="p-6 pb-0">
        <DialogTitle class="flex items-center gap-2">
          <FileText class="h-5 w-5" />
          Add References
        </DialogTitle>
        <DialogDescription>
          Paste multiple BibTeX entries to batch import references with validation
        </DialogDescription>
      </DialogHeader>
      
      <div class="overflow-y-auto px-6">
        <div class="py-4">
          <div :class="['grid gap-6', isTextareaCollapsed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2']">
            <!-- Left Side - BibTeX Input (Collapsible) -->
            <div v-if="!isTextareaCollapsed" class="space-y-4">
              <div class="flex items-center justify-between">
                <Label for="bibtex" class="text-sm font-semibold">
                  BibTeX Entries
                </Label>
                <div class="flex items-center gap-2">
                  <Button 
                    variant="ghost"
                    size="sm"
                    @click="toggleTextarea"
                    class="gap-2"
                  >
                    <ChevronLeft class="h-4 w-4" />
                    Collapse
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    @click="clearAll"
                    :disabled="parsedEntries.length === 0"
                    class="gap-2"
                  >
                    <Trash2 class="h-4 w-4" />
                    Clear All
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    @click="handleParseBibTex"
                    :disabled="isParsing || !bibtexInput.trim()"
                    class="gap-2"
                  >
                    <Loader2 v-if="isParsing" class="h-4 w-4 animate-spin" />
                    <Upload v-else class="h-4 w-4" />
                    {{ isParsing ? 'Parsing...' : 'Parse BibTeX' }}
                  </Button>
                </div>
              </div>
              
              <Textarea 
                id="bibtex" 
                v-model="bibtexInput" 
                placeholder="Paste multiple BibTeX entries here... (e.g., from Zotero, Mendeley, Google Scholar)"
                class="min-h-[400px] font-mono text-sm resize-none"
              />
              
              <!-- Parse Error Alert -->
              <Alert v-if="parseError" variant="destructive">
                <AlertCircle class="h-4 w-4" />
                <AlertDescription>
                  {{ parseError }}
                </AlertDescription>
              </Alert>
              
              <!-- Quick Help -->
              <div v-if="!bibtexInput.trim() && parsedEntries.length === 0" class="text-center py-8">
                <div class="text-muted-foreground space-y-2">
                  <Upload class="h-8 w-8 mx-auto opacity-50" />
                  <p class="text-sm">Paste BibTeX entries from your reference manager</p>
                  <p class="text-xs">Supports batch import from Zotero, Mendeley, Google Scholar, and more</p>
                </div>
              </div>
            </div>
            
            <!-- Collapsed Textarea Indicator -->
            <div v-if="isTextareaCollapsed" class="flex items-center justify-center">
              <Button 
                variant="outline"
                size="sm"
                @click="toggleTextarea"
                class="gap-2"
              >
                <ChevronRight class="h-4 w-4" />
                Show BibTeX Input
              </Button>
            </div>
            
            <!-- Right Side - Preview Section -->
            <div class="space-y-4">
              <div v-if="parsedEntries.length > 0">
              <!-- Preview Header -->
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <h3 class="text-lg font-semibold">Parsed References</h3>
                  <p class="text-sm text-muted-foreground">
                    Review and validate before importing
                  </p>
                </div>
                
                <div class="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="handleValidateAll"
                    :disabled="parsedEntries.every(e => e.validationStatus !== 'pending')"
                    class="gap-2"
                  >
                    <RefreshCw class="h-4 w-4" />
                    Validate All
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    @click="selectAll"
                    :disabled="parsedEntries.length === 0"
                    class="gap-2"
                  >
                    <CheckCircle2 class="h-4 w-4" />
                    Select All Valid
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    @click="deselectAll"
                    :disabled="selectedCount === 0"
                    class="gap-2"
                  >
                    <Eye class="h-4 w-4" />
                    Deselect All
                  </Button>
                </div>
              </div>
              
              <!-- Preview Table -->
              <div :class="['border rounded-lg overflow-auto', isTextareaCollapsed ? 'max-h-[600px]' : 'max-h-[400px]']">
                <ReferencesPreviewTable
                  :entries="parsedEntries"
                  @toggle-selection="handleToggleSelection"
                  @remove-entry="handleRemoveEntry"
                  @validate-entry="handleValidateEntry"
                  @view-details="handleViewDetails"
                  @select-all="(checked: boolean) => checked ? selectAll() : deselectAll()"
                />
              </div>
            </div>
            
              <!-- Empty state for right side -->
              <div v-else class="text-center py-12 text-muted-foreground">
                <FileText class="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p class="text-lg font-medium mb-2">No references parsed yet</p>
                <p class="text-sm">Paste BibTeX entries on the left to see preview here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <DialogFooter class="p-6 pt-0 border-t">
        <div class="flex items-center justify-between w-full">
          <!-- Stats -->
          <div v-if="parsedEntries.length > 0" class="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{{ parsedEntries.length }} parsed</span>
            <span>{{ selectedCount }} selected</span>
            <span v-if="validEntriesCount > 0" class="text-green-600">{{ validEntriesCount }} valid</span>
            <span v-if="invalidEntriesCount > 0" class="text-red-600">{{ invalidEntriesCount }} invalid</span>
          </div>
          <div v-else></div>
          
          <!-- Actions -->
          <div class="flex items-center gap-2">
            <Button variant="outline" @click="closeDialog">
              Cancel
            </Button>
            <Button 
              @click="handleSave" 
              :disabled="!canSave"
              class="gap-2"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <Plus v-else class="h-4 w-4" />
              {{ isSaving ? 'Adding...' : `Add ${selectedCount} Reference${selectedCount !== 1 ? 's' : ''}` }}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template> 