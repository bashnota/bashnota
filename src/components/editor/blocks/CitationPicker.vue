<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCitationStore } from '@/stores/citationStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, BookIcon, Loader2, X } from 'lucide-vue-next'
import type { CitationEntry } from '@/types/nota'

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

// Get citations for the current nota
const citations = computed(() => citationStore.getCitationsByNotaId(props.notaId))

// Filter citations based on search query
const filteredCitations = computed(() => {
  if (!searchQuery.value.trim()) {
    return citations.value
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  return citations.value.filter(citation => {
    return (
      (citation.title || '').toLowerCase().includes(query) ||
      citation.key.toLowerCase().includes(query) ||
      (citation.authors || []).some(author => author.toLowerCase().includes(query)) ||
      (citation.journal || '').toLowerCase().includes(query) ||
      (citation.publisher || '').toLowerCase().includes(query)
    )
  })
})

// Search services
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
  }
}

const performSearch = async () => {
  console.log('performSearch called')
  console.log('searchQuery ref value:', searchQuery.value)
  console.log('searchInput ref value:', searchInput.value?.value)
  
  if (!searchQuery.value.trim()) {
    console.log('No search query provided')
    return
  }
  
  console.log('Performing search with query:', searchQuery.value)
  console.log('Using service:', activeSearchTab.value)
  
  isSearching.value = true
  try {
    const service = searchServices[activeSearchTab.value as keyof typeof searchServices]
    console.log('Searching with service:', service.name)
    
    const results = await service.search(searchQuery.value)
    console.log('Search results:', results)
    
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
  console.log('Search button clicked for service:', service)
  console.log('Current searchQuery ref value:', searchQuery.value)
  console.log('Current input value:', searchInput.value?.value)
  activeSearchTab.value = service
  performSearch()
}

const handleSearch = (event: MouseEvent) => {
  event.preventDefault()
  console.log('Search button clicked')
  console.log('Current searchQuery ref value:', searchQuery.value)
  console.log('Current input value:', searchInput.value?.value)
  performSearch()
}

const handleClose = (event: MouseEvent) => {
  event.preventDefault()
  emit('close')
}

const handleJumpToReferences = (event: MouseEvent) => {
  event.preventDefault()
  jumpToReferences()
}

const handleSelect = (citation: CitationEntry) => {
  const index = citations.value.findIndex(c => c.key === citation.key)
  props.onSelect(citation, index)
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
    
    // Call onSelect with the new citation and its index
    if (newCitation) {
      const index = citations.value.length // New citation will be at the end
      props.onSelect(newCitation, index)
      emit('close')
    }
  } catch (error) {
    console.error('Error importing citation:', error)
  }
}

const jumpToReferences = () => {
  // Toggle reference sidebar open
  const event = new CustomEvent('toggle-references', { detail: { open: true } })
  window.dispatchEvent(event)
  emit('close')
}

// Keyboard navigation
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (filteredCitations.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredCitations.value.length
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (filteredCitations.value.length > 0) {
      selectedIndex.value = (selectedIndex.value - 1 + filteredCitations.value.length) % filteredCitations.value.length
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (filteredCitations.value.length > 0) {
      const citation = filteredCitations.value[selectedIndex.value]
      handleSelect(citation)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  console.log('Input event triggered')
  console.log('Previous searchQuery value:', searchQuery.value)
  console.log('New input value:', target.value)
  searchQuery.value = target.value
  console.log('Updated searchQuery value:', searchQuery.value)
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
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
      
      <!-- No results found -->
      <div v-else-if="searchQuery && !isSearching" class="p-4 text-center text-sm text-muted-foreground">
        <p>No results found for "{{ searchQuery }}"</p>
        <p class="text-xs mt-1">Try a different search term</p>
      </div>
      
      <!-- Citation list -->
      <div v-else class="p-1 space-y-1">
        <div
          v-for="(citation, index) in filteredCitations"
          :key="citation.id"
          class="p-2 rounded-md border hover:bg-accent cursor-pointer"
          :class="{ 'bg-accent': index === selectedIndex }"
          @click="handleSelect(citation)"
        >
          <div class="flex items-center justify-between">
            <div class="font-medium text-sm truncate flex-1">{{ citation.title }}</div>
            <div class="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
              [{{ index + 1 }}]
            </div>
          </div>
          <div class="flex flex-col mt-1">
            <div class="text-xs text-muted-foreground">
              {{ citation.authors?.join(', ') }} ({{ citation.year }})
            </div>
            <div v-if="citation.journal" class="text-xs italic text-muted-foreground">
              {{ citation.journal }}
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
</style>
 