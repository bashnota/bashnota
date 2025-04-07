<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useCitationStore } from '@/stores/citationStore'
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, SortAsc, SortDesc, Filter, Copy, FileText, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { toast } from '@/lib/utils'
import { logger } from '@/services/logger'
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
})

const router = useRouter()
const citationStore = useCitationStore()
const isExpanded = ref(false)

// Get the current nota ID from the route
const notaId = computed(() => {
  return router.currentRoute.value.params.id as string
})

// Get all citations for the current nota
const citations = computed(() => {
  return citationStore.getCitationsByNotaId(notaId.value)
})

// Styles for bibliography
const styles = [
  { label: 'APA', value: 'apa' },
  { label: 'MLA', value: 'mla' },
  { label: 'Chicago', value: 'chicago' },
]

// Current selected style and title
const style = computed({
  get: () => {
    return props.node.attrs.style || 'apa'
  },
  set: (value) => {
    props.updateAttributes({ style: value })
    nextTick(() => refreshBibliography())
  }
})

const title = computed({
  get: () => props.node.attrs.title,
  set: (value) => props.updateAttributes({ title: value })
})

// Format authors based on citation style
const formatAuthors = (authors: string[], style: string) => {
  if (!authors || authors.length === 0) return ''
  
  switch (style) {
    case 'apa':
      // Last name, Initials. format for APA
      return authors.map(author => {
        const parts = author.trim().split(' ')
        const lastName = parts.pop() || ''
        const initials = parts.map(name => `${name.charAt(0)}.`).join(' ')
        return `${lastName}, ${initials}`
      }).join(', ')
      
    case 'mla':
      // First author: Last, First. Other authors: First Last
      if (authors.length === 1) {
        const parts = authors[0].trim().split(' ')
        const lastName = parts.pop() || ''
        const firstName = parts.join(' ')
        return `${lastName}, ${firstName}`
      } else {
        const firstAuthor = authors[0].trim().split(' ')
        const lastName = firstAuthor.pop() || ''
        const firstName = firstAuthor.join(' ')
        
        const otherAuthors = authors.slice(1).map(a => a.trim()).join(', ')
        return `${lastName}, ${firstName}, and ${otherAuthors}`
      }
      
    case 'chicago':
      // First author: Last, First. Other authors: First Last
      if (authors.length === 1) {
        const parts = authors[0].trim().split(' ')
        const lastName = parts.pop() || ''
        const firstName = parts.join(' ')
        return `${lastName}, ${firstName}`
      } else {
        return authors.map((author, index) => {
          if (index === 0) {
            const parts = author.trim().split(' ')
            const lastName = parts.pop() || ''
            const firstName = parts.join(' ')
            return `${lastName}, ${firstName}`
          }
          return author.trim()
        }).join(', ')
      }
      
    default:
      return authors.join(', ')
  }
}

// Sort citations based on style
const sortedCitations = computed(() => {
  if (!citations.value.length) return []
  
  // Clone to avoid mutation
  const sorted = [...citations.value]
  
  switch (style.value) {
    case 'apa':
    case 'mla':
    case 'chicago':
      // Sort alphabetically by first author's last name
      return sorted.sort((a, b) => {
        const aName = a.authors[0]?.split(' ').pop() || ''
        const bName = b.authors[0]?.split(' ').pop() || ''
        return aName.localeCompare(bName)
      })
      
    default:
      // Sort by citation number (order they appear in the document)
      return sorted
  }
})

// Get the citation number as it appears in the document
const getCitationNumber = (citationKey: string) => {
  const allCitations = citationStore.getCitationsByNotaId(notaId.value)
  const index = allCitations.findIndex(c => c.key === citationKey)
  return index >= 0 ? index + 1 : null
}

