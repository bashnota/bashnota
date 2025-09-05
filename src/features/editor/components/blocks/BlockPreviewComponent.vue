<template>
  <div class="block-preview-component space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Block Preview</h3>
        <p class="text-sm text-muted-foreground">
          Review and validate blocks before inserting them into your document
        </p>
      </div>
      
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          @click="refreshPreview"
          :disabled="isProcessing"
        >
          <RefreshCw class="h-4 w-4 mr-2" />
          Refresh
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          @click="toggleViewMode"
        >
          <component :is="viewMode === 'list' ? Grid3X3 : List" class="h-4 w-4 mr-2" />
          {{ viewMode === 'list' ? 'Grid' : 'List' }}
        </Button>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="parsingResult" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card class="p-4">
        <div class="flex items-center gap-2">
          <FileText class="h-5 w-5 text-blue-500" />
          <div>
            <p class="text-2xl font-bold">{{ parsingResult.metadata.totalLines }}</p>
            <p class="text-xs text-muted-foreground">Total Lines</p>
          </div>
        </div>
      </Card>
      
      <Card class="p-4">
        <div class="flex items-center gap-2">
          <Blocks class="h-5 w-5 text-green-500" />
          <div>
            <p class="text-2xl font-bold">{{ parsingResult.metadata.validBlocks }}</p>
            <p class="text-xs text-muted-foreground">Valid Blocks</p>
          </div>
        </div>
      </Card>
      
      <Card class="p-4">
        <div class="flex items-center gap-2">
          <AlertTriangle class="h-5 w-5 text-yellow-500" />
          <div>
            <p class="text-2xl font-bold">{{ parsingResult.metadata.invalidBlocks }}</p>
            <p class="text-xs text-muted-foreground">Invalid Blocks</p>
          </div>
        </div>
      </Card>
      
      <Card class="p-4">
        <div class="flex items-center gap-2">
          <CheckCircle class="h-5 w-5 text-blue-500" />
          <div>
            <p class="text-2xl font-bold">{{ selectedBlocks.length }}</p>
            <p class="text-xs text-muted-foreground">Selected</p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Error/Warning Summary -->
    <div v-if="parsingResult && (parsingResult.metadata.errors.length > 0 || parsingResult.metadata.warnings.length > 0)" class="space-y-3">
      <Alert v-if="parsingResult.metadata.errors.length > 0" variant="destructive">
        <AlertTriangle class="h-4 w-4" />
        <AlertTitle>Parsing Errors</AlertTitle>
        <AlertDescription>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="error in parsingResult.metadata.errors.slice(0, 3)" :key="error" class="text-sm">
              {{ error }}
            </li>
            <li v-if="parsingResult.metadata.errors.length > 3" class="text-sm text-muted-foreground">
              ...and {{ parsingResult.metadata.errors.length - 3 }} more errors
            </li>
          </ul>
        </AlertDescription>
      </Alert>
      
      <Alert v-if="parsingResult.metadata.warnings.length > 0" variant="default">
        <AlertTriangle class="h-4 w-4" />
        <AlertTitle>Warnings</AlertTitle>
        <AlertDescription>
          <ul class="list-disc list-inside space-y-1 mt-2">
            <li v-for="warning in parsingResult.metadata.warnings.slice(0, 3)" :key="warning" class="text-sm">
              {{ warning }}
            </li>
            <li v-if="parsingResult.metadata.warnings.length > 3" class="text-sm text-muted-foreground">
              ...and {{ parsingResult.metadata.warnings.length - 3 }} more warnings
            </li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>

    <!-- Block List/Grid -->
    <div v-if="parsingResult && parsingResult.blocks.length > 0">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            @click="selectAllValid"
            :disabled="!hasValidBlocks"
          >
            <CheckCircle class="h-4 w-4 mr-2" />
            Select All Valid
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            @click="deselectAll"
            :disabled="selectedBlocks.length === 0"
          >
            <XCircle class="h-4 w-4 mr-2" />
            Deselect All
          </Button>
        </div>
        
        <div class="text-sm text-muted-foreground">
          {{ selectedBlocks.length }} of {{ parsingResult.blocks.length }} blocks selected
        </div>
      </div>

      <!-- List View -->
      <div v-if="viewMode === 'list'" class="space-y-3">
        <div
          v-for="(block, index) in parsingResult.blocks"
          :key="`${block.type}-${index}`"
          class="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          :class="{
            'border-green-200 bg-green-50/50': block.metadata.isValid && selectedBlocks.includes(index),
            'border-red-200 bg-red-50/50': !block.metadata.isValid,
            'border-yellow-200 bg-yellow-50/50': block.metadata.isValid && block.metadata.warnings.length > 0
          }"
        >
          <BlockPreviewItem
            :block="block"
            :index="index"
            :is-selected="selectedBlocks.includes(index)"
            @toggle-selection="toggleBlockSelection"
            @edit-block="editBlock"
          />
        </div>
      </div>

      <!-- Grid View -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(block, index) in parsingResult.blocks"
          :key="`${block.type}-${index}`"
          class="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
          :class="{
            'border-green-200 bg-green-50/50': block.metadata.isValid && selectedBlocks.includes(index),
            'border-red-200 bg-red-50/50': !block.metadata.isValid,
            'border-yellow-200 bg-yellow-50/50': block.metadata.isValid && block.metadata.warnings.length > 0
          }"
          @click="toggleBlockSelection(index)"
        >
          <BlockPreviewItem
            :block="block"
            :index="index"
            :is-selected="selectedBlocks.includes(index)"
            :compact="true"
            @toggle-selection="toggleBlockSelection"
            @edit-block="editBlock"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isProcessing" class="text-center py-12 text-muted-foreground">
      <FileText class="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p class="text-lg font-medium mb-2">No blocks to preview</p>
      <p class="text-sm">Paste or type markdown content to see block previews</p>
    </div>

    <!-- Loading State -->
    <div v-else class="text-center py-12">
      <Loader2 class="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
      <p class="text-lg font-medium mb-2">Processing content...</p>
      <p class="text-sm text-muted-foreground">Analyzing markdown and detecting blocks</p>
    </div>

    <!-- Action Buttons -->
    <div v-if="parsingResult && parsingResult.blocks.length > 0" class="flex items-center justify-between pt-4 border-t">
      <div class="text-sm text-muted-foreground">
        <p v-if="selectedBlocks.length > 0">
          Ready to insert {{ selectedBlocks.length }} block{{ selectedBlocks.length !== 1 ? 's' : '' }}
        </p>
        <p v-else>Select blocks to insert them into your document</p>
      </div>
      
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          @click="$emit('cancel')"
        >
          Cancel
        </Button>
        
        <Button
          @click="insertSelectedBlocks"
          :disabled="selectedBlocks.length === 0 || isProcessing"
        >
          <Plus class="h-4 w-4 mr-2" />
          Insert {{ selectedBlocks.length > 0 ? `(${selectedBlocks.length})` : '' }}
        </Button>
      </div>
    </div>

    <!-- Block Edit Dialog -->
    <Dialog v-model="showEditDialog" :open="showEditDialog">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Block</DialogTitle>
          <DialogDescription>
            Modify the block content and attributes before insertion
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <Label>Block Type</Label>
            <div class="flex items-center gap-2 mt-1">
              <Badge :variant="editingBlock?.metadata.isValid ? 'default' : 'destructive'">
                {{ editingBlock?.type }}
              </Badge>
              <span class="text-sm text-muted-foreground">
                Line {{ editingBlock?.metadata.startLine }}-{{ editingBlock?.metadata.endLine }}
              </span>
            </div>
          </div>
          
          <div>
            <Label>Content</Label>
            <Textarea
              v-model="editingContent"
              :rows="8"
              class="mt-1 font-mono text-sm"
              placeholder="Edit block content..."
            />
          </div>
          
          <div v-if="editingBlock && editingBlock.metadata.errors && editingBlock.metadata.errors.length > 0">
            <Label class="text-destructive">Errors</Label>
            <ul class="list-disc list-inside space-y-1 mt-1 text-sm text-destructive">
              <li v-for="error in editingBlock.metadata.errors" :key="error">
                {{ error }}
              </li>
            </ul>
          </div>
          
          <div v-if="editingBlock && editingBlock.metadata.warnings && editingBlock.metadata.warnings.length > 0">
            <Label class="text-yellow-600">Warnings</Label>
            <ul class="list-disc list-inside space-y-1 mt-1 text-sm text-yellow-600">
              <li v-for="warning in editingBlock.metadata.warnings" :key="warning">
                {{ warning }}
              </li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="cancelEdit">Cancel</Button>
          <Button @click="saveEdit" :disabled="!editingContent.trim()">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  RefreshCw, 
  Grid3X3, 
  List, 
  FileText, 
  Blocks, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Loader2 
} from 'lucide-vue-next'
import { markdownParserService, type ParsingResult, type ParsedBlock } from '@/features/editor/services/MarkdownParserService'
import BlockPreviewItem from './BlockPreviewItem.vue'

