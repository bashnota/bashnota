<script setup lang="ts">
import { ref } from 'vue'
import { Plus, ChevronDown, Zap, BookOpen } from 'lucide-vue-next'
import { Input } from '@/ui/input'
import { Button } from '@/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/ui/dropdown-menu'

const props = defineProps<{
  showInput: boolean
  title: string
  parentId: string | null
}>()

const emit = defineEmits<{
  'update:showInput': [value: boolean]
  'update:title': [value: string]
  'create': [parentId: string | null]
  'openModal': []
}>()

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('update:showInput', false)
    emit('update:title', '')
  } else if (event.key === 'Enter') {
    emit('create', props.parentId)
  }
}

const quickCreate = () => {
  emit('update:showInput', true)
}

const openTemplateModal = () => {
  emit('openModal')
}
</script>

<template>
  <div>
    <!-- Enhanced New Nota Button with Dropdown -->
    <div v-if="!showInput" class="flex">
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

    <!-- Quick Create Input -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showInput" class="flex gap-1 w-full">
        <Input
          :value="title"
          @input="(e: Event) => emit('update:title', (e.target as HTMLInputElement).value)"
          placeholder="Quick note title..."
          class="h-7 text-xs flex-1"
          @keydown="handleKeydown"
          autofocus
        />
        <Button
          @click="emit('create', parentId)"
          variant="default"
          size="sm"
          class="h-7 text-xs px-2"
          :disabled="!title.trim()"
        >
          Create
        </Button>
        <Button
          @click="openTemplateModal"
          variant="outline"
          size="sm"
          class="h-7 text-xs px-2"
          title="Use template"
        >
          <BookOpen class="h-3 w-3" />
        </Button>
      </div>
    </Transition>
  </div>
</template> 