// Format citation based on style
const formatCitation = (citation: any, style: string, index: number): { text: string; indent: boolean } => {
  if (!citation) return { text: '', indent: false }
  
  const c = citation
  const authors = formatAuthors(c.authors, style)
  
  switch (style) {
    case 'apa':
      return {
        text: `${authors} (${c.year}). ${c.title}. ${c.journal ? `${c.journal}` : ''}${c.volume ? `, ${c.volume}` : ''}${c.number ? `(${c.number})` : ''}${c.pages ? `, ${c.pages}` : ''}.${c.doi ? ` https://doi.org/${c.doi}` : ''}`,
        indent: true
      }
      
    case 'mla':
      return {
        text: `${authors}. "${c.title}." ${c.journal ? `${c.journal}` : ''}${c.volume ? ` ${c.volume}` : ''}${c.number ? `.${c.number}` : ''} (${c.year})${c.pages ? `: ${c.pages}` : ''}.${c.doi ? ` DOI: ${c.doi}` : ''}`,
        indent: true
      }
      
    case 'chicago':
      return {
        text: `${authors}. "${c.title}." ${c.journal ? `${c.journal}` : ''}${c.volume ? ` ${c.volume}` : ''}${c.number ? `, no. ${c.number}` : ''} (${c.year})${c.pages ? `: ${c.pages}` : ''}.${c.doi ? ` https://doi.org/${c.doi}` : ''}`,
        indent: true
      }
      
    default:
      return {
        text: `[${index + 1}] ${authors} (${c.year}). ${c.title}.`,
        indent: false
      }
  }
}

// Safer approach to refresh the bibliography when needed
const refreshBibliography = () => {
  if (!props.editor) return
  
  // Use nextTick to ensure DOM is updated before we attempt editor commands
  nextTick(() => {
    try {
      props.editor.commands.command(({ tr }: { tr: any }) => {
        // Find the position of this node in the document
        let foundPos: number | null = null
        
        props.editor.state.doc.descendants((node: any, pos: number) => {
          if (node.type.name === 'bibliography') {
            foundPos = pos
            return false // Stop searching
          }
          return true
        })
        
        // Only update if we found the node
        if (foundPos !== null) {
          tr.setNodeMarkup(foundPos, undefined, props.node.attrs)
        }
        
        return true
      })
    } catch (error) {
      logger.error('Error refreshing bibliography:', error)
    }
  })
}

// Only run the refresh when the component is mounted
onMounted(() => {
  // Add a small delay to ensure the editor is fully initialized
  setTimeout(refreshBibliography, 100)
  
  // Set up a listener for citation changes
  citationStore.$subscribe(() => {
    refreshBibliography()
  })
})

// Filters and search
const searchQuery = ref('')
const typeFilter = ref('all')
const yearFilter = ref<string>('all')
const sortDirection = ref<'asc' | 'desc'>('asc')
const sortField = ref<'authors' | 'year' | 'title' | 'key'>('authors')

// Available citation types
const citationTypes = computed(() => {
  return []
})

// Available years
const citationYears = computed(() => {
  const years = new Set<string>()
  citations.value.forEach(citation => {
    if (citation.year) years.add(citation.year)
  })
  return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)) // Sort descending
})

// Method to handle search input with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const handleSearch = (query: string) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    searchQuery.value = query
  }, 300) // 300ms debounce
}

// Filter and sort citations
const filteredAndSortedCitations = computed(() => {
  if (!citations.value.length) return []
  
  // First filter
  let filtered = citations.value.filter((citation: CitationEntry) => {
    // Text search
    let textMatch = true
    if (searchQuery.value && searchQuery.value.trim() !== '') {
      const query = searchQuery.value.toLowerCase().trim()
      textMatch = (
        (citation.title?.toLowerCase().includes(query) || false) || 
        (citation.authors?.some(author => author.toLowerCase().includes(query)) || false) ||
        (citation.journal?.toLowerCase().includes(query) || false)
      )
    }
    
    // Year filter
    const yearMatch = yearFilter.value === 'all' || citation.year === yearFilter.value
    
    return textMatch && yearMatch
  })
  
  // Then sort
  return filtered.sort((a, b) => {
    if (sortField.value === 'authors') {
      const aName = a.authors[0]?.split(' ').pop() || ''
      const bName = b.authors[0]?.split(' ').pop() || ''
      return sortDirection.value === 'asc' 
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName)
    }
    
    if (sortField.value === 'year') {
      return sortDirection.value === 'asc'
        ? parseInt(a.year) - parseInt(b.year)
        : parseInt(b.year) - parseInt(a.year)
    }
    
    const aValue = a[sortField.value]
    const bValue = b[sortField.value]
    
    return sortDirection.value === 'asc'
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue))
  })
})

// Toggle sort direction
const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

