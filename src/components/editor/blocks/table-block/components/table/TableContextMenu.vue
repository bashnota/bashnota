<script setup lang="ts">
import { Copy, Clipboard, AlignLeft, AlignCenter, AlignRight } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const props = defineProps<{
  hasClipboard: boolean
}>()

const emit = defineEmits<{
  (e: 'copy'): void
  (e: 'paste'): void
  (e: 'setAlignment', alignment: 'left' | 'center' | 'right'): void
}>()
</script>

<template>
  <DropdownMenuContent>
    <DropdownMenuItem @click="emit('copy')">
      <Copy class="h-4 w-4 mr-2" /> Copy
    </DropdownMenuItem>
    <DropdownMenuItem 
      @click="emit('paste')" 
      :disabled="!hasClipboard"
    >
      <Clipboard class="h-4 w-4 mr-2" /> Paste
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem @click="emit('setAlignment', 'left')">
      <AlignLeft class="h-4 w-4 mr-2" /> Align Left
    </DropdownMenuItem>
    <DropdownMenuItem @click="emit('setAlignment', 'center')">
      <AlignCenter class="h-4 w-4 mr-2" /> Align Center
    </DropdownMenuItem>
    <DropdownMenuItem @click="emit('setAlignment', 'right')">
      <AlignRight class="h-4 w-4 mr-2" /> Align Right
    </DropdownMenuItem>
  </DropdownMenuContent>
</template> 