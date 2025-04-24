<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Search, MessageSquare, Bot, Plus, Calendar } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { logger } from '@/services/logger'

const props = defineProps<{
  editor: any
  notaId: string
  activeBlockId?: string
}>()

const emit = defineEmits(['select-chat', 'create-new'])

// State
const searchQuery = ref('')
const aiBlocks = ref<any[]>([])
const isLoading = ref(false)

// Find all AI blocks in the editor
const findAIBlocks = () => {
  isLoading.value = true
  const blocks: any[] = []
  
  try {
    if (!props.editor) return []
    
    const { state } = props.editor
    const { doc } = state
    
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'inlineAIGeneration' && node.attrs.prompt) {
        blocks.push({
          node,
          type: node.type.name,
          pos,
          id: `ai-${pos}`,
          prompt: node.attrs.prompt,
          result: node.attrs.result,
          timestamp: node.attrs.lastUpdated ? new Date(node.attrs.lastUpdated) : new Date(),
          preview: node.attrs.prompt.slice(0, 80) + (node.attrs.prompt.length > 80 ? '...' : '')
        })
      }
      return true // Continue traversal
    })
    
    // Sort blocks by timestamp, newest first
    blocks.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    aiBlocks.value = blocks
  } catch (error) {
    logger.error('Error finding AI blocks:', error)
  } finally {
    isLoading.value = false
  }
}

// Format date for display
const formatDate = (date: Date) => {
  const now = new Date()
  
  // Same day formatting
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return format(date, 'h:mm a')
  }
  
  // Within the last week
  const oneWeekAgo = new Date(now)
  oneWeekAgo.setDate(now.getDate() - 7)
  
  if (date > oneWeekAgo) {
    return format(date, 'EEE, h:mm a')
  }
  
  // Older dates
  return format(date, 'MMM d, yyyy')
}

// Filtered blocks based on search query
const filteredBlocks = computed(() => {
  if (!searchQuery.value.trim()) {
    return aiBlocks.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return aiBlocks.value.filter(block => 
    block.prompt.toLowerCase().includes(query) || 
    (block.result && block.result.toLowerCase().includes(query))
  )
})

// Handle chat selection
const selectChat = (block: any) => {
  emit('select-chat', block)
}

// Create a new chat
const createNew = () => {
  emit('create-new')
}

// Load blocks on component mount
onMounted(() => {
  findAIBlocks()
})

// Refresh the list when activeBlockId changes
watch(() => props.activeBlockId, () => {
  findAIBlocks()
})
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Header with title and search -->
    <div class="p-3 border-b flex flex-col gap-2 bg-background">
      <div class="flex justify-between items-center">
        <h3 class="text-base font-medium flex items-center gap-2">
          <MessageSquare class="h-4 w-4 text-primary" />
          AI Conversations
        </h3>
        <Button 
          variant="outline" 
          size="sm"
          class="h-8 gap-1"
          @click="createNew"
        >
          <Plus class="h-3.5 w-3.5" />
          New
        </Button>
      </div>
      
      <!-- Search input -->
      <div class="relative">
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search conversations..."
          class="pl-8"
        />
      </div>
    </div>
    
    <!-- Scrollable chat list -->
    <ScrollArea class="flex-1 overflow-y-auto">
      <div class="p-2 space-y-2">
        <div v-if="isLoading" class="text-center py-4 text-muted-foreground text-sm">
          Loading conversations...
        </div>
        
        <div v-else-if="filteredBlocks.length === 0" class="text-center py-8">
          <Bot class="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
          <p class="text-muted-foreground text-sm">
            {{ searchQuery ? 'No conversations match your search' : 'No AI conversations found' }}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            class="mt-4"
            @click="createNew"
          >
            <Plus class="h-3.5 w-3.5 mr-1.5" />
            Start a new conversation
          </Button>
        </div>
        
        <div 
          v-for="block in filteredBlocks"
          :key="block.id"
          class="border rounded-md p-2.5 hover:bg-accent/40 cursor-pointer transition-colors"
          :class="{'bg-accent/80': block.id === props.activeBlockId}"
          @click="selectChat(block)"
        >
          <div class="flex justify-between gap-2 mb-1">
            <h4 class="font-medium text-sm line-clamp-1">{{ block.preview }}</h4>
            <span class="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <Calendar class="h-3 w-3" />
              {{ formatDate(block.timestamp) }}
            </span>
          </div>
          <p class="text-xs text-muted-foreground line-clamp-2">
            {{ block.result ? block.result.slice(0, 120) + (block.result.length > 120 ? '...' : '') : 'No response yet' }}
          </p>
          <div class="flex gap-1 mt-1.5">
            <Badge variant="outline" class="text-[10px] px-1.5 py-0.5 bg-primary/5">
              {{ block.result ? Math.round(block.result.length / 4) : 0 }} tokens
            </Badge>
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>