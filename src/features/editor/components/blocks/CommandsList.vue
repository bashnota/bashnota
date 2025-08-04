<script setup lang="ts">
import { computed, toRef } from 'vue'
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { useCommandList, type CommandItem as CommandItemType } from '@/composables/useCommandList'

interface Props {
  items: Array<CommandItemType>
  command: (item: CommandItemType) => void
  placeholder?: string
  className?: string
  maxHeight?: string
  emptyMessage?: string
  emptyDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Type a command or search...',
  maxHeight: '320px',
  emptyMessage: 'No commands found',
  emptyDescription: 'Try a different search term',
})

const emit = defineEmits<{
  (e: 'select', item: CommandItemType): void
}>()

// Use the command list composable
const commandList = useCommandList({
  items: toRef(props, 'items'),
  onCommand: (item: CommandItemType) => {
    emit('select', item)
    props.command(item)
  },
})

// Check if a category has any enabled items
const hasEnabledItems = (items: CommandItemType[]) => {
  return items.some(item => !item.disabled)
}

// Get category items sorted by priority (enabled first)
const getCategoryItems = (items: CommandItemType[]) => {
  return [...items].sort((a, b) => {
    if (a.disabled && !b.disabled) return 1
    if (!a.disabled && b.disabled) return -1
    return 0
  })
}

defineExpose({
  onKeyDown: commandList.handleKeyDown,
})
</script>

<template>
  <Command 
    :class="cn('rounded-lg border shadow-md bg-background', className)"
    :style="{ maxHeight }"
  >
    <CommandInput 
      :placeholder="placeholder"
      class="h-9"
    />
    <CommandList>
      <CommandEmpty>
        <div class="flex flex-col items-center justify-center py-6 px-4">
          <p class="text-sm font-medium text-muted-foreground">{{ emptyMessage }}</p>
          <p class="text-xs text-muted-foreground/70">{{ emptyDescription }}</p>
        </div>
      </CommandEmpty>
      
      <template v-for="(categoryItems, groupName) in commandList.groupedItems.value" :key="groupName">
        <CommandGroup 
          v-if="hasEnabledItems(categoryItems)"
          :heading="groupName"
        >
          <CommandItem
            v-for="item in getCategoryItems(categoryItems)"
            :key="item.title"
            :value="item.title"
            :disabled="item.disabled"
            @select="() => {
              if (!item.disabled) {
                emit('select', item)
                props.command(item)
              }
            }"
          >
            <!-- Icon -->
            <component 
              v-if="item.icon" 
              :is="item.icon" 
              class="mr-2 h-4 w-4" 
            />
            
            <!-- Title -->
            <span>{{ item.title }}</span>
            
            <!-- Description -->
            <span 
              v-if="item.description" 
              class="ml-auto text-xs text-muted-foreground"
            >
              {{ item.description }}
            </span>
            
            <!-- Keyboard shortcut -->
            <CommandShortcut v-if="item.shortcut">
              {{ item.shortcut }}
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <!-- Group Separator -->
        <CommandSeparator 
          v-if="hasEnabledItems(categoryItems) && Object.keys(commandList.groupedItems.value).indexOf(groupName) < Object.keys(commandList.groupedItems.value).length - 1"
        />
      </template>
    </CommandList>
  </Command>
</template>

<style scoped>
/* Override Tippy.js background */
:deep(.tippy-box) {
  background: transparent !important;
  background-color: transparent !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
}

/* Alternative: target the tippy content directly */
:deep(.tippy-content) {
  background: transparent !important;
  padding: 0 !important;
}

/* Ensure our command component uses proper styling */
:deep(.command-root) {
  background: hsl(var(--background)) !important;
}
</style>









