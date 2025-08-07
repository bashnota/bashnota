<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCitationStore } from '@/features/editor/stores/citationStore'
import { useCitationPicker } from '@/features/editor/composables/useCitationPicker'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, BookIcon, Loader2, ChevronUp, ChevronDown, Filter, SortAsc, SortDesc, Library, Plus, ExternalLink } from 'lucide-vue-next'
import type { CitationEntry } from '@/features/nota/types/nota'
import { toast } from 'vue-sonner'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const { state, closeCitationPicker, selectCitation } = useCitationPicker()

const citationStore = useCitationStore()
const searchQuery = ref('')
const selectedIndex = ref(0)
const isSearching = ref(false)
const searchResults = ref<CitationEntry[]>([])
const activeTab = ref('library')
const searchInput = ref<HTMLInputElement | null>(null)
const citationStyle = ref('numeric') // numeric, author-year, or custom
const citationFormat = ref('short') // short, full, or custom
const sortField = ref<'authors' | 'year' | 'title' | 'key'>('authors')
const sortDirection = ref<'asc' | 'desc'>('asc')
const typeFilter = ref('all')
const yearFilter = ref<string>('all')
const showFilters = ref(false)

// Get citations for the current nota
const citations = computed(() => {
  if (!state.value.notaId) return []
  return citationStore.getCitationsByNotaId(state.value.notaId)
})

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

