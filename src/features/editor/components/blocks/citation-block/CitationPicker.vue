<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCitationStore } from '@/features/editor/stores/citationStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, BookIcon, Loader2, X, ChevronUp, ChevronDown } from 'lucide-vue-next'
import type { CitationEntry } from '@/features/nota/types/nota'
import { toast } from 'vue-sonner'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const props = defineProps<{
  notaId: string
  onSelect: (citation: CitationEntry, index: number) => void
  onClose: () => void
}>()

const emit = defineEmits<{
  close: []
}>()

const citationStore = useCitationStore()
const searchQuery = ref('')
const selectedIndex = ref(0)
const isSearching = ref(false)
const searchResults = ref<CitationEntry[]>([])
const activeSearchTab = ref('crossref')
const searchInput = ref<HTMLInputElement | null>(null)
const citationStyle = ref('numeric') // numeric, author-year, or custom
const citationFormat = ref('short') // short, full, or custom
const sortField = ref<'authors' | 'year' | 'title' | 'key'>('authors')
const sortDirection = ref<'asc' | 'desc'>('asc')
const typeFilter = ref('all')
const yearFilter = ref<string>('all')

// Get citations for the current nota
const citations = computed(() => citationStore.getCitationsByNotaId(props.notaId))

// Available years for filtering
const availableYears = computed(() => {
  const years = new Set<string>()
  citations.value.forEach(citation => {
    if (citation.year) years.add(citation.year)
  })
  return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a))
})

// Filter and sort citations
const filteredCitations = computed(() => {
  let filtered = citations.value

  // Apply search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(citation => {
      return (
        (citation.title || '').toLowerCase().includes(query) ||
        citation.key.toLowerCase().includes(query) ||
        (citation.authors || []).some(author => author.toLowerCase().includes(query)) ||
        (citation.journal || '').toLowerCase().includes(query) ||
        (citation.publisher || '').toLowerCase().includes(query)
      )
    })
  }

  // Apply year filter
  if (yearFilter.value !== 'all') {
    filtered = filtered.filter(citation => citation.year.toString() === yearFilter.value)
  }

  // Apply type filter
  if (typeFilter.value !== 'all') {
    filtered = filtered.filter(citation => {
      if (typeFilter.value === 'journal') return !!citation.journal
      if (typeFilter.value === 'book') return !!citation.publisher
      return true
    })
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let comparison = 0
    switch (sortField.value) {
      case 'authors':
        const aAuthor = a.authors?.[0]?.split(' ').pop() || ''
        const bAuthor = b.authors?.[0]?.split(' ').pop() || ''
        comparison = aAuthor.localeCompare(bAuthor)
        break
      case 'year':
        comparison = parseInt(b.year || '0') - parseInt(a.year || '0')
        break
      case 'title':
        comparison = (a.title || '').localeCompare(b.title || '')
        break
      case 'key':
        comparison = a.key.localeCompare(b.key)
        break
    }
    return sortDirection.value === 'asc' ? comparison : -comparison
  })

  return filtered
})

// Format citation based on style and format
const formatCitation = (citation: CitationEntry) => {
  if (citationFormat.value === 'short') {
    return `[${citation.key}]`
  }
  
  if (citationStyle.value === 'author-year') {
    const authors = citation.authors?.slice(0, 2).join(' & ') || ''
    return `${authors} (${citation.year})`
  }
  
  return `[${citation.key}]`
}

