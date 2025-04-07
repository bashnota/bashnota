<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useCitationStore } from '@/stores/citationStore'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Link, ExternalLink, Edit, Copy, ClipboardCheck, X } from 'lucide-vue-next'
import type { CitationEntry } from '@/types/nota'

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
  citations: {
    type: Array as () => CitationEntry[],
    default: () => []
  }
})

const router = useRouter()
const citationStore = useCitationStore()
const citationKey = computed(() => props.node.attrs.citationKey)
const showDetailsTooltip = ref(false)
const copiedFormat = ref<string | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })

// Get the current nota ID from the route
const notaId = computed(() => {
  return router.currentRoute.value.params.id as string
})

// Get the full citation details
const citation = computed(() => {
  // If citations are passed as props (public view), use those
  if (props.citations && props.citations.length > 0) {
    return props.citations.find(c => c.key === citationKey.value) || null
  }
  // Otherwise use the citation store
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

const toggleDetailsTooltip = (event?: MouseEvent) => {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
    
    // Calculate tooltip position
    let x = event.clientX
    let y = event.clientY + 20 // Offset slightly below the click
    
    // Adjust for window boundaries (basic positioning)
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    // Ensure tooltip stays within viewport (approx dimensions)
    const tooltipWidth = 320 // Approximate width
    const tooltipHeight = 300 // Approximate height
    
    // Adjust horizontal position if needed
    if (x + tooltipWidth > windowWidth) {
      x = Math.max(0, windowWidth - tooltipWidth - 10)
    }
    
    // Adjust vertical position if needed
    if (y + tooltipHeight > windowHeight) {
      y = Math.max(0, event.clientY - tooltipHeight - 10)
    }
    
    tooltipPosition.value = { x, y }
  }
  showDetailsTooltip.value = !showDetailsTooltip.value
}

const closeTooltip = (event?: MouseEvent) => {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  showDetailsTooltip.value = false
}

// Close tooltip when clicking outside
const handleOutsideClick = (event: MouseEvent) => {
  const tooltipEl = document.querySelector('.citation-details-tooltip')
  const citationEl = event.target as HTMLElement
  
  if (tooltipEl && !tooltipEl.contains(event.target as Node) && 
      !citationEl.classList.contains('citation-reference')) {
    showDetailsTooltip.value = false
  }
}

// Add and remove event listener
onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

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

const jumpToReferences = () => {
  // Toggle reference sidebar open
  const event = new CustomEvent('toggle-references', { detail: { open: true } })
  window.dispatchEvent(event)
  
  // Close the tooltip
  showDetailsTooltip.value = false
}
</script>

<template>
  <NodeViewWrapper as="span">
    <!-- Citation reference that opens tooltip on click -->
    <span 
      :class="[
        'citation-reference', 
        `citation-${citationStatus}`
      ]" 
      @click.stop.prevent="toggleDetailsTooltip"
    >
      [{{ node.attrs.citationNumber || '?' }}]
    </span>
    
    <!-- Enhanced citation details tooltip that shows on click -->
    <div v-if="showDetailsTooltip" 
         class="citation-details-tooltip" 
         :style="`position: fixed; top: ${tooltipPosition.y}px; left: ${tooltipPosition.x}px; z-index: 100;`">
      <div class="citation-card p-4 bg-white rounded-md border shadow-lg min-w-64 max-w-sm">
        <!-- Header with close button -->
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
            <span class="font-medium">Citation [{{ node.attrs.citationNumber || '?' }}]</span>
            <span v-if="citation" class="text-xs text-muted-foreground">
              {{ citation.key }}
            </span>
          </div>
          <Button variant="ghost" size="sm" class="h-6 w-6 p-0" @click.stop="closeTooltip">
            <X class="h-4 w-4" />
          </Button>
        </div>
        
        <!-- Citation content -->
        <div v-if="citation" class="space-y-3">
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
              @click.stop
            >
              <Link class="h-3 w-3" />
              <span>DOI: {{ citation.doi }}</span>
            </a>
            
            <a 
              v-if="citation.url" 
              :href="citation.url" 
              target="_blank" 
              class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              @click.stop
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
                @click.stop="copyToClipboard(format)"
              >
                <span>{{ format.toUpperCase() }}</span>
                <Copy v-if="copiedFormat !== format" class="ml-1 h-3 w-3" />
                <ClipboardCheck v-else class="ml-1 h-3 w-3 text-green-600" />
              </Button>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="flex justify-between pt-2 border-t border-border">
            <Button 
              variant="outline" 
              size="sm" 
              @click.stop="jumpToReferences"
            >
              <span>Go to References</span>
            </Button>
          </div>
        </div>
        
        <div v-else class="py-4 text-center text-muted-foreground">
          <p>Citation not found. The key "{{ citationKey }}" might be missing or invalid.</p>
        </div>
      </div>
    </div>
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

.citation-details-tooltip {
  animation: fadeIn 0.15s ease;
}

.citation-card {
  @apply bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-lg;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 