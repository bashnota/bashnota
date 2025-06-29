<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ScrollArea } from '@/ui/scroll-area'
import { Button } from '@/ui/button'
import { Search, MessageSquare, Bot, Plus, Calendar, Trash2, Clock } from 'lucide-vue-next'
import { Input } from '@/ui/input'
import { Badge } from '@/ui/badge'
import { format } from 'date-fns'
import { logger } from '@/services/logger'
import { useChatHistory } from '@/features/ai/components/composables/useChatHistory'
import type { ChatHistoryItem } from '@/features/ai/components/composables/useConversation'

const props = defineProps<{
  editor: any
  notaId: string
  activeBlockId?: string
}>()

const emit = defineEmits(['select-chat', 'create-new', 'delete-chat'])

// Use chat history composable
const {
  chatHistoryItems,
  filteredChatHistory,
  isLoading,
  error,
  searchQuery,
  hasConversations,
  hasFilteredResults,
  deleteConversation,
  clearSearch,
  refresh
} = useChatHistory(props.notaId, props.activeBlockId)

// Handle delete conversation
const handleDeleteConversation = async (item: ChatHistoryItem, event: Event) => {
  event.stopPropagation() // Prevent selecting the chat
  
  try {
    await deleteConversation(item.id)
    emit('delete-chat', item)
  } catch (error) {
    logger.error('Error deleting conversation:', error)
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

// Handle chat selection
const selectChat = (item: ChatHistoryItem) => {
  emit('select-chat', item)
}

// Create a new chat
const createNew = () => {
  emit('create-new')
}

// Handle refresh
const handleRefresh = async () => {
  await refresh()
}
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
        
        <div v-else-if="error" class="text-center py-4 text-destructive text-sm">
          {{ error }}
          <Button 
            variant="outline" 
            size="sm"
            class="mt-2 block mx-auto"
            @click="handleRefresh"
          >
            Try Again
          </Button>
        </div>
        
        <div v-else-if="!hasFilteredResults" class="text-center py-8">
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
          v-for="item in filteredChatHistory"
          :key="item.id"
          class="group border rounded-md p-2.5 hover:bg-accent/40 cursor-pointer transition-colors relative"
          :class="{'bg-accent/80': item.isActive}"
          @click="selectChat(item)"
        >
          <div class="flex justify-between gap-2 mb-1">
            <h4 class="font-medium text-sm line-clamp-1 pr-8">{{ item.title }}</h4>
            <div class="flex items-center gap-1">
              <span class="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                <Clock class="h-3 w-3" />
                {{ formatDate(item.updatedAt) }}
              </span>
              <Button
                variant="ghost"
                size="sm"
                class="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                @click="(e) => handleDeleteConversation(item, e)"
              >
                <Trash2 class="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
          <p class="text-xs text-muted-foreground line-clamp-2">
            {{ item.preview }}
          </p>
          <div class="flex gap-1 mt-1.5">
            <Badge variant="outline" class="text-[10px] px-1.5 py-0.5 bg-primary/5">
              {{ item.messageCount }} {{ item.messageCount === 1 ? 'message' : 'messages' }}
            </Badge>
            <Badge variant="outline" class="text-[10px] px-1.5 py-0.5 bg-secondary/5">
              {{ Math.round((item.lastMessage?.content.length || 0) / 4) }} tokens
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