// Search services with improved error handling and rate limiting
const searchServices = {
  crossref: {
    name: 'Crossref',
    icon: '🔍',
    search: async (query: string) => {
      try {
        const response = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=10`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
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
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=title,authors,year,venue,url,paperId`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          method: 'GET'
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(`HTTP error! status: ${response.status}${errorData ? ` - ${JSON.stringify(errorData)}` : ''}`)
        }
        const data = await response.json()
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid response format from Semantic Scholar')
        }
        return data.data.map((item: any) => ({
          key: item.paperId || `ss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: item.title || '',
          authors: item.authors?.map((a: any) => a.name) || [],
          year: item.year || '',
          journal: item.venue || '',
          url: item.url || ''
        }))
      } catch (error) {
        console.error('Semantic Scholar search error:', error)
        toast('Failed to search Semantic Scholar. Please try again.', { description: 'Error' })
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
  searchResults.value = []
  
  try {
    const service = searchServices[activeSearchTab.value as keyof typeof searchServices]
    const results = await service.search(searchQuery.value)
    searchResults.value = results
  } catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const handleSearchButtonClick = (event: MouseEvent, service: string) => {
  event.preventDefault()
  activeSearchTab.value = service
  performSearch()
}

const handleSearch = (event: MouseEvent) => {
  event.preventDefault()
  performSearch()
}

const handleClose = (event: MouseEvent) => {
  event.preventDefault()
  emit('close')
}

const handleSelect = (citation: CitationEntry) => {
  const index = citations.value.findIndex(c => c.key === citation.key)
  props.onSelect(citation, index)
  emit('close')
}

const handleSearchSelect = async (citation: CitationEntry) => {
  try {
    // Add the citation to the store
    const newCitation = await citationStore.addCitation(props.notaId, {
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
    
    if (newCitation) {
      const index = citations.value.length // New citation will be at the end
      props.onSelect(newCitation, index)
      emit('close')
      toast('Citation added successfully', { description: 'Success' })
    }
  } catch (error) {
    console.error('Error importing citation:', error)
    toast('Failed to add citation. Please try again.', { description: 'Error' })
  }
}

const handleJumpToReferences = (event: MouseEvent) => {
  event.preventDefault()
  jumpToReferences()
}

const jumpToReferences = () => {
  const event = new CustomEvent('toggle-references', { detail: { open: true } })
  window.dispatchEvent(event)
  emit('close')
}

// Keyboard navigation with improved UX
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (searchResults.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % searchResults.value.length
    } else if (filteredCitations.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredCitations.value.length
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (searchResults.value.length > 0) {
      selectedIndex.value = (selectedIndex.value - 1 + searchResults.value.length) % searchResults.value.length
    } else if (filteredCitations.value.length > 0) {
      selectedIndex.value = (selectedIndex.value - 1 + filteredCitations.value.length) % filteredCitations.value.length
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (searchResults.value.length > 0) {
      handleSearchSelect(searchResults.value[selectedIndex.value])
    } else if (filteredCitations.value.length > 0) {
      handleSelect(filteredCitations.value[selectedIndex.value])
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value
}

// Add new methods for sorting and filtering
const toggleSort = (field: 'authors' | 'year' | 'title' | 'key') => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  yearFilter.value = 'all'
  typeFilter.value = 'all'
  sortField.value = 'authors'
  sortDirection.value = 'asc'
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  // Focus the search input
  searchInput.value?.focus()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="citation-picker w-80 max-w-[90vw] rounded-md border shadow-lg max-h-[60vh] overflow-hidden flex flex-col">
    <!-- Header with search -->
    <div class="p-2 border-b sticky top-0 bg-background z-10">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center">
          <BookIcon class="h-4 w-4 mr-1 text-muted-foreground" />
          <span class="text-sm font-medium">Select a citation</span>
        </div>
        <Button variant="ghost" size="sm" @click="handleClose">
          <X class="h-4 w-4" />
        </Button>
      </div>
      
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref="searchInput"
            :value="searchQuery"
            @input="handleInput"
            placeholder="Search citations..."
            class="w-full pl-8"
            @keyup.enter="handleSearch"
          />
        </div>
        <Button 
          variant="outline" 
          size="icon"
          :disabled="isSearching"
          @click="handleSearch"
        >
          <Search v-if="!isSearching" class="h-4 w-4" />
          <Loader2 v-else class="h-4 w-4 animate-spin" />
        </Button>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2 mt-2">
        <Select v-model="yearFilter" class="w-24">
          <SelectTrigger>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            <SelectItem v-for="year in availableYears" :key="year" :value="year.toString()">
              {{ year }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select v-model="typeFilter" class="w-24">
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="journal">Journal</SelectItem>
            <SelectItem value="book">Book</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" @click="clearFilters" class="ml-auto">
          Clear Filters
        </Button>
      </div>
    </div>
    
    <!-- Content -->
    <div class="overflow-y-auto flex-grow">
      <!-- Loading state -->
      <div v-if="isSearching" class="p-4 text-center">
        <Loader2 class="h-6 w-6 animate-spin mx-auto mb-2" />
        <p class="text-sm text-muted-foreground">Searching...</p>
      </div>
      
      <!-- Empty state -->
      <div v-else-if="filteredCitations.length === 0 && !searchResults.length" class="p-4 space-y-4">
        <div class="text-center text-sm text-muted-foreground">
          <p class="mb-2">No citations found</p>
          <p class="text-xs">Search for papers or add them manually</p>
        </div>
        
        <div class="flex flex-col gap-2">
          <Button 
            variant="default" 
            size="sm" 
            @click="(e) => handleSearchButtonClick(e, 'crossref')"
            class="w-full"
          >
            <Search class="h-4 w-4 mr-2" />
            Search in Crossref
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            @click="(e) => handleSearchButtonClick(e, 'semanticScholar')"
            class="w-full"
          >
            <Search class="h-4 w-4 mr-2" />
            Search in Semantic Scholar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            @click="handleJumpToReferences"
            class="w-full"
          >
            <BookIcon class="h-4 w-4 mr-2" />
            Go to References
          </Button>
        </div>
      </div>
      
      <!-- Search results -->
      <div v-else-if="searchResults.length > 0" class="p-1 space-y-1">
        <div
          v-for="(result, index) in searchResults"
          :key="result.key"
          class="p-2 rounded-md border hover:bg-accent cursor-pointer"
          :class="{ 'bg-accent': index === selectedIndex }"
          @click="handleSearchSelect(result)"
        >
          <div class="font-medium text-sm">{{ result.title }}</div>
          <div class="text-xs text-muted-foreground">
            {{ result.authors?.join(', ') }} ({{ result.year }})
          </div>
          <div v-if="result.journal" class="text-xs italic text-muted-foreground">
            {{ result.journal }}
          </div>
        </div>
      </div>
      
      <!-- Citation list -->
      <div v-else class="p-1">
        <!-- Sort headers -->
        <div class="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b">
          <div class="flex-1 cursor-pointer" @click="toggleSort('authors')">
            Authors
            <ChevronUp v-if="sortField === 'authors' && sortDirection === 'asc'" class="h-3 w-3 inline" />
            <ChevronDown v-if="sortField === 'authors' && sortDirection === 'desc'" class="h-3 w-3 inline" />
          </div>
          <div class="w-16 cursor-pointer" @click="toggleSort('year')">
            Year
            <ChevronUp v-if="sortField === 'year' && sortDirection === 'asc'" class="h-3 w-3 inline" />
            <ChevronDown v-if="sortField === 'year' && sortDirection === 'desc'" class="h-3 w-3 inline" />
          </div>
          <div class="w-16 text-right">Ref</div>
        </div>

        <div class="space-y-1">
          <div
            v-for="(citation, index) in filteredCitations"
            :key="citation.id"
            class="p-2 rounded-md border hover:bg-accent cursor-pointer"
            :class="{ 'bg-accent': index === selectedIndex }"
            @click="handleSelect(citation)"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="font-medium text-sm truncate">{{ citation.title }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ citation.authors?.join(', ') }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="text-xs text-muted-foreground w-16 text-right">
                  {{ citation.year }}
                </div>
                <div class="px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  [{{ index + 1 }}]
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.citation-picker {
  @apply bg-background border-border;
}

.sort-header {
  @apply cursor-pointer hover:text-foreground transition-colors;
}

.sort-header.active {
  @apply text-foreground;
}
</style>
 