const props = defineProps<{
  content: string
}>()

const emit = defineEmits<{
  insertBlocks: [blocks: any[]]
  cancel: []
}>()

// State
const isProcessing = ref(false)
const parsingResult = ref<ParsingResult | null>(null)
const selectedBlocks = ref<number[]>([])
const viewMode = ref<'list' | 'grid'>('list')
const showEditDialog = ref(false)
const editingBlock = ref<ParsedBlock | null>(null)
const editingContent = ref('')

// Computed
const hasValidBlocks = computed(() => 
  parsingResult.value?.blocks.some(block => block.metadata.isValid) ?? false
)

// Methods
const refreshPreview = async () => {
  if (!props.content.trim()) {
    parsingResult.value = null
    return
  }

  isProcessing.value = true
  try {
    await nextTick()
    parsingResult.value = markdownParserService.parseMarkdown(props.content)
    selectedBlocks.value = []
  } catch (error) {
    console.error('Error refreshing preview:', error)
  } finally {
    isProcessing.value = false
  }
}

const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'list' ? 'grid' : 'list'
}

const toggleBlockSelection = (index: number) => {
  const selectedIndex = selectedBlocks.value.indexOf(index)
  if (selectedIndex > -1) {
    selectedBlocks.value.splice(selectedIndex, 1)
  } else {
    selectedBlocks.value.push(index)
  }
}

