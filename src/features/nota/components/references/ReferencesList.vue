<script setup lang="ts">
import { computed } from 'vue'
import { Edit, Trash2, ExternalLink, Copy, MoreHorizontal } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CitationEntry } from '@/features/nota/types/nota'
import { toast } from 'vue-sonner'

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

// Format short authors for table (first author only)
const formatShortAuthors = (authors: string[]) => {
  if (!authors || authors.length === 0) return 'Unknown'
  if (authors.length === 1) return authors[0]
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

// Get publication info (journal/publisher)
const getPublicationInfo = (citation: CitationEntry) => {
  if (citation.journal) {
    let info = citation.journal
    if (citation.volume) {
      info += ` ${citation.volume}`
      if (citation.number) {
        info += `(${citation.number})`
      }
    }
    return info
  }
  return citation.publisher || ''
}

// Copy citation to clipboard
const copyCitation = async (citation: CitationEntry) => {
  try {
    await navigator.clipboard.writeText(formatCitationDisplay(citation))
    toast('Citation copied to clipboard')
  } catch (error) {
    console.error('Failed to copy citation:', error)
    toast('Failed to copy citation')
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
  <div class="w-full">
    <Table>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead class="text-xs font-medium py-2 px-3 w-[30%]">Reference</TableHead>
          <TableHead class="text-xs font-medium py-2 px-3 w-[25%]">Publication</TableHead>
          <TableHead class="text-xs font-medium py-2 px-3 w-[15%]">Year</TableHead>
          <TableHead class="text-xs font-medium py-2 px-3 w-[20%]">Key</TableHead>
          <TableHead class="text-xs font-medium py-2 px-3 w-[10%]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow 
          v-for="citation in citations" 
          :key="citation.id"
          class="group hover:bg-muted/30 transition-colors"
        >
          <!-- Reference Column -->
          <TableCell class="py-2 px-3 align-top">
            <div class="space-y-1">
              <div class="font-medium text-xs leading-tight line-clamp-2" :title="citation.title">
                {{ citation.title || 'Untitled Reference' }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ formatShortAuthors(citation.authors) }}
              </div>
              <div class="flex items-center gap-1">
                <Badge 
                  variant="secondary" 
                  class="text-xs h-4 px-1.5"
                  :class="getCitationTypeColor(getCitationType(citation))"
                >
                  {{ getCitationType(citation) }}
                </Badge>
                <!-- Links -->
                <div v-if="citation.doi || citation.url" class="flex gap-1">
                  <a 
                    v-if="citation.doi" 
                    :href="`https://doi.org/${citation.doi}`" 
                    target="_blank" 
                    class="inline-flex items-center text-blue-600 hover:text-blue-800"
                    title="View DOI"
                  >
                    <ExternalLink class="h-3 w-3" />
                  </a>
                  <a 
                    v-if="citation.url" 
                    :href="citation.url" 
                    target="_blank" 
                    class="inline-flex items-center text-blue-600 hover:text-blue-800"
                    title="View URL"
                  >
                    <ExternalLink class="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </TableCell>

          <!-- Publication Column -->
          <TableCell class="py-2 px-3 align-top">
            <div class="text-xs text-muted-foreground line-clamp-2" :title="getPublicationInfo(citation)">
              {{ getPublicationInfo(citation) }}
            </div>
            <div v-if="citation.pages" class="text-xs text-muted-foreground mt-0.5">
              pp. {{ citation.pages }}
            </div>
          </TableCell>

          <!-- Year Column -->
          <TableCell class="py-2 px-3 align-top">
            <span class="text-xs font-medium">{{ citation.year }}</span>
          </TableCell>

          <!-- Key Column -->
          <TableCell class="py-2 px-3 align-top">
            <code class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {{ citation.key }}
            </code>
          </TableCell>

          <!-- Actions Column -->
          <TableCell class="py-2 px-3 align-top">
            <div class="flex items-center gap-1">
              <!-- Quick Insert Button -->
              <Button 
                variant="ghost" 
                size="sm" 
                class="h-6 w-6 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                @click="$emit('insert', citation)"
                title="Insert citation"
              >
                <Copy class="h-3 w-3" />
              </Button>
              
              <!-- More Actions Dropdown -->
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    class="h-6 w-6 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal class="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-40">
                  <DropdownMenuItem @click="$emit('insert', citation)">
                    <Copy class="mr-2 h-3 w-3" />
                    Insert Citation
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="copyCitation(citation)">
                    <Copy class="mr-2 h-3 w-3" />
                    Copy Citation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem @click="$emit('edit', citation)">
                    <Edit class="mr-2 h-3 w-3" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    @click="$emit('delete', citation.id)"
                    class="text-destructive focus:text-destructive"
                  >
                    <Trash2 class="mr-2 h-3 w-3" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style> 