<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useCitationStore } from '@/stores/citationStore'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Tooltip } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Link, ExternalLink, Edit, Copy, ClipboardCheck } from 'lucide-vue-next'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  updateAttributes: {
    type: Function,
    required: true,
  },
  editor: {
    type: Object,
    required: true,
  },
})

const router = useRouter()
const citationStore = useCitationStore()
const citationKey = computed(() => props.node.attrs.citationKey)
const showDetailsDialog = ref(false)
const copiedFormat = ref<string | null>(null)

// Get the current nota ID from the route
const notaId = computed(() => {
  return router.currentRoute.value.params.id as string
})

// Get the full citation details
const citation = computed(() => {
  return citationStore.getCitationByKey(citationKey.value, notaId.value)
})

const formatAuthors = (authors: string[], full = false) => {
  if (!authors || authors.length === 0) return ''
  if (authors.length === 1) return authors[0]
  if (authors.length === 2) return `${authors[0]} and ${authors[1]}`
  if (full) return authors.slice(0, -1).join(', ') + ', and ' + authors[authors.length - 1]
  return `${authors[0]} et al.`
}

const tooltipContent = computed(() => {
  if (!citation.value) return `Citation key "${citationKey.value}" not found`
  
  let text = `${formatAuthors(citation.value.authors)} (${citation.value.year}). ${citation.value.title}.`
  
  if (citation.value.journal) {
    text += ` ${citation.value.journal}`
    if (citation.value.volume) {
      text += ` ${citation.value.volume}`
      if (citation.value.number) {
        text += `(${citation.value.number})`
      }
    }
    if (citation.value.pages) {
      text += `: ${citation.value.pages}`
    }
    text += '.'
  } else if (citation.value.publisher) {
    text += ` ${citation.value.publisher}.`
  }
  
  return text
})

const openDetailsDialog = () => {
  showDetailsDialog.value = true
}

const jumpToReferences = () => {
  // Toggle reference sidebar open
  const event = new CustomEvent('toggle-references', { detail: { open: true } })
  window.dispatchEvent(event)
  
  // Close the dialog
  showDetailsDialog.value = false
}

const formatCitation = (style: string): string => {
  if (!citation.value) return 'Citation not found'
  
  const c = citation.value
  
  switch (style) {
    case 'apa':
      return `${formatAuthors(c.authors, true)} (${c.year}). ${c.title}. ${c.journal ? `${c.journal}` : ''}${c.volume ? `, ${c.volume}` : ''}${c.number ? `(${c.number})` : ''}${c.pages ? `, ${c.pages}` : ''}.${c.doi ? ` https://doi.org/${c.doi}` : ''}`
    
    case 'mla':
      return `${formatAuthors(c.authors, true)}. "${c.title}." ${c.journal ? `${c.journal}` : ''}${c.volume ? ` ${c.volume}` : ''}${c.number ? `.${c.number}` : ''} (${c.year})${c.pages ? `: ${c.pages}` : ''}.${c.doi ? ` DOI: ${c.doi}` : ''}`
    
    case 'chicago':
      return `${formatAuthors(c.authors, true)}. "${c.title}." ${c.journal ? `${c.journal}` : ''}${c.volume ? ` ${c.volume}` : ''}${c.number ? `, no. ${c.number}` : ''} (${c.year})${c.pages ? `: ${c.pages}` : ''}.${c.doi ? ` https://doi.org/${c.doi}` : ''}`
    
    case 'bibtex':
      return `@article{${c.key},
  author = {${c.authors.join(' and ')}},
  title = {${c.title}},
  journal = {${c.journal || ''}},
  year = {${c.year}}${c.volume ? `,\n  volume = {${c.volume}}` : ''}${c.number ? `,\n  number = {${c.number}}` : ''}${c.pages ? `,\n  pages = {${c.pages}}` : ''}${c.doi ? `,\n  doi = {${c.doi}}` : ''}${c.url ? `,\n  url = {${c.url}}` : ''}
}`
      
    default:
      return tooltipContent.value
  }
}

const copyToClipboard = (format: string) => {
  const text = formatCitation(format)
  navigator.clipboard.writeText(text)
  copiedFormat.value = format
  
  // Reset copied state after 2 seconds
  setTimeout(() => {
    copiedFormat.value = null
  }, 2000)
}

const citationStatus = computed(() => {
  if (!citation.value) return 'error'
  
  // Check if essential fields are present
  const c = citation.value
  if (!c.title || !c.year || !c.authors || c.authors.length === 0) {
    return 'warning'
  }
  
  return 'valid'
})
</script>

<template>
  <NodeViewWrapper as="span">
    <!-- Citation with tooltip -->
    <Tooltip :content="tooltipContent">
      <span 
        :class="[
          'citation-reference', 
          `citation-${citationStatus}`
        ]" 
        @click="openDetailsDialog"
      >
        [{{ node.attrs.citationNumber || '?' }}]
      </span>
    </Tooltip>
    
    <!-- Citation details dialog -->
    <Dialog v-model:open="showDetailsDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <span>Citation [{{ node.attrs.citationNumber || '?' }}]</span>
            <span v-if="citation" class="text-xs text-muted-foreground ml-2">
              {{ citation.key }}
            </span>
          </DialogTitle>
          <DialogDescription v-if="citation">
            {{ formatAuthors(citation.authors, true) }}
          </DialogDescription>
        </DialogHeader>
        
        <div v-if="citation" class="space-y-4">
          <!-- Citation details -->
          <div class="space-y-2 text-sm">
            <div class="font-medium">{{ citation.title }}</div>
            <div v-if="citation.journal" class="italic text-muted-foreground">
              {{ citation.journal }}
              <span v-if="citation.volume"> {{ citation.volume }}</span>
              <span v-if="citation.number">({{ citation.number }})</span>
              <span v-if="citation.pages">: {{ citation.pages }}</span>
            </div>
            <div v-else-if="citation.publisher" class="text-muted-foreground">
              {{ citation.publisher }}
            </div>
            <div v-if="citation.year" class="text-muted-foreground">
              Published in {{ citation.year }}
            </div>
          </div>
          
          <!-- External links -->
          <div v-if="citation.doi || citation.url" class="flex gap-3 pt-2">
            <a 
              v-if="citation.doi" 
              :href="`https://doi.org/${citation.doi}`" 
              target="_blank" 
              class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Link class="h-3 w-3" />
              <span>DOI: {{ citation.doi }}</span>
            </a>
            
            <a 
              v-if="citation.url" 
              :href="citation.url" 
              target="_blank" 
              class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink class="h-3 w-3" />
              <span>View online</span>
            </a>
          </div>
          
          <!-- Copy options -->
          <div class="pt-2 border-t border-border">
            <div class="text-sm font-medium mb-2">Copy citation as:</div>
            <div class="flex flex-wrap gap-2">
              <Button 
                v-for="format in ['apa', 'mla', 'chicago', 'bibtex']" 
                :key="format"
                variant="outline" 
                size="sm" 
                class="text-xs"
                @click="copyToClipboard(format)"
              >
                <span>{{ format.toUpperCase() }}</span>
                <Copy v-if="copiedFormat !== format" class="ml-1 h-3 w-3" />
                <ClipboardCheck v-else class="ml-1 h-3 w-3 text-green-600" />
              </Button>
            </div>
          </div>
        </div>
        
        <div v-else class="py-4 text-center text-muted-foreground">
          <p>Citation not found. The key "{{ citationKey }}" might be missing or invalid.</p>
        </div>
        
        <DialogFooter class="flex gap-2 justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            class="mr-auto"
            @click="jumpToReferences"
          >
            <span>Go to References</span>
          </Button>
          
          <Button 
            v-if="citation"
            variant="default" 
            size="sm"
            @click="showDetailsDialog = false"
          >
            <span>Close</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </NodeViewWrapper>
</template>

<style>
.citation-reference {
  @apply inline-flex items-center justify-center bg-primary/10 text-primary px-1 py-0.5 rounded-sm text-xs font-medium;
  user-select: all;
  cursor: pointer;
  transition: all 0.15s ease;
}

.citation-reference:hover {
  @apply bg-primary/20 shadow-sm transform;
  transform: translateY(-1px);
}

.citation-warning {
  @apply bg-amber-100 text-amber-800;
}

.citation-error {
  @apply bg-red-100 text-red-800;
}
</style> 