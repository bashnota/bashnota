<script setup lang="ts">
import { computed } from 'vue'
import { CommandItem } from '@/components/ui/command'
import { CommandShortcut } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { CommandItem as CommandItemType } from '@/composables/useCommandList'

interface Props {
  item: CommandItemType
  isSelected: boolean
  onMouseEnter?: () => void
  onMouseDown?: (event: MouseEvent) => void
  onMouseUp?: (event: MouseEvent) => void
}

const props = defineProps<Props>()

const itemClasses = computed(() => {
  return cn(
    'flex items-center justify-between gap-2 px-2 py-1.5',
    'transition-colors duration-150',
    props.isSelected && 'bg-accent text-accent-foreground',
    props.item.disabled && 'opacity-50 cursor-not-allowed',
  )
})
</script>

<template>
  <CommandItem
    :value="item.title"
    :disabled="item.disabled"
    :class="itemClasses"
    @mouseenter="onMouseEnter"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
  >
    <div class="flex items-center gap-3 min-w-0 flex-1">
      <component
        :is="item.icon"
        class="h-4 w-4 flex-shrink-0"
        :class="[
          isSelected 
            ? 'text-accent-foreground/70' 
            : 'text-muted-foreground/70'
        ]"
      />
      
      <div class="min-w-0 flex-1">
        <div class="text-sm font-medium truncate">
          {{ item.title }}
        </div>
        <div 
          v-if="item.description" 
          class="text-xs text-muted-foreground/70 truncate"
        >
          {{ item.description }}
        </div>
      </div>
    </div>

    <div v-if="item.shortcut" class="flex-shrink-0">
      <CommandShortcut>{{ item.shortcut }}</CommandShortcut>
    </div>
  </CommandItem>
</template>
