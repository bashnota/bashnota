<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useCitationStore } from '@/features/editor/stores/citationStore'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Link, ExternalLink, Edit, Copy, ClipboardCheck, X, Search, Loader2 } from 'lucide-vue-next'
import type { CitationEntry } from '@/features/nota/types/nota'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'vue-sonner'

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
const citationNumber = computed(() => props.node.attrs.citationNumber || '?')
const showDetailsTooltip = ref(false)
const copiedFormat = ref<string | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<CitationEntry[]>([])
const activeSearchTab = ref('crossref')
const showSearchPanel = ref(false)

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

// Format authors based on style
const formatAuthors = (authors: string[]): string => {
  if (!authors || authors.length === 0) return ''
  
  if (authors.length === 1) return authors[0]
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`
  return `${authors[0]} et al.`
}

// Format citation
const formatCitation = (citation: CitationEntry | null): string => {
  if (!citation) return `[${citationNumber.value}]`
  return `[${citationNumber.value}]`
}

const tooltipContent = computed(() => {
  if (!citation.value) return `Citation key "${citationKey.value}" not found. Click to create a new citation.`
  
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
  
  // Toggle tooltip and reset search panel state
  showDetailsTooltip.value = !showDetailsTooltip.value
  if (!showDetailsTooltip.value) {
    showSearchPanel.value = false
    searchQuery.value = ''
    searchResults.value = []
  }
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

// Enhanced citation formatting for different styles
const formatCitationForStyle = (style: string): string => {
  if (!citation.value) return 'Citation not found'
  
  const c = citation.value
  
  switch (style) {
    case 'apa':
      return `${formatAuthors(c.authors)} (${c.year}). ${c.title}${c.title.endsWith('.') ? '' : '.'} ${c.journal ? `${c.journal}` : ''}${c.volume ? `, ${c.volume}` : ''}${c.number ? `(${c.number})` : ''}${c.pages ? `, ${c.pages}` : ''}.${c.doi ? ` https://doi.org/${c.doi}` : ''}${c.url && !c.doi ? ` Retrieved from ${c.url}` : ''}`
    
    case 'mla':
      return `${formatAuthors(c.authors)}. "${c.title}"${c.title.endsWith('?') || c.title.endsWith('!') ? '' : '.'} ${c.journal ? `${c.journal}` : ''}${c.volume ? `, vol. ${c.volume}` : ''}${c.number ? `, no. ${c.number}` : ''}, ${c.year}${c.pages ? `, pp. ${c.pages}` : ''}.${c.doi ? ` DOI: ${c.doi}` : ''}${c.url && !c.doi ? ` ${c.url}` : ''}`
    
    case 'chicago':
      return `${formatAuthors(c.authors)} ("${c.title}", ${c.year})${c.journal ? `, ${c.journal}` : ''}${c.volume ? `, ${c.volume}` : ''}${c.number ? `, no. ${c.number}` : ''}${c.pages ? `, pp. ${c.pages}` : ''}.${c.publisher ? `, ${c.publisher}.` : ''}${c.doi ? `, https://doi.org/${c.doi}` : ''}${c.url && !c.doi ? `, ${c.url}` : ''}`
    
    case 'bibtex':
      return `@article{${c.key},
  author = {${c.authors.join(' and ')}},
  title = {${c.title}},
  journal = {${c.journal || ''}},
  year = {${c.year}}${c.volume ? `,\n  volume = {${c.volume}}` : ''}${c.number ? `,\n  number = {${c.number}}` : ''}${c.pages ? `,\n  pages = {${c.pages}}` : ''}${c.doi ? `,\n  doi = {${c.doi}}` : ''}${c.url ? `,\n  url = {${c.url}}` : ''}
}`
      
    default:
      return formatCitation(c)
  }
}

const copyToClipboard = (format: string) => {
  const text = formatCitationForStyle(format)
  navigator.clipboard.writeText(text)
  copiedFormat.value = format
  
  // Reset copied state after 2 seconds
  setTimeout(() => {
    copiedFormat.value = null
  }, 2000)
}

const citationStatus = computed(() => {
  if (!citation.value) return 'missing'
  
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

const createNewCitation = () => {
  // Close the tooltip
  showDetailsTooltip.value = false
  
  // Navigate to the references page with the new citation key
  router.push({
    name: 'references',
    params: { id: notaId.value },
    query: { new: citationKey.value }
  })
}

// Citation search services
const searchServices = {
  crossref: {
    name: 'Crossref',
    icon: '🔍',
    search: async (query: string) => {
      try {
        const response = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=10`)
        const data = await response.json()
        return data.message.items.map((item: any) => ({
          key: item.DOI,
          title: item.title?.[0] || '',
          authors: item.author?.map((a: any) => `${a.given} ${a.family}`) || [],
          year: item.published?.['date-parts']?.[0]?.[0] || '',
          journal: item['container-title']?.[0] || '',
          volume: item.volume || '',
          number: item.issue || '',
          pages: item.page || '',
          doi: item.DOI || '',
          url: item.URL || ''
        }))
      } catch (error) {
        console.error('Crossref search error:', error)
        return []
      }
    }
  },
  semanticScholar: {
    name: 'Semantic Scholar',
    icon: '🎓',
    search: async (query: string) => {
      try {
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10`)
        const data = await response.json()
        return data.data.map((item: any) => ({
          key: item.paperId,
          title: item.title || '',
          authors: item.authors?.map((a: any) => a.name) || [],
          year: item.year || '',
          journal: item.venue || '',
          doi: item.doi || '',
          url: item.url || ''
        }))
      } catch (error) {
        console.error('Semantic Scholar search error:', error)
        return []
      }
    }
  },
  googleScholar: {
    name: 'Google Scholar',
    icon: '📚',
    search: async (query: string) => {
      // Note: This is a placeholder. Google Scholar doesn't have a public API.
      // You would need to implement a proxy server to handle this.
      return []
    }
  }
}

const performSearch = async () => {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  try {
    const service = searchServices[activeSearchTab.value as keyof typeof searchServices]
    searchResults.value = await service.search(searchQuery.value)
  } catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const importCitation = async (citation: CitationEntry) => {
  try {
    // Add the citation to the store
    await citationStore.addCitation(notaId.value, {
      key: citation.key,
      title: citation.title,
      authors: citation.authors,
      year: citation.year,
      journal: citation.journal,
      volume: citation.volume,
      number: citation.number,
      pages: citation.pages,
      publisher: citation.publisher,
      url: citation.url,
      doi: citation.doi
    })
    
    // Update the current citation
    props.updateAttributes({
      citationKey: citation.key
    })
    
    // Close the search panel
    showSearchPanel.value = false
    showDetailsTooltip.value = false
    
    // Show success message
    toast('Citation imported successfully')
  } catch (error) {
    console.error('Error importing citation:', error)
    toast('Failed to import citation', { description: 'Error' })
  }
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
      {{ formatCitation(citation) }}
    </span>
    
    <!-- Enhanced citation details tooltip that shows on click -->
    <div v-if="showDetailsTooltip" 
         class="citation-details-tooltip" 
         :style="`position: fixed; top: ${tooltipPosition.y}px; left: ${tooltipPosition.x}px; z-index: 100;`">
      <div class="citation-card bg-white rounded-md border shadow-lg min-w-64 max-w-sm flex flex-col h-[300px]">
        <!-- Header with close button -->
        <div class="flex justify-between items-center px-3 py-2 border-b shrink-0">
          <div class="flex items-center gap-1">
            <span class="font-medium text-sm">Citation</span>
            <span v-if="citation" class="text-xs text-muted-foreground">
              {{ citation.key }}
            </span>
          </div>
          <Button variant="ghost" size="sm" class="h-5 w-5 p-0" @click.stop="closeTooltip">
            <X class="h-3 w-3" />
          </Button>
        </div>
        
        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto">
          <div class="p-3">
            <!-- Citation content -->
            <div v-if="citation" class="space-y-2">
              <!-- Citation details -->
              <div class="space-y-1 text-sm">
                <div class="font-medium">{{ citation.title }}</div>
                <div v-if="citation.journal" class="italic text-muted-foreground text-xs">
                  {{ citation.journal }}
                  <span v-if="citation.volume"> {{ citation.volume }}</span>
                  <span v-if="citation.number">({{ citation.number }})</span>
                  <span v-if="citation.pages">: {{ citation.pages }}</span>
                </div>
                <div v-else-if="citation.publisher" class="text-muted-foreground text-xs">
                  {{ citation.publisher }}
                </div>
                <div v-if="citation.year" class="text-muted-foreground text-xs">
                  Published in {{ citation.year }}
                </div>
              </div>
              
              <!-- External links -->
              <div v-if="citation.doi || citation.url" class="flex gap-2 pt-1">
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
              <div class="pt-1 border-t border-border">
                <div class="text-xs font-medium mb-1">Copy citation as:</div>
                <div class="flex flex-wrap gap-1">
                  <Button 
                    v-for="format in ['apa', 'mla', 'chicago', 'bibtex']" 
                    :key="format"
                    variant="outline" 
                    size="sm" 
                    class="text-xs h-6 px-2"
                    @click.stop="copyToClipboard(format)"
                  >
                    <span>{{ format.toUpperCase() }}</span>
                    <Copy v-if="copiedFormat !== format" class="ml-1 h-3 w-3" />
                    <ClipboardCheck v-else class="ml-1 h-3 w-3 text-green-600" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div v-else class="space-y-3">
              <!-- Search panel -->
              <div v-if="showSearchPanel" class="space-y-3">
                <Tabs v-model="activeSearchTab" class="w-full">
                  <TabsList class="grid grid-cols-3 mb-2">
                    <TabsTrigger v-for="(service, key) in searchServices" 
                               :key="key" 
                               :value="key"
                               class="flex items-center gap-1 text-xs">
                      <span>{{ service.icon }}</span>
                      <span>{{ service.name }}</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent v-for="(service, key) in searchServices" 
                              :key="key" 
                              :value="key"
                              class="space-y-2">
                    <div class="flex gap-2">
                      <Input
                        v-model="searchQuery"
                        placeholder="Search for papers..."
                        class="flex-1 h-8 text-sm"
                        @keyup.enter="performSearch"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        class="h-8 w-8"
                        :disabled="isSearching"
                        @click="performSearch"
                      >
                        <Search v-if="!isSearching" class="h-3 w-3" />
                        <Loader2 v-else class="h-3 w-3 animate-spin" />
                      </Button>
                    </div>
                    
                    <!-- Search results -->
                    <div v-if="searchResults.length > 0" class="space-y-1 max-h-40 overflow-y-auto">
                      <div v-for="result in searchResults" 
                           :key="result.key"
                           class="p-2 rounded-md border hover:bg-accent cursor-pointer"
                           @click="importCitation(result)">
                        <div class="font-medium text-xs">{{ result.title }}</div>
                        <div class="text-xs text-muted-foreground">
                          {{ formatAuthors(result.authors) }} ({{ result.year }})
                        </div>
                        <div v-if="result.journal" class="text-xs italic text-muted-foreground">
                          {{ result.journal }}
                        </div>
                      </div>
                    </div>
                    
                    <!-- Empty state -->
                    <div v-else-if="searchQuery" class="text-center py-2 text-muted-foreground">
                      <p class="text-xs">No results found</p>
                      <p class="text-xs">Try a different search term</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              <!-- Empty state with search option -->
              <div v-else class="py-2 text-center space-y-2">
                <p class="text-xs text-muted-foreground">
                  Citation not found. The key "{{ citationKey }}" might be missing or invalid.
                </p>
                <div class="flex flex-col gap-1">
                  <Button 
                    variant="default" 
                    size="sm" 
                    class="h-7 text-xs"
                    @click.stop="showSearchPanel = true"
                  >
                    <Search class="h-3 w-3 mr-1" />
                    Search for Citation
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    class="h-7 text-xs"
                    @click.stop="createNewCitation"
                  >
                    <Edit class="h-3 w-3 mr-1" />
                    Create New Citation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-3 py-2 border-t bg-muted/5 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            class="h-7 text-xs w-full"
            @click.stop="jumpToReferences"
          >
            <span>Go to References</span>
          </Button>
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

.citation-missing {
  @apply bg-gray-100 text-gray-800;
}

.citation-details-tooltip {
  animation: fadeIn 0.15s ease;
}

.citation-card {
  @apply bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-lg;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.citation-card .overflow-y-auto {
  max-height: calc(80vh - 120px); /* Account for header and footer */
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

.citation-search-results {
  @apply space-y-2 max-h-60 overflow-y-auto;
}

.citation-search-result {
  @apply p-2 rounded-md border hover:bg-accent cursor-pointer transition-colors;
}

.citation-search-result:hover {
  @apply border-primary/50;
}
</style>







