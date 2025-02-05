<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotaStore } from '@/stores/nota'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/solid'

const router = useRouter()
const store = useNotaStore()
const searchQuery = ref('')
const showResults = ref(false)
const selectedIndex = ref(0)

const searchResults = computed(() => {
  if (!searchQuery.value) return []
  
  const query = searchQuery.value.toLowerCase()
  const results = []
  
  // Search in notas
  store.notas.forEach(nota => {
    const titleMatch = nota.title.toLowerCase().includes(query)
    const contentMatch = nota.content.toLowerCase().includes(query)
    if (titleMatch || contentMatch) {
      results.push({
        id: nota.id,
        title: nota.title,
        preview: contentMatch ? highlightMatch(nota.content, query) : null,
        type: 'nota',
        path: `/nota/${nota.id}`
      })
    }
  })
  
  // Search in pages
  store.pages.forEach(page => {
    const titleMatch = page.title.toLowerCase().includes(query)
    const contentMatch = page.content.toLowerCase().includes(query)
    if (titleMatch || contentMatch) {
      results.push({
        id: page.id,
        title: page.title,
        preview: contentMatch ? highlightMatch(page.content, query) : null,
        type: 'page',
        path: `/page/${page.id}`
      })
    }
  })
  
  return results
})

const highlightMatch = (text: string, query: string) => {
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return null
  
  const start = Math.max(0, index - 40)
  const end = Math.min(text.length, index + query.length + 40)
  let preview = text.slice(start, end)
  
  if (start > 0) preview = '...' + preview
  if (end < text.length) preview = preview + '...'
  
  return preview.replace(
    new RegExp(query, 'gi'),
    match => `<mark class="highlight">${match}</mark>`
  )
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!searchResults.value.length) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = (selectedIndex.value + 1) % searchResults.value.length
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = selectedIndex.value - 1 < 0 
        ? searchResults.value.length - 1 
        : selectedIndex.value - 1
      break
    case 'Enter':
      event.preventDefault()
      const selected = searchResults.value[selectedIndex.value]
      if (selected) navigateToResult(selected.path)
      break
    case 'Escape':
      event.preventDefault()
      showResults.value = false
      break
  }
}

// Reset selected index when results change
watch(searchResults, () => {
  selectedIndex.value = 0
})

const navigateToResult = (path: string) => {
  searchQuery.value = ''
  showResults.value = false
  router.push(path)
}
</script>

<template>
  <div class="global-search">
    <div class="search-input-container">
      <MagnifyingGlassIcon class="search-icon" style="width: 12px; height: 12px;" />
      <input
        v-model="searchQuery"
        placeholder="Search all notas and pages..."
        @focus="showResults = true"
        @blur="setTimeout(() => showResults = false, 200)"
        @keydown="handleKeydown"
      />
    </div>
    
    <div v-if="showResults && searchResults.length" class="search-results">
      <div 
        v-for="(result, index) in searchResults" 
        :key="result.id"
        class="search-result"
        :class="{'selected': index === selectedIndex}"
        @click="navigateToResult(result.path)"
        @mouseover="selectedIndex = index"
      >
        <span class="result-icon">
          {{ result.type === 'nota' ? '📁' : '📄' }}
        </span>
        <div class="result-content">
          <div class="result-title">{{ result.title }}</div>
          <div 
            v-if="result.preview" 
            class="result-preview"
            v-html="result.preview"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.global-search {
  position: relative;
  width: 100%;
  max-width: 300px;
}

.search-input-container {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-light);
}

input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  font-size: 0.875rem;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 50;
  max-height: 300px;
  overflow-y: auto;
}

.search-result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

.search-result:hover {
  background: var(--color-background-soft);
}

.result-icon {
  opacity: 0.7;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 0.875rem;
}

.result-preview {
  font-size: 0.75rem;
  color: var(--color-text-light);
  margin-top: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected {
  background: var(--color-background-mute);
}

:deep(.highlight) {
  background: var(--color-primary);
  color: white;
  border-radius: 2px;
  padding: 0 2px;
}
</style> 