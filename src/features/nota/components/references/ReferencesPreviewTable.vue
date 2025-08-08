<script setup lang="ts">
import { computed, ref } from 'vue'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  HoverCard, 
  HoverCardContent, 
  HoverCardTrigger 
} from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Eye, 
  Trash2, 
  ExternalLink,
  BookOpen,
  Calendar,
  Users
} from 'lucide-vue-next'
import type { ParsedBibTexEntry } from '@/features/nota/composables/useBatchBibTexParser'
import { referenceValidationService, type ValidationResult } from '@/features/nota/services/referenceValidationService'

const props = defineProps<{
  entries: ParsedBibTexEntry[]
  isValidating?: boolean
}>()

const emit = defineEmits<{
  toggleSelection: [id: string]
  removeEntry: [id: string]
  validateEntry: [id: string]
  viewDetails: [entry: ParsedBibTexEntry]
  selectAll: [checked: boolean]
}>()

// Track validation states
const validatingEntries = ref<Set<string>>(new Set())
const validationResults = ref<Map<string, ValidationResult>>(new Map())

// Validate a single entry
const validateEntry = async (entry: ParsedBibTexEntry) => {
  if (validatingEntries.value.has(entry.id)) return
  
  validatingEntries.value.add(entry.id)
  emit('validateEntry', entry.id)
  
  try {
    const result = await referenceValidationService.validateReference(entry)
    validationResults.value.set(entry.id, result)
    
    // Update entry validation status
    entry.validationStatus = result.isValid ? 'valid' : 'invalid'
    entry.validationSource = result.source
    entry.validationDetails = result
  } catch (error) {
    console.error('Validation error:', error)
    entry.validationStatus = 'invalid'
    validationResults.value.set(entry.id, {
      isValid: false,
      source: 'crossref',
      confidence: 0,
      error: 'Validation failed'
    })
  } finally {
    validatingEntries.value.delete(entry.id)
  }
}

// Get validation status icon and color
const getValidationIcon = (entry: ParsedBibTexEntry) => {
  if (validatingEntries.value.has(entry.id)) {
    return { icon: Loader2, class: 'text-blue-500 animate-spin' }
  }
  
  switch (entry.validationStatus) {
    case 'valid':
      return { icon: CheckCircle2, class: 'text-green-500' }
    case 'invalid':
    case 'not_found':
      return { icon: XCircle, class: 'text-red-500' }
    case 'pending':
    default:
      return { icon: Clock, class: 'text-gray-400' }
  }
}

// Get entry type badge variant
const getTypeVariant = (type: string) => {
  switch (type.toLowerCase()) {
    case 'journal article':
      return 'default'
    case 'book':
      return 'secondary'
    case 'conference paper':
      return 'outline'
    default:
      return 'secondary'
  }
}

// Truncate text for display
const truncate = (text: string, length: number = 50) => {
  return text.length > length ? text.substring(0, length) + '...' : text
}

// Format authors for display
const formatAuthors = (authors: string, maxLength: number = 30) => {
  if (!authors) return 'Unknown'
  
  const authorList = authors.split(',').map(a => a.trim())
  
  if (authorList.length === 1) {
    return truncate(authorList[0], maxLength)
  }
  
  if (authorList.length === 2) {
    return `${truncate(authorList[0], 20)} & ${truncate(authorList[1], 20)}`
  }
  
  return `${truncate(authorList[0], 20)} et al.`
}

// Computed properties
const selectedCount = computed(() => props.entries.filter(e => e.isSelected).length)
const validCount = computed(() => props.entries.filter(e => e.validationStatus === 'valid').length)
const invalidCount = computed(() => props.entries.filter(e => e.validationStatus === 'invalid' || e.validationStatus === 'not_found').length)
</script>

