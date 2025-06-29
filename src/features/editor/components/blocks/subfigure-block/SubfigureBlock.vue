<template>
  <node-view-wrapper class="my-4 w-full">
    <div class="flex flex-col gap-4 w-full">
      <!-- Error message -->
      <div v-if="error" class="error-message">
        {{ error }}
        <button 
          class="ml-2 text-sm underline" 
          @click="error = null"
        >
          Dismiss
        </button>
      </div>

      <!-- Controls - only visible in edit mode -->
      <SubfigureControls
        v-if="!isReadOnly"
        v-model="controlsData"
        @add-subfigure="addSubfigure"
      />

      <!-- Subfigures grid - always visible if has content -->
      <SubfigureGrid
        v-if="hasVisibleSubfigures || !isReadOnly"
        :subfigures="attrs.subfigures"
        :layout="attrs.layout"
        :object-fit="attrs.objectFit"
        :unified-size="attrs.unifiedSize"
        :is-locked="isLocked"
        :is-read-only="isReadOnly"
        :main-label="effectiveLabel"
        :grid-columns="attrs.gridColumns"
        @update:subfigures="updateSubfigures"
        @unlock="unlockSubfigure"
      />

      <!-- Empty state - only visible in edit mode -->
      <div 
        v-if="!hasVisibleSubfigures && !isReadOnly" 
        class="empty-state p-4 border-2 border-dashed border-gray-300 rounded-lg text-center"
      >
        <p class="text-gray-500">No subfigures added yet. Click the "Add Subfigure" button to get started.</p>
      </div>

      <!-- Main caption and label - HIDE when single subfigure in read-only mode -->
      <SubfigureCaption
        v-if="(hasVisibleSubfigures && (attrs.subfigures.length > 1 || !isReadOnly)) || !isReadOnly"
        v-model="captionData"
        :is-read-only="isReadOnly"
        @unlock="unlockSubfigure"
      />
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, watch, onMounted, onUnmounted, ref } from 'vue'
import type { NodeViewProps } from '@tiptap/vue-3'
import SubfigureControls from './SubfigureControls.vue'
import SubfigureGrid from './SubfigureGrid.vue'
import SubfigureCaption from './SubfigureCaption.vue'
import { validateGridColumns } from './subfigure-extension'

// Constants
const VALID_LAYOUTS = ['horizontal', 'vertical', 'grid'] as const
const VALID_OBJECT_FITS = ['contain', 'cover', 'fill', 'none', 'scale-down'] as const
const MIN_GRID_COLUMNS = 1
const MAX_GRID_COLUMNS = 4

// Types
type ObjectFitType = typeof VALID_OBJECT_FITS[number]
type LayoutType = typeof VALID_LAYOUTS[number]

interface SubfigureData {
  src: string
  caption: string
}

interface SubfigureAttributes {
  subfigures: SubfigureData[]
  layout: LayoutType
  unifiedSize: boolean
  objectFit: ObjectFitType
  isLocked: boolean
  caption: string
  label: string
  gridColumns: number
}

// Props - extend NodeViewProps
const props = defineProps<NodeViewProps>()

// Error state
const error = ref<string | null>(null)

// Computed properties
const attrs = computed(() => {
  try {
    return props.node.attrs as SubfigureAttributes
  } catch (e) {
    error.value = 'Invalid subfigure attributes'
    return {
      subfigures: [],
      layout: 'horizontal',
      unifiedSize: true,
      objectFit: 'contain',
      isLocked: false,
      caption: '',
      label: '',
      gridColumns: 2,
    } as SubfigureAttributes
  }
})

const isReadOnly = computed(() => !props.editor.isEditable)
const isLocked = computed(() => props.node.attrs.isLocked || false)

// Improved figure number calculation with error handling
const figureNumber = computed(() => {
  try {
    if (!props.editor || !props.getPos) return 1
    
    const { doc } = props.editor.state
    let count = 0
    
    const pos = typeof props.getPos === 'function' ? props.getPos() : null
    if (pos === null) return 1
    
    const cacheKey = `${doc.content.size}-${pos}`
    if (figureNumberCache.has(cacheKey)) {
      return figureNumberCache.get(cacheKey)!
    }
    
    doc.descendants((node, nodePos) => {
      if (nodePos >= pos) return false
      if (node.type.name === 'subfigure') count++
      return true
    })
    
    const result = count + 1
    figureNumberCache.set(cacheKey, result)
    return result
  } catch (e) {
    console.error('Error calculating figure number:', e)
    return 1
  }
})

// Cache for figure numbers with size limit
const figureNumberCache = new Map<string, number>()
const MAX_CACHE_SIZE = 100

// Cleanup cache when it gets too large
const cleanupCache = () => {
  if (figureNumberCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(figureNumberCache.entries())
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE)
    toDelete.forEach(([key]) => figureNumberCache.delete(key))
  }
}

