<script setup lang="ts">
import {
  Plus,
  ChevronDown,
  Zap,
  BookOpen
} from 'lucide-vue-next'
import { Button } from '@/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/ui/dropdown-menu'

const emit = defineEmits<{
  'quick-create': []
  'open-modal': []
}>()

const quickCreate = () => {
  emit('quick-create')
}

const openTemplateModal = () => {
  emit('open-modal')
}
</script>

<template>
  <div class="flex">
    <!-- Quick Create Button -->
    <Button
      @click="quickCreate"
      class="h-7 text-xs px-2 gap-1 rounded-r-none border-r-0"
      variant="default"
      size="sm"
      title="Quick create (⌘N)"
    >
      <Plus class="h-4 w-4" />
      <span>New</span>
    </Button>

    <!-- Dropdown for Templates -->
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="sm"
          class="h-7 w-7 px-0 rounded-l-none border-l border-l-primary-foreground/20"
          title="Choose template"
        >
          <ChevronDown class="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" class="w-48">
        <DropdownMenuItem @click="quickCreate">
          <Zap class="h-4 w-4 mr-2" />
          Quick Blank Note
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem @click="openTemplateModal">
          <BookOpen class="h-4 w-4 mr-2" />
          Browse Templates...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template> 








