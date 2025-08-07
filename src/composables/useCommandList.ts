import { computed, ref, watch, type Ref } from 'vue'

export interface CommandItem {
  title: string
  icon: any // Component type
  command: (props: any) => void
  category: string
  shortcut?: string
  disabled?: boolean
  description?: string
}

export interface UseCommandListOptions {
  items: Ref<CommandItem[]>
  onCommand: (item: CommandItem) => void
}

export function useCommandList({ items, onCommand }: UseCommandListOptions) {
  const selectedIndex = ref(0)
  const searchQuery = ref('')

  // Group items by category
  const groupedItems = computed(() => {
    const groups: Record<string, CommandItem[]> = {}

    items.value.forEach((item) => {
      const category = item.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(item)
    })

    return groups
  })

  // Create a flat list for navigation
  const flatItems = computed(() => {
    return items.value.filter(item => !item.disabled)
  })

  // Create a map of global indices for keyboard navigation
  const itemToGlobalIndex = computed(() => {
    const map = new Map<CommandItem, number>()
    let globalIndex = 0

    Object.values(groupedItems.value).forEach((groupItems) => {
      groupItems.forEach((item) => {
        if (!item.disabled) {
          map.set(item, globalIndex++)
        }
      })
    })

    return map
  })

  // Reset selected index when items change
  watch(
    () => items.value,
    () => {
      selectedIndex.value = 0
    },
  )

  // Navigation functions
  const selectItem = (index: number) => {
    if (index >= 0 && index < flatItems.value.length) {
      selectedIndex.value = index
    }
  }

  const navigateUp = () => {
    selectedIndex.value = (selectedIndex.value + flatItems.value.length - 1) % flatItems.value.length
  }

  const navigateDown = () => {
    selectedIndex.value = (selectedIndex.value + 1) % flatItems.value.length
  }

  const executeSelected = () => {
    const selectedItem = flatItems.value[selectedIndex.value]
    if (selectedItem && !selectedItem.disabled) {
      onCommand(selectedItem)
      return true
    }
    return false
  }

  const executeItem = (item: CommandItem) => {
    if (!item.disabled) {
      onCommand(item)
    }
  }

  // Keyboard event handler
  const handleKeyDown = (event: KeyboardEvent): boolean => {
    if (!event) return false

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        navigateUp()
        return true
      case 'ArrowDown':
        event.preventDefault()
        navigateDown()
        return true
      case 'Enter':
        event.preventDefault()
        return executeSelected()
      case 'Escape':
        // Let parent handle escape
        return false
      default:
        return false
    }
  }

  // Mouse event handlers
  const handleMouseEnter = (item: CommandItem) => {
    const index = itemToGlobalIndex.value.get(item)
    if (index !== undefined) {
      selectItem(index)
    }
  }

  const handleMouseDown = (event: MouseEvent) => {
    event.preventDefault()
  }

  const handleMouseUp = (event: MouseEvent, item: CommandItem) => {
    event.preventDefault()
    executeItem(item)
  }

  return {
    // State
    selectedIndex: computed(() => selectedIndex.value),
    searchQuery,
    groupedItems,
    flatItems,
    itemToGlobalIndex,

    // Actions
    selectItem,
    navigateUp,
    navigateDown,
    executeSelected,
    executeItem,

    // Event handlers
    handleKeyDown,
    handleMouseEnter,
    handleMouseDown,
    handleMouseUp,
  }
}
