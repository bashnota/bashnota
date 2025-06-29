<script setup lang="ts">
import { computed } from 'vue'
import { Edit, Trash2, ExternalLink, Copy } from 'lucide-vue-next'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import type { CitationEntry } from '@/features/nota/types/nota'
import { toast } from '@/lib/utils'

const props = defineProps<{
  citations: CitationEntry[]
}>()

const emit = defineEmits<{
  edit: [citation: CitationEntry]
  delete: [id: string]
  insert: [citation: CitationEntry]
}>()

// Format authors for display
const formatAuthors = (authors: string[]) => {
  if (!authors || authors.length === 0) return 'Unknown Author'
  if (authors.length === 1) return authors[0]
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`
  return `${authors[0]} et al.`
}

// Format citation display
const formatCitationDisplay = (citation: CitationEntry) => {
  const authorsFormatted = formatAuthors(citation.authors)
  let formatted = `${authorsFormatted} (${citation.year})`
  
  if (citation.journal) {
    formatted += `. ${citation.title}.`
    formatted += ` ${citation.journal}`
    if (citation.volume) {
      formatted += ` ${citation.volume}`
      if (citation.number) {
        formatted += `(${citation.number})`
      }
    }
    if (citation.pages) {
      formatted += `: ${citation.pages}`
    }
  } else {
    formatted += `. ${citation.title}.`
    if (citation.publisher) {
      formatted += ` ${citation.publisher}.`
    }
  }
  
  return formatted
}

// Copy citation to clipboard
const copyCitation = async (citation: CitationEntry) => {
  try {
    await navigator.clipboard.writeText(formatCitationDisplay(citation))
    toast('Citation copied to clipboard')
  } catch (error) {
    console.error('Failed to copy citation:', error)
    toast('Failed to copy citation', 'destructive')
  }
}

// Get citation type badge
const getCitationType = (citation: CitationEntry) => {
  if (citation.journal) return 'Journal'
  if (citation.publisher) return 'Book'
  return 'Other'
}

// Get citation type color
const getCitationTypeColor = (type: string) => {
  switch (type) {
    case 'Journal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'Book': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="citation in citations"
      :key="citation.id"
      class="group relative p-4 border rounded-lg hover:border-primary/50 transition-all duration-200 hover:shadow-sm bg-card"
    >
      <!-- Citation Header -->
      <div class="flex justify-between items-start gap-3 mb-3">
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-sm mb-1 line-clamp-2 leading-tight">
            {{ citation.title || 'Untitled Reference' }}
          </h4>
          <p class="text-xs text-muted-foreground mb-2">
            {{ formatAuthors(citation.authors) }} • {{ citation.year }}
          </p>
        </div>
        
        <!-- Citation Type Badge -->
        <Badge 
          variant="secondary" 
          class="text-xs shrink-0"
          :class="getCitationTypeColor(getCitationType(citation))"
        >
          {{ getCitationType(citation) }}
        </Badge>
      </div>

      <!-- Citation Details -->
      <div class="text-xs text-muted-foreground mb-3 line-clamp-2">
        <span v-if="citation.journal" class="font-medium">{{ citation.journal }}</span>
        <span v-else-if="citation.publisher" class="font-medium">{{ citation.publisher }}</span>
        <span v-if="citation.volume"> Vol. {{ citation.volume }}</span>
        <span v-if="citation.number">({{ citation.number }})</span>
        <span v-if="citation.pages">, pp. {{ citation.pages }}</span>
      </div>

      <!-- Links -->
      <div v-if="citation.doi || citation.url" class="flex flex-wrap gap-2 mb-3">
        <a 
          v-if="citation.doi" 
          :href="`https://doi.org/${citation.doi}`" 
          target="_blank" 
          class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          <ExternalLink class="h-3 w-3" />
          DOI
        </a>
        <a 
          v-if="citation.url" 
          :href="citation.url" 
          target="_blank" 
          class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          <ExternalLink class="h-3 w-3" />
          URL
        </a>
      </div>

      <!-- Actions -->
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            class="h-7 text-xs px-2"
            @click="$emit('insert', citation)"
          >
            Insert Citation
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            class="h-7 w-7 p-0"
            @click="copyCitation(citation)"
          >
            <Copy class="h-3 w-3" />
          </Button>
        </div>
        
        <div class="flex items-center gap-1">
          <!-- Citation Key -->
          <code class="text-xs bg-muted px-2 py-1 rounded font-mono">
            {{ citation.key }}
          </code>
          
          <!-- Edit/Delete Actions -->
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              class="h-7 w-7 p-0"
              @click="$emit('edit', citation)"
            >
              <Edit class="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              class="h-7 w-7 p-0 text-destructive hover:text-destructive"
              @click="$emit('delete', citation.id)"
            >
              <Trash2 class="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style> 