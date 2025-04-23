<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RefreshCwIcon, SendIcon, MoreHorizontal, CopyIcon, EditIcon, ScissorsIcon, XIcon } from 'lucide-vue-next'

const props = defineProps<{
  hasResult: boolean
  isLoading: boolean
  isContinuing: boolean
  hasSelection: boolean
}>()

const emit = defineEmits([
  'regenerate', 
  'continue', 
  'copy', 
  'edit',
  'insert', 
  'insert-selection',
  'remove'
])

// Toggle continuing mode
const toggleContinuing = () => {
  emit('continue')
}

// Regenerate text
const regenerateText = () => {
  emit('regenerate')
}

// Copy content
const copyContent = () => {
  emit('copy')
}

// Edit response
const editResponse = () => {
  emit('edit')
}

// Insert content to document
const insertToDocument = () => {
  emit('insert')
}

// Insert selected text to document
const insertSelectionToDocument = () => {
  emit('insert-selection')
}

// Remove the block from document
const removeBlock = () => {
  emit('remove')
}
</script>

<template>
  <div v-if="hasResult && !isLoading && !isContinuing" class="flex justify-between">
    <!-- Left side actions -->
    <div class="flex gap-1">
      <Button 
        variant="secondary" 
        size="sm"
        class="h-8 hover:shadow-sm transition-all"
        @click="regenerateText"
        :disabled="isLoading"
      >
        <RefreshCwIcon class="h-3.5 w-3.5 mr-1" />
        Regenerate
      </Button>
      <Button 
        variant="secondary" 
        size="sm"
        class="h-8 hover:shadow-sm transition-all"
        @click="toggleContinuing"
      >
        <SendIcon class="h-3.5 w-3.5 mr-1" />
        Continue
      </Button>
    </div>
    
    <!-- Right side actions -->
    <div class="flex gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-muted transition-colors">
            <MoreHorizontal class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-[160px]">
          <DropdownMenuItem @click="copyContent" class="cursor-pointer">
            <CopyIcon class="h-4 w-4 mr-2" />
            <span>Copy all</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="editResponse" class="cursor-pointer">
            <EditIcon class="h-4 w-4 mr-2" />
            <span>Edit response</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="insertSelectionToDocument" :disabled="!hasSelection" class="cursor-pointer">
            <ScissorsIcon class="h-4 w-4 mr-2" />
            <span>Insert selection</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="removeBlock" class="text-destructive cursor-pointer">
            <XIcon class="h-4 w-4 mr-2" />
            <span>Remove block</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button 
        variant="default" 
        size="sm"
        class="h-8 shadow-sm hover:shadow-md transition-all"
        @click="insertToDocument"
      >
        Insert
      </Button>
    </div>
  </div>
</template>