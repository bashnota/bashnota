<script setup lang="ts">
import { CornerDownLeft } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

interface CommandItem {
  title: string
  icon: FunctionConstructor
  command: (props: any) => void
  category: string
}

const props = defineProps<{
  items: Array<CommandItem>
  command: (props: any) => void
}>()

const selectedIndex = ref(0)

// Group items by category
const groupedItems = computed(() => {
  const groups: Record<string, CommandItem[]> = {}

  props.items.forEach((item) => {
    const category = item.category || 'Other'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(item)
  })

  return groups
})

// Create a map of global indices
const itemToGlobalIndex = computed(() => {
  const map = new Map<CommandItem, number>()
  let globalIndex = 0

  Object.values(groupedItems.value).forEach((items) => {
    items.forEach((item) => {
      map.set(item, globalIndex++)
    })
  })

  return map
})

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  },
)

const selectItem = (index: number) => {
  selectedIndex.value = index
}

const onMousedown = (e: MouseEvent) => {
  e.preventDefault()
}

const onMouseup = (e: MouseEvent, { command, index }: { command: () => void, index: number }) => {
  e.preventDefault()
  selectItem(index)
  command()
}

const onKeyDown = (event: KeyboardEvent) => {
  if (!event) return false

  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
    return true
  }

  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    return true
  }

  if (event.key === 'Enter') {
    if (props.items[selectedIndex.value]) {
      // Make sure we're using the proper command execution pattern
      props.command(props.items[selectedIndex.value])
      return true
    }
  }

  return false
}

defineExpose({
  onKeyDown,
})
</script>

<template>
  <div class="w-72 rounded-lg border bg-popover shadow-md">
    <div class="flex flex-col p-1 max-h-80 overflow-y-auto scrollbar-thin">
      <template v-if="items.length">
        <div v-for="(items, groupName) in groupedItems" :key="groupName">
          <!-- Group Header -->
          <div v-if="items.length" class="px-2 py-1.5 sticky top-0 bg-popover z-10">
            <p class="text-xs font-medium text-muted-foreground/70">{{ groupName }}</p>
          </div>

          <!-- Group Items -->
          <button
            v-for="item in items"
            :key="item.title"
            class="relative flex justify-between cursor-pointer items-center w-full select-none rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            :class="[
              itemToGlobalIndex.get(item) === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground',
            ]"
            @mouseenter="selectItem(itemToGlobalIndex.get(item) ?? 0)"
            @mousedown="onMousedown"
            @mouseup="(e) => onMouseup(e, { command: () => command(item), index: itemToGlobalIndex.get(item) ?? 0 })"
          >
            <div class="flex items-center gap-2">
              <component
                :is="item.icon"
                class="mr-2 h-4 w-4"
                :class="[
                  itemToGlobalIndex.get(item) === selectedIndex
                    ? 'text-accent-foreground/70'
                    : 'text-muted-foreground/70',
                ]"
              />
              <span>{{ item.title }}</span>
            </div>

            <!-- Optional: Add keyboard shortcut hints -->
            <span
              v-if="itemToGlobalIndex.get(item) === selectedIndex"
              class="text-xs tracking-widest text-muted-foreground/50"
            >
              <CornerDownLeft class="h-3 w-3" />
            </span>
          </button>

          <!-- Group Separator -->
          <div v-if="items.length" class="px-2 my-1">
            <div class="h-px bg-border/50"></div>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else class="flex flex-col items-center justify-center py-6 px-4">
        <p class="text-sm font-medium text-muted-foreground">No results found</p>
        <p class="text-xs text-muted-foreground/70">Try a different search term</p>
      </div>
    </div>
  </div>
</template>

<!-- Add Tippy theme styles -->
<style>
.tippy-arrow {
  @apply text-transparent !important;
}

.tippy-box {
  @apply text-inherit !important;
}

.tippy-box[data-theme~='command-palette'] {
  @apply bg-transparent border-none shadow-none;
}

.tippy-box[data-theme~='command-palette'] .tippy-content {
  @apply p-0;
}

/* Custom scrollbar styles */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 9999px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}

/* For Firefox */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
}
</style>