// Calculate auto-generated figure label
const autoFigureLabel = computed(() => {
  try {
    return `Figure ${figureNumber.value}`
  } catch (e) {
    console.error('Error generating figure label:', e)
    return 'Figure'
  }
})

// Check if there are any visible subfigures in read-only mode
const hasVisibleSubfigures = computed(() => {
  try {
    if (!attrs.value.subfigures?.length) return false
    return attrs.value.subfigures.some((subfig) => subfig.src)
  } catch (e) {
    console.error('Error checking visible subfigures:', e)
    return false
  }
})

// Reactive state for v-model bindings with validation
const controlsData = computed({
  get: () => ({
    layout: VALID_LAYOUTS.includes(attrs.value.layout) ? attrs.value.layout : 'horizontal',
    unifiedSize: Boolean(attrs.value.unifiedSize),
    isLocked: Boolean(attrs.value.isLocked),
    gridColumns: validateGridColumns(attrs.value.gridColumns) ? attrs.value.gridColumns : 2,
  }),
  set: (data) => {
    try {
      props.updateAttributes({
        layout: VALID_LAYOUTS.includes(data.layout) ? data.layout : 'horizontal',
        unifiedSize: Boolean(data.unifiedSize),
        isLocked: Boolean(data.isLocked),
        gridColumns: validateGridColumns(data.gridColumns) ? data.gridColumns : 2,
      })
    } catch (e) {
      error.value = 'Failed to update controls'
      console.error('Error updating controls:', e)
    }
  }
})

const captionData = computed({
  get: () => ({
    caption: String(attrs.value.caption || ''),
    label: effectiveLabel.value,
    isLocked: Boolean(attrs.value.isLocked),
  }),
  set: (data) => {
    try {
      props.updateAttributes({
        caption: String(data.caption || ''),
        isLocked: Boolean(data.isLocked),
      })
    } catch (e) {
      error.value = 'Failed to update caption'
      console.error('Error updating caption:', e)
    }
  }
})

// Subfigure methods with error handling
const addSubfigure = () => {
  try {
    const subfigures = [...(attrs.value.subfigures || [])]
    subfigures.push({
      src: '',
      caption: '',
    })
    props.updateAttributes({ subfigures })
  } catch (e) {
    error.value = 'Failed to add subfigure'
    console.error('Error adding subfigure:', e)
  }
}

const updateSubfigures = (subfigures: SubfigureData[]) => {
  try {
    if (!Array.isArray(subfigures)) {
      throw new Error('Invalid subfigures data')
    }
    props.updateAttributes({ subfigures })
  } catch (e) {
    error.value = 'Failed to update subfigures'
    console.error('Error updating subfigures:', e)
  }
}

const unlockSubfigure = () => {
  try {
    props.updateAttributes({
      isLocked: false,
    })
  } catch (e) {
    error.value = 'Failed to unlock subfigure'
    console.error('Error unlocking subfigure:', e)
  }
}

// Keyboard handling with error boundary
const handleKeydown = (e: KeyboardEvent) => {
  try {
    if (e.key === 'Escape') {
      // Any global escape handling can go here
    }
  } catch (e) {
    console.error('Error handling keyboard event:', e)
  }
}

// Lifecycle hooks with error handling
onMounted(() => {
  try {
    if (!props.node.attrs.subfigures) {
      props.updateAttributes({
        subfigures: [],
      })
    }
    
    if (props.node.attrs.label === undefined) {
      props.updateAttributes({
        label: '',
      })
    }
    
    window.addEventListener('keydown', handleKeydown)
  } catch (e) {
    error.value = 'Failed to initialize subfigure'
    console.error('Error in onMounted:', e)
  }
})

// Watch for position changes and update figure label if needed
watch(figureNumber, (newNumber) => {
  try {
    if (!attrs.value.label && !isReadOnly.value && newNumber !== figureNumber.value) {
      props.updateAttributes({
        label: '',
      })
    }
  } catch (e) {
    console.error('Error updating figure label:', e)
  }
}, { immediate: false })

onUnmounted(() => {
  try {
    window.removeEventListener('keydown', handleKeydown)
    cleanupCache()
  } catch (e) {
    console.error('Error in onUnmounted:', e)
  }
})

// Calculate effective label with error handling
const effectiveLabel = computed(() => {
  try {
    return attrs.value.label || autoFigureLabel.value
  } catch (e) {
    console.error('Error calculating effective label:', e)
    return 'Figure'
  }
})
</script>

<style scoped>
.error-message {
  color: red;
  padding: 0.5rem;
  margin: 0.5rem 0;
  border: 1px solid red;
  border-radius: 4px;
  background-color: rgba(255, 0, 0, 0.1);
}
</style>









