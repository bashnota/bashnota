import { ref, computed } from 'vue'
import type { SubNotaLinkItem, SubNotaLinkAttributes } from '../services/SubNotaLinkService'

export function useSubNotaLinkSuggestion() {
  // State
  const isOpen = ref(false)
  const selectedIndex = ref(0)
  const items = ref<SubNotaLinkItem[]>([])
  const query = ref('')

  // Computed
  const hasItems = computed(() => items.value.length > 0)
  const currentItem = computed(() => items.value[selectedIndex.value])
  const isEmpty = computed(() => !hasItems.value)

  // Methods
  const open = (newItems: SubNotaLinkItem[], newQuery: string = '') => {
    items.value = newItems
    query.value = newQuery
    selectedIndex.value = 0
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    items.value = []
    query.value = ''
    selectedIndex.value = 0
  }

  const selectItem = (index: number) => {
    if (index >= 0 && index < items.value.length) {
      selectedIndex.value = index
    }
  }

  const navigateUp = () => {
    if (hasItems.value) {
      selectedIndex.value = (selectedIndex.value + items.value.length - 1) % items.value.length
    }
  }

  const navigateDown = () => {
    if (hasItems.value) {
      selectedIndex.value = (selectedIndex.value + 1) % items.value.length
    }
  }

  const selectCurrentItem = () => {
    const item = currentItem.value
    if (item) {
      return {
        targetNotaId: item.id,
        targetNotaTitle: item.title,
        displayText: item.title,
        linkStyle: 'inline' as const
      }
    }
    return null
  }

  const updateItems = (newItems: SubNotaLinkItem[]) => {
    items.value = newItems
    if (selectedIndex.value >= newItems.length) {
      selectedIndex.value = Math.max(0, newItems.length - 1)
    }
  }

  const updateQuery = (newQuery: string) => {
    query.value = newQuery
    selectedIndex.value = 0
  }

  return {
    // State
    isOpen,
    selectedIndex,
    items,
    query,
    
    // Computed
    hasItems,
    currentItem,
    isEmpty,
    
    // Methods
    open,
    close,
    selectItem,
    navigateUp,
    navigateDown,
    selectCurrentItem,
    updateItems,
    updateQuery
  }
}