// Set sort field
const setSortField = (field: 'authors' | 'year' | 'title' | 'key') => {
  if (sortField.value === field) {
    toggleSortDirection()
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

// Copy bibliography to clipboard
const copyBibliography = () => {
  const bibText = filteredAndSortedCitations.value.map((citation, index) => {
    return `[${getCitationNumber(citation.key)}] ${formatCitation(citation, style.value, index).text}`
  }).join('\n\n')
  
  navigator.clipboard.writeText(bibText)
  toast('Bibliography copied to clipboard')
}

// Export bibliography
const exportBibliography = () => {
  const bibText = filteredAndSortedCitations.value.map((citation, index) => {
    return `[${getCitationNumber(citation.key)}] ${formatCitation(citation, style.value, index).text}`
  }).join('\n\n')
  
  const blob = new Blob([bibText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.value || 'References'}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast('Bibliography exported')
}

// Clear all filters
const clearFilters = () => {
  searchQuery.value = ''
  typeFilter.value = 'all'
  yearFilter.value = 'all'
  sortField.value = 'authors'
  sortDirection.value = 'asc'
}

// Method to directly handle style changes
const handleStyleChange = (newStyle: string) => {
  props.updateAttributes({ style: newStyle })
  nextTick(() => refreshBibliography())
}

// Method to handle year filter changes
const handleYearChange = (newYear: string) => {
  yearFilter.value = newYear
}

// Method to handle type filter changes
const handleTypeChange = (newType: string) => {
  typeFilter.value = newType
}

// Method to copy a single citation
const copySingleCitation = (citation: CitationEntry, index: number) => {
  const citationText = formatCitation(citation, style.value, index).text
  navigator.clipboard.writeText(citationText)
  toast('Citation copied to clipboard')
}

// Method to export a single citation
const exportSingleCitation = (citation: CitationEntry, index: number) => {
  const citationText = formatCitation(citation, style.value, index).text
  const blob = new Blob([citationText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.value || 'References'} - Citation ${index + 1}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast('Citation exported')
}

// Toggle visibility of references
const toggleReferences = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <NodeViewWrapper class="bibliography-wrapper">
    <div class="bibliography-header flex justify-between items-start" :class="{ 'collapsed': !isExpanded }">
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-bold mb-2">References</h2>
        <Button 
          variant="outline" 
          size="sm" 
          @click="toggleReferences" 
          :title="isExpanded ? 'Collapse references list' : 'Expand references list'"
          class="mb-2 bibliography-toggle-btn"
        >
          <span class="mr-1">{{ isExpanded ? 'Hide' : 'Show' }}</span>
          <ChevronUp v-if="isExpanded" class="h-4 w-4" />
          <ChevronDown v-else class="h-4 w-4" />
        </Button>
      </div>
      
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="copyBibliography" title="Copy all references">
          <Copy class="h-4 w-4 mr-1" />
          <span>Copy</span>
        </Button>
        
        <Button variant="outline" size="sm" @click="exportBibliography" title="Export all references">
          <FileText class="h-4 w-4 mr-1" />
          <span>Export</span>
        </Button>
        
        <select 
          :value="style" 
          @change="(e) => handleStyleChange((e.target as HTMLSelectElement).value)"
          class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option v-for="s in styles" :key="s.value" :value="s.value">
            {{ s.label }}
          </option>
        </select>
      </div>
    </div>
    
    <div v-if="citations.length === 0" v-show="isExpanded" class="text-muted-foreground text-sm italic py-4 bibliography-content">
      No citations in this document. Add citations using the References sidebar.
    </div>
    
    <div v-else v-show="isExpanded" class="bibliography-content">
      <!-- Search and filter bar -->
      <div class="mb-4 flex flex-wrap gap-2">
        <div class="relative flex-grow">
          <div class="relative flex-grow flex items-center">
            <Search class="absolute left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              :value="searchQuery"
              @input="(e: Event) => handleSearch((e.target as HTMLInputElement).value)"
              placeholder="Search citations..."
              class="pl-8"
            />
          </div>
        </div>
        
        <div class="flex gap-2">
          <select 
            v-if="citationTypes.length > 0"
            v-model="typeFilter"
            @change="(e) => handleTypeChange((e.target as HTMLSelectElement).value)"
            class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-[120px]"
          >
            <option value="all">All types</option>
            <option v-for="type in citationTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
          
          <select 
            v-if="citationYears.length > 0"
            :value="yearFilter" 
            @change="(e) => handleYearChange((e.target as HTMLSelectElement).value)"
            class="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-[100px]"
          >
            <option value="all">All years</option>
            <option v-for="year in citationYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
          
          <Button variant="outline" size="icon" @click="clearFilters" v-if="searchQuery || typeFilter !== 'all' || yearFilter !== 'all'">
            <Filter class="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <!-- Sort controls -->
      <div class="flex mb-4 text-xs font-medium text-muted-foreground border-b pb-2">
        <div class="w-[3rem]">#</div>
        <div 
          class="flex-1 flex items-center cursor-pointer" 
          @click="setSortField('authors')"
          :class="{ 'text-primary': sortField === 'authors' }"
        >
          Author
          <SortAsc v-if="sortField === 'authors' && sortDirection === 'asc'" class="ml-1 h-3 w-3" />
          <SortDesc v-if="sortField === 'authors' && sortDirection === 'desc'" class="ml-1 h-3 w-3" />
        </div>
        <div 
          class="w-20 flex items-center cursor-pointer" 
          @click="setSortField('year')"
          :class="{ 'text-primary': sortField === 'year' }"
        >
          Year
          <SortAsc v-if="sortField === 'year' && sortDirection === 'asc'" class="ml-1 h-3 w-3" />
          <SortDesc v-if="sortField === 'year' && sortDirection === 'desc'" class="ml-1 h-3 w-3" />
        </div>
        <div 
          class="flex-1 flex items-center cursor-pointer" 
          @click="setSortField('title')"
          :class="{ 'text-primary': sortField === 'title' }"
        >
          Title
          <SortAsc v-if="sortField === 'title' && sortDirection === 'asc'" class="ml-1 h-3 w-3" />
          <SortDesc v-if="sortField === 'title' && sortDirection === 'desc'" class="ml-1 h-3 w-3" />
        </div>
      </div>
      
      <!-- Citation list with filter results message -->
      <div v-if="filteredAndSortedCitations.length === 0" class="text-muted-foreground text-sm italic py-4">
        No citations match your filters. <Button variant="link" @click="clearFilters" class="p-0 h-auto">Clear filters</Button>
      </div>
      
      <div v-else class="bibliography-list">
        <div 
          v-for="(citation, index) in filteredAndSortedCitations" 
          :key="citation.id"
          class="bibliography-item group hover:bg-muted/60 rounded-md transition-colors"
          :class="{ 'hanging-indent': formatCitation(citation, style, index).indent }"
        >
          <div class="flex items-start">
            <span class="bibliography-number flex-shrink-0">[{{ getCitationNumber(citation.key) }}]</span>
            <div class="flex-grow">
              <span class="bibliography-text">{{ formatCitation(citation, style, index).text }}</span>
              
              <div class="mt-1 flex gap-2 items-center text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <span v-if="citation.doi" class="underline">
                  <a :href="`https://doi.org/${citation.doi}`" target="_blank" class="hover:text-primary">DOI</a>
                </span>
                <span v-if="citation.url" class="underline">
                  <a :href="citation.url" target="_blank" class="hover:text-primary">URL</a>
                </span>
                <Button variant="ghost" size="icon" class="h-6 w-6" @click="() => copySingleCitation(citation, index)" title="Copy citation">
                  <Copy class="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" class="h-6 w-6" @click="() => exportSingleCitation(citation, index)" title="Export citation">
                  <FileText class="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Count -->
      <div class="text-xs text-muted-foreground mt-4 text-right">
        Showing {{ filteredAndSortedCitations.length }} of {{ citations.length }} citations
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style>
.bibliography-wrapper {
  @apply my-6 p-4 rounded-md border border-border bg-muted/20;
}

.bibliography-header {
  @apply flex justify-between items-start mb-4;
}

.bibliography-header.collapsed {
  @apply mb-0 pb-1;
}

.bibliography-list {
  @apply space-y-4;
}

.bibliography-item {
  @apply text-sm leading-relaxed py-2 px-2 rounded-md transition-colors;
}

.bibliography-item:hover {
  @apply bg-muted/60;
}

.hanging-indent {
  @apply pl-10 -indent-10;
}

.bibliography-number {
  @apply mr-2 font-semibold text-primary inline-block min-w-[2rem];
}

.bibliography-toggle-btn {
  @apply flex items-center transition-all duration-200;
}

.bibliography-toggle-btn:hover {
  @apply bg-muted/80;
}

.bibliography-content {
  @apply transition-all duration-300;
}
</style> 