<template>
  <div class="space-y-4">
    <!-- Summary Stats -->
    <div v-if="entries.length > 0" class="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div class="flex items-center gap-2">
        <Badge variant="outline">{{ entries.length }} Total</Badge>
        <Badge variant="default">{{ selectedCount }} Selected</Badge>
        <Badge v-if="validCount > 0" variant="default" class="bg-green-100 text-green-800">
          {{ validCount }} Valid
        </Badge>
        <Badge v-if="invalidCount > 0" variant="destructive">
          {{ invalidCount }} Invalid
        </Badge>
      </div>
    </div>

    <!-- Table -->
    <div class="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/50">
            <TableHead class="w-12">
              <Checkbox 
                :checked="selectedCount === entries.length && entries.length > 0"
                :indeterminate="selectedCount > 0 && selectedCount < entries.length"
                @update:checked="(checked: boolean) => $emit('selectAll', checked)"
              />
            </TableHead>
            <TableHead>Reference</TableHead>
            <TableHead class="w-32">Type</TableHead>
            <TableHead class="w-20">Year</TableHead>
            <TableHead class="w-24">Status</TableHead>
            <TableHead class="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow 
            v-for="entry in entries" 
            :key="entry.id"
            :class="{ 'bg-muted/20': entry.isSelected }"
          >
            <!-- Selection Checkbox -->
            <TableCell>
              <Checkbox 
                :checked="entry.isSelected"
                @update:checked="$emit('toggleSelection', entry.id)"
              />
            </TableCell>

            <!-- Reference Details -->
            <TableCell class="min-w-0">
              <HoverCard>
                <HoverCardTrigger as-child>
                  <div class="cursor-pointer space-y-1">
                    <div class="font-medium text-sm leading-tight">
                      {{ truncate(entry.title, 60) }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ formatAuthors(entry.authors) }}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      Key: <code class="bg-muted px-1 rounded">{{ entry.key }}</code>
                    </div>
                  </div>
                </HoverCardTrigger>
                
                <HoverCardContent class="w-96 p-4" side="right">
                  <div class="space-y-3">
                    <!-- Title -->
                    <div class="space-y-1">
                      <div class="flex items-start gap-2">
                        <BookOpen class="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p class="font-medium text-sm leading-tight">{{ entry.title }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Authors -->
                    <div v-if="entry.authors" class="flex items-start gap-2">
                      <Users class="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <p class="text-sm text-muted-foreground">{{ entry.authors }}</p>
                    </div>

                    <!-- Publication Info -->
                    <div class="space-y-2">
                      <div v-if="entry.journal" class="flex items-center gap-2">
                        <Calendar class="h-4 w-4 text-muted-foreground" />
                        <span class="text-sm">{{ entry.journal }}</span>
                        <span v-if="entry.year" class="text-sm text-muted-foreground">({{ entry.year }})</span>
                      </div>
                      
                      <div v-if="entry.volume || entry.number || entry.pages" class="text-sm text-muted-foreground">
                        <span v-if="entry.volume">Vol. {{ entry.volume }}</span>
                        <span v-if="entry.number">, No. {{ entry.number }}</span>
                        <span v-if="entry.pages">, pp. {{ entry.pages }}</span>
                      </div>
                    </div>

                    <!-- DOI/URL -->
                    <div v-if="entry.doi || entry.url" class="space-y-1">
                      <div v-if="entry.doi" class="flex items-center gap-2">
                        <ExternalLink class="h-3 w-3 text-muted-foreground" />
                        <a 
                          :href="`https://doi.org/${entry.doi}`" 
                          target="_blank" 
                          class="text-xs text-blue-600 hover:underline"
                        >
                          DOI: {{ entry.doi }}
                        </a>
                      </div>
                      <div v-if="entry.url && !entry.doi" class="flex items-center gap-2">
                        <ExternalLink class="h-3 w-3 text-muted-foreground" />
                        <a 
                          :href="entry.url" 
                          target="_blank" 
                          class="text-xs text-blue-600 hover:underline truncate"
                        >
                          {{ truncate(entry.url, 40) }}
                        </a>
                      </div>
                    </div>

                    <!-- Validation Info -->
                    <div v-if="validationResults.has(entry.id)" class="border-t pt-3">
                      <div class="space-y-2">
                        <div class="flex items-center justify-between">
                          <span class="text-xs font-medium">Validation Result</span>
                          <Badge 
                            :variant="validationResults.get(entry.id)?.isValid ? 'default' : 'destructive'"
                            class="text-xs"
                          >
                            {{ validationResults.get(entry.id)?.source }}
                          </Badge>
                        </div>
                        <div class="text-xs text-muted-foreground">
                          Confidence: {{ Math.round((validationResults.get(entry.id)?.confidence || 0) * 100) }}%
                        </div>
                        <div v-if="validationResults.get(entry.id)?.suggestion" class="text-xs text-muted-foreground">
                          {{ validationResults.get(entry.id)?.suggestion }}
                        </div>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </TableCell>

            <!-- Type -->
            <TableCell>
              <Badge :variant="getTypeVariant(entry.type)" class="text-xs">
                {{ entry.type }}
              </Badge>
            </TableCell>

            <!-- Year -->
            <TableCell>
              <span class="text-sm">{{ entry.year || '—' }}</span>
            </TableCell>

            <!-- Validation Status -->
            <TableCell>
              <div class="flex items-center gap-2">
                <component 
                  :is="getValidationIcon(entry).icon" 
                  :class="['h-4 w-4', getValidationIcon(entry).class]"
                />
                <span class="text-xs capitalize">
                  {{ entry.validationStatus === 'not_found' ? 'not found' : entry.validationStatus }}
                </span>
              </div>
            </TableCell>

            <!-- Actions -->
            <TableCell>
              <div class="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  @click="validateEntry(entry)"
                  :disabled="validatingEntries.has(entry.id) || entry.validationStatus === 'valid'"
                  class="h-7 w-7 p-0"
                >
                  <Eye class="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="xs"
                  @click="$emit('viewDetails', entry)"
                  class="h-7 w-7 p-0"
                >
                  <ExternalLink class="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="xs"
                  @click="$emit('removeEntry', entry.id)"
                  class="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 class="h-3 w-3" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Empty State -->
    <div v-if="entries.length === 0" class="text-center py-12 text-muted-foreground">
      <BookOpen class="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p class="text-lg font-medium mb-2">No references parsed yet</p>
      <p class="text-sm">Paste your BibTeX entries above to get started</p>
    </div>
  </div>
</template>