const selectAllValid = () => {
  if (!parsingResult.value) return
  
  selectedBlocks.value = parsingResult.value.blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.metadata.isValid)
    .map(({ index }) => index)
}

const deselectAll = () => {
  selectedBlocks.value = []
}

const editBlock = (block: ParsedBlock) => {
  editingBlock.value = block
  editingContent.value = block.content
  showEditDialog.value = true
}

const cancelEdit = () => {
  editingBlock.value = null
  editingContent.value = ''
  showEditDialog.value = false
}

const saveEdit = () => {
  if (!editingBlock.value || !editingContent.value.trim()) return
  
  // Update the block content
  editingBlock.value.content = editingContent.value
  editingBlock.value.metadata.rawText = editingContent.value
  
  // Re-parse and validate the edited content
  const newResult = markdownParserService.parseMarkdown(editingContent.value)
  if (newResult.blocks.length > 0) {
    const newBlock = newResult.blocks[0]
    editingBlock.value.type = newBlock.type
    editingBlock.value.attributes = newBlock.attributes
    editingBlock.value.metadata.isValid = newBlock.metadata.isValid
    editingBlock.value.metadata.errors = newBlock.metadata.errors
    editingBlock.value.metadata.warnings = newBlock.metadata.warnings
  }
  
  cancelEdit()
}

const insertSelectedBlocks = () => {
  if (!parsingResult.value || selectedBlocks.value.length === 0) return
  
  const blocksToInsert = selectedBlocks.value
    .map(index => parsingResult.value!.blocks[index])
    .filter(block => block.metadata.isValid)
  
  if (blocksToInsert.length > 0) {
    const tiptapBlocks = markdownParserService.convertToTiptap(blocksToInsert)
    emit('insertBlocks', tiptapBlocks)
  }
}

// Watch for content changes
watch(() => props.content, () => {
  refreshPreview()
}, { immediate: true })
</script>

<style scoped>
.block-preview-component {
  max-height: 80vh;
  overflow-y: auto;
}
</style>
