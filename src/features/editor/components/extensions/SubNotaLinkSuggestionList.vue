<template>
  <div class="sub-nota-link-suggestion">
    <!-- Empty state -->
    <div 
      v-if="isEmpty" 
      class="empty-state"
    >
      <Search class="w-4 h-4" />
      <span>No notas found</span>
    </div>

    <!-- Suggestion list -->
    <div v-else class="suggestion-list">
      <!-- Header -->
      <div class="suggestion-header">
        <div class="header-content">
          <FileText class="w-4 h-4 text-blue-500" />
          <span class="header-title">Link to Sub-Nota</span>
        </div>
      </div>

      <!-- Items -->
      <div class="suggestion-items">
        <button
          v-for="(item, index) in props.items"
          :key="`${item.id}-${index}`"
          :class="[
            'suggestion-item',
            { 'selected': index === selectedIndex }
          ]"
          @click="handleItemSelect(index)"
          type="button"
        >
          <div class="item-content">
            <div class="item-title">{{ item.title || 'Untitled' }}</div>
            <div v-if="item.description" class="item-description">
              {{ item.description }}
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { FileText, Search } from 'lucide-vue-next'
import { useSubNotaLinkSuggestion } from './composables/useSubNotaLinkSuggestion'
import type { SubNotaLinkItem } from './services/SubNotaLinkService'

// Types
interface Props {
  items: SubNotaLinkItem[]
  command: (attributes: {
    targetNotaId: string
    targetNotaTitle: string
    displayText?: string
    linkStyle?: 'inline' | 'button' | 'card'
  }) => void
}

// Props
const props = defineProps<Props>()

// Use composable
const {
  selectedIndex,
  hasItems,
  isEmpty,
  selectItem,
  navigateUp,
  navigateDown,
  selectCurrentItem
} = useSubNotaLinkSuggestion()

// Methods
const handleItemSelect = (index: number) => {
  try {
    const item = props.items[index]
    if (item && item.id && item.title) {
      props.command({
        targetNotaId: item.id,
        targetNotaTitle: item.title,
        displayText: item.title,
        linkStyle: 'inline'
      })
    }
  } catch (error) {
    console.error('Error selecting item in subNotaLink list:', error)
  }
}

// Lifecycle
watch(() => props.items, () => {
  try {
    selectedIndex.value = 0
  } catch (error) {
    console.error('Error in items watcher:', error)
  }
})

// Expose methods for parent component
defineExpose({
  navigateUp,
  navigateDown,
  selectCurrentItem,
  selectedIndex
})
</script>

<style scoped>
.sub-nota-link-suggestion {
  @apply bg-white border border-gray-200 rounded-lg shadow-lg max-w-sm;
}

.empty-state {
  @apply flex items-center space-x-2 p-3 text-sm text-gray-500;
}

.suggestion-list {
  @apply max-h-80 overflow-hidden;
}

.suggestion-header {
  @apply p-3 border-b border-gray-200 bg-gray-50;
}

.header-content {
  @apply flex items-center space-x-2;
}

.header-title {
  @apply font-medium text-sm text-gray-700;
}

.suggestion-items {
  @apply max-h-64 overflow-y-auto;
}

.suggestion-item {
  @apply w-full text-left p-3 hover:bg-gray-100 transition-colors duration-150 border-l-2 border-transparent;
}

.suggestion-item.selected {
  @apply bg-blue-50 border-l-2 border-blue-500;
}

.item-content {
  @apply space-y-1;
}

.item-title {
  @apply font-medium text-sm text-gray-900;
}

.item-description {
  @apply text-xs text-gray-500;
}

/* Focus styles for accessibility */
.suggestion-item:focus {
  @apply outline-none ring-2 ring-blue-500 ring-offset-2;
}

/* Scrollbar styling */
.suggestion-items::-webkit-scrollbar {
  @apply w-2;
}

.suggestion-items::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded;
}

.suggestion-items::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded hover:bg-gray-400;
}
</style>