const performSearch = async (service?: string) => {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  searchResults.value = []
  
  try {
    const searchService = service || 'crossref'
    const serviceConfig = searchServices[searchService as keyof typeof searchServices]
    const results = await serviceConfig.search(searchQuery.value)
    searchResults.value = results
    
    // Switch to search tab if we have results
    if (results.length > 0) {
      activeTab.value = 'search'
    }
  } catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const handleSearchButtonClick = (event: MouseEvent, service: string) => {
  event.preventDefault()
  performSearch(service)
}

const handleSearch = (event: MouseEvent) => {
  event.preventDefault()
  performSearch()
}

const handleClose = () => {
  closeCitationPicker()
}

const handleSelect = (citation: CitationEntry) => {
  const index = citations.value.findIndex(c => c.key === citation.key)
  selectCitation(citation, index)
}

const handleSearchSelect = async (citation: CitationEntry) => {
  try {
    if (!state.value.notaId) return
    
    // Add the citation to the store
    const newCitation = await citationStore.addCitation(state.value.notaId, {
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
      selectCitation(newCitation, index)
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
  handleClose()
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
    handleClose()
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
  <Dialog :open="state.isOpen" @update:open="(value) => { if (!value) handleClose() }">
    <DialogContent class="max-w-4xl grid-rows-[auto_1fr] p-0 max-h-[90dvh]">
      <DialogHeader class="p-6 pb-0">
        <DialogTitle class="flex items-center gap-2">
          <BookIcon class="h-5 w-5" />
          Citation Manager
        </DialogTitle>
        <DialogDescription>
          Search for citations, manage your library, and insert references into your document.
        </DialogDescription>
      </DialogHeader>

      <div class="overflow-y-auto px-6 pb-6 min-h-0">
        <Tabs v-model="activeTab" class="flex flex-col h-full">
          <TabsList class="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="library" class="flex items-center gap-2">
              <Library class="h-4 w-4" />
              Library ({{ citations.length }})
            </TabsTrigger>
            <TabsTrigger value="search" class="flex items-center gap-2">
              <Search class="h-4 w-4" />
              Search Online
            </TabsTrigger>
            <TabsTrigger value="add" class="flex items-center gap-2">
              <Plus class="h-4 w-4" />
              Add Manual
            </TabsTrigger>
          </TabsList>

          <!-- Library Tab -->
          <TabsContent value="library" class="flex flex-col space-y-4">
          <!-- Search and Filters -->
          <div class="space-y-3">
            <div class="flex gap-2">
              <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref="searchInput"
                  v-model="searchQuery"
                  placeholder="Search your citations..."
                  class="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                @click="showFilters = !showFilters"
                :class="{ 'bg-accent': showFilters }"
              >
                <Filter class="h-4 w-4" />
              </Button>
            </div>

            <!-- Filters Row -->
            <div v-if="showFilters" class="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Select v-model="yearFilter">
                <SelectTrigger class="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem v-for="year in availableYears" :key="year" :value="year">
                    {{ year }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select v-model="typeFilter">
                <SelectTrigger class="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="journal">Journal</SelectItem>
                  <SelectItem value="book">Book</SelectItem>
                </SelectContent>
              </Select>

              <Select v-model="sortField">
                <SelectTrigger class="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="authors">Authors</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="key">Key</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="icon"
                @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
              >
                <SortAsc v-if="sortDirection === 'asc'" class="h-4 w-4" />
                <SortDesc v-else class="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm" @click="clearFilters" class="ml-auto">
                Clear Filters
              </Button>
            </div>
          </div>

          <!-- Citation List -->
          <div class="overflow-y-auto border rounded-lg max-h-[50vh]">
            <div v-if="filteredCitations.length === 0" class="p-8 text-center space-y-4">
              <BookIcon class="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 class="font-medium">No citations found</h3>
                <p class="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or search in the online tab
                </p>
              </div>
              <Button variant="outline" @click="activeTab = 'search'">
                Search Online
              </Button>
            </div>

            <div v-else class="space-y-1 p-2">
              <div
                v-for="(citation, index) in filteredCitations"
                :key="citation.id"
                class="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                :class="{ 'bg-accent': index === selectedIndex }"
                @click="handleSelect(citation)"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-sm leading-tight mb-1">{{ citation.title }}</h4>
                    <p class="text-xs text-muted-foreground">
                      {{ citation.authors?.join(', ') || 'Unknown authors' }}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <span v-if="citation.year" class="text-xs text-muted-foreground">{{ citation.year }}</span>
                      <span v-if="citation.journal" class="text-xs italic text-muted-foreground">{{ citation.journal }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 ml-3">
                    <div class="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                      [{{ index + 1 }}]
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- Search Tab -->
        <TabsContent value="search" class="flex flex-col space-y-4">
          <div class="space-y-3">
            <div class="flex gap-2">
              <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  v-model="searchQuery"
                  placeholder="Search for papers, authors, or DOIs..."
                  class="pl-10"
                  @keyup.enter="performSearch()"
                />
              </div>
              <Button 
                :disabled="isSearching || !searchQuery.trim()"
                @click="performSearch()"
              >
                <Loader2 v-if="isSearching" class="h-4 w-4 animate-spin mr-2" />
                <Search v-else class="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            <!-- Search Service Buttons -->
            <div class="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                :disabled="isSearching || !searchQuery.trim()"
                @click="performSearch('crossref')"
              >
                🔍 Crossref
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                :disabled="isSearching || !searchQuery.trim()"
                @click="performSearch('semanticScholar')"
              >
                🎓 Semantic Scholar
              </Button>
            </div>
          </div>

          <!-- Search Results -->
          <div class="overflow-y-auto border rounded-lg max-h-[50vh]">
            <div v-if="isSearching" class="p-8 text-center">
              <Loader2 class="h-8 w-8 animate-spin mx-auto mb-4" />
              <p class="text-sm text-muted-foreground">Searching academic databases...</p>
            </div>

            <div v-else-if="searchResults.length === 0 && searchQuery.trim()" class="p-8 text-center space-y-4">
              <Search class="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 class="font-medium">No results found</h3>
                <p class="text-sm text-muted-foreground mt-1">
                  Try different keywords or check spelling
                </p>
              </div>
            </div>

            <div v-else-if="searchResults.length === 0" class="p-8 text-center space-y-4">
              <Search class="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 class="font-medium">Search Academic Papers</h3>
                <p class="text-sm text-muted-foreground mt-1">
                  Enter keywords, author names, or DOIs to find citations
                </p>
              </div>
            </div>

            <div v-else class="space-y-1 p-2">
              <div
                v-for="(result, index) in searchResults"
                :key="result.key"
                class="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                :class="{ 'bg-accent': index === selectedIndex }"
                @click="handleSearchSelect(result)"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-sm leading-tight mb-1">{{ result.title }}</h4>
                    <p class="text-xs text-muted-foreground">
                      {{ result.authors?.join(', ') || 'Unknown authors' }}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <span v-if="result.year" class="text-xs text-muted-foreground">{{ result.year }}</span>
                      <span v-if="result.journal" class="text-xs italic text-muted-foreground">{{ result.journal }}</span>
                      <ExternalLink v-if="result.url" class="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" class="ml-3">
                    <Plus class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- Add Manual Tab -->
        <TabsContent value="add" class="flex flex-col space-y-4">
          <div class="p-8 text-center space-y-4">
            <Plus class="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 class="font-medium">Add Citation Manually</h3>
              <p class="text-sm text-muted-foreground mt-1">
                Manual citation entry coming soon
              </p>
            </div>
            <Button variant="outline" @click="handleJumpToReferences">
              <BookIcon class="h-4 w-4 mr-2" />
              Go to References Manager
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
/* Custom styles if needed */
</style>
 







