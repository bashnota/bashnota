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
        :main-label="attrs.label"
        @update:subfigures="updateSubfigures"
        @unlock="unlockSubfigure"
      />

      <!-- Main caption and label -->
      <SubfigureCaption
        v-if="hasVisibleSubfigures || !isReadOnly"
        v-model="captionData"
        :is-read-only="isReadOnly"
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
}

// Props - extend NodeViewProps
const props = defineProps<NodeViewProps>()

// Computed properties
const attrs = computed(() => props.node.attrs as SubfigureAttributes)
const isReadOnly = computed(() => !props.editor.isEditable)
const isLocked = computed(() => props.node.attrs.isLocked || false)

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
  }),
  set: (data) => {
    props.updateAttributes({
      layout: data.layout,
      unifiedSize: data.unifiedSize,
      isLocked: data.isLocked,
    })
  }
})

const captionData = computed({
  get: () => ({
    caption: attrs.value.caption || '',
    label: attrs.value.label || '',
    isLocked: attrs.value.isLocked || false,
  }),
  set: (data) => {
    props.updateAttributes({
      caption: data.caption,
      label: data.label,
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
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
