<template>
  <node-view-wrapper class="my-4 w-full">
    <div class="flex flex-col gap-4 w-full">
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

      <!-- Main caption and label -->
      <SubfigureCaption
        v-if="hasVisibleSubfigures || !isReadOnly"
        v-model="captionData"
        :is-read-only="isReadOnly"
        @unlock="unlockSubfigure"
      />
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, watch, onMounted, onUnmounted } from 'vue'
import type { NodeViewProps } from '@tiptap/vue-3'
import SubfigureControls from './SubfigureControls.vue'
import SubfigureGrid from './SubfigureGrid.vue'
import SubfigureCaption from './SubfigureCaption.vue'

// Define types
type ObjectFitType = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
type LayoutType = 'horizontal' | 'vertical' | 'grid'

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

// Computed properties
const attrs = computed(() => props.node.attrs as SubfigureAttributes)
const isReadOnly = computed(() => !props.editor.isEditable)
const isLocked = computed(() => props.node.attrs.isLocked || false)

// Calculate figure number based on position in the document
const figureNumber = computed(() => {
  if (!props.editor || !props.getPos) return 1;
  
  const { doc } = props.editor.state
  let count = 0;
  
  // Get the actual position
  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  if (pos === null) return 1;
  
  // Find all subfigure nodes before this one
  doc.descendants((node, nodePos) => {
    if (nodePos >= pos) {
      // Stop traversing once we reach our node or go past it
      return false;
    }
    
    if (node.type.name === 'subfigure') {
      count++;
    }
    return true;
  });
  
  // Return the figure number (1-based)
  return count + 1;
})

// Calculate auto-generated figure label
const autoFigureLabel = computed(() => {
  return `Figure ${figureNumber.value}`;
})

// Check if there are any visible subfigures in read-only mode
const hasVisibleSubfigures = computed(() => {
  if (!attrs.value.subfigures || attrs.value.subfigures.length === 0) {
    return false
  }
  return attrs.value.subfigures.some((subfig) => subfig.src)
})

// Reactive state for v-model bindings
const controlsData = computed({
  get: () => ({
    layout: attrs.value.layout || 'horizontal',
    unifiedSize: attrs.value.unifiedSize || false,
    isLocked: attrs.value.isLocked || false,
    gridColumns: attrs.value.gridColumns || 2
  }),
  set: (data) => {
    props.updateAttributes({
      layout: data.layout,
      unifiedSize: data.unifiedSize,
      isLocked: data.isLocked,
      gridColumns: data.gridColumns
    })
  }
})

const captionData = computed({
  get: () => {
    return {
      caption: attrs.value.caption || '',
      label: effectiveLabel.value,
      isLocked: attrs.value.isLocked || false,
    }
  },
  set: (data) => {
    // Only update the caption and locked state
    // Label is now automatically managed and not editable by users
    props.updateAttributes({
      caption: data.caption,
      isLocked: data.isLocked,
    })
  }
})

// Subfigure methods
const addSubfigure = () => {
  const subfigures = [...(attrs.value.subfigures || [])]
  subfigures.push({
    src: '',
    caption: '',
  })
  props.updateAttributes({ subfigures })
}

const updateSubfigures = (subfigures: SubfigureData[]) => {
  props.updateAttributes({ subfigures })
}

const unlockSubfigure = () => {
  props.updateAttributes({
    isLocked: false,
  })
}

// Keyboard handling
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    // Any global escape handling can go here
  }
}

// Lifecycle hooks
onMounted(() => {
  if (!props.node.attrs.subfigures) {
    props.updateAttributes({
      subfigures: [],
    })
  }
  
  // Initialize gridColumns if not already set
  if (props.node.attrs.gridColumns === undefined) {
    props.updateAttributes({
      gridColumns: 2, // Default to 2 columns
    })
  }
  
  // Always trigger auto-numbering by setting label to empty string
  props.updateAttributes({
    label: '',  // Empty string will trigger auto-label
  })
  
  window.addEventListener('keydown', handleKeydown)
})

// Watch for position changes and update figure label if needed
watch(figureNumber, (newNumber) => {
  // Update the caption data if we're using auto-numbering (empty label)
  if (!attrs.value.label && !isReadOnly.value) {
    props.updateAttributes({
      label: '',  // Keep it empty to maintain auto-numbering
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Calculate effective label
const effectiveLabel = computed(() => {
  if (attrs.value.label) {
    return attrs.value.label;
  } else {
    return autoFigureLabel.value;
  }
})

// Track when the effective label changes
watch(effectiveLabel, (newLabel) => {
  // Trigger an update of subfigure labels when the main label changes
  if (hasVisibleSubfigures.value) {
    const subfigures = [...attrs.value.subfigures];
    updateSubfigures(subfigures);
  }
})
</script>
