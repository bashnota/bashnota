<template>
  <node-view-wrapper class="my-4 w-full">
    <div class="flex flex-col gap-4 w-full">
      <div
        class="flex flex-col gap-2 w-full"
        :class="{
          'items-start': attrs.alignment === 'left',
          'items-center': attrs.alignment === 'center',
          'items-end': attrs.alignment === 'right',
        }"
      >
        <!-- Controls - only show in edit mode -->
        <ImageControls
          v-if="attrs.src && !isLocked && !isReadOnly"
          v-model="imageAttributes"
        />

        <!-- Image container -->
        <ImageDisplay
          v-if="attrs.src || !isReadOnly"
          :src="attrs.src"
          :width="attrs.width"
          :object-fit="attrs.objectFit"
          :is-locked="isLocked"
          :is-read-only="isReadOnly"
          @update:src="updateSrc"
          @unlock="unlockImage"
        />

        <!-- Caption and label -->
        <ImageCaption
          v-if="attrs.src"
          v-model="captionData"
          :is-read-only="isReadOnly"
        />
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, watch, onMounted, onUnmounted } from 'vue'
import type { NodeViewProps } from '@tiptap/vue-3'
import ImageControls from './ImageControls.vue'
import ImageDisplay from './ImageDisplay.vue'
import ImageCaption from './ImageCaption.vue'

// Define types
type ObjectFitType = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
type AlignmentType = 'left' | 'center' | 'right'

interface ImageAttributes {
  src?: string
  width: string
  alignment: AlignmentType
  objectFit: ObjectFitType
  isLocked: boolean
  caption?: string
  label?: string
}

// Props - extend NodeViewProps
const props = defineProps<NodeViewProps>()

// Computed properties
const attrs = computed(() => props.node.attrs)
const isReadOnly = computed(() => !props.editor.isEditable)
const isLocked = computed(() => props.node.attrs.isLocked || false)

// Reactive state for v-model bindings
const imageAttributes = computed({
  get: () => ({
    width: attrs.value.width || '100%',
    alignment: attrs.value.alignment || 'center',
    isLocked: attrs.value.isLocked || false,
  }),
  set: (newAttrs: Partial<ImageAttributes>) => {
    updateNodeAttributes(newAttrs)
  }
})

const captionData = computed({
  get: () => ({
    caption: attrs.value.caption || '',
    label: attrs.value.label || '',
    isLocked: attrs.value.isLocked || false,
  }),
  set: (data: { caption: string; label: string; isLocked: boolean }) => {
    updateCaptionData(data)
  }
})

// Update methods
const updateNodeAttributes = (newAttrs: Partial<ImageAttributes>) => {
  props.updateAttributes(newAttrs)
}

const updateSrc = (src: string) => {
  props.updateAttributes({ src })
}

const updateCaptionData = (data: { caption: string; label: string; isLocked: boolean }) => {
  // Ensure we're not losing data by using a more explicit update
  const updates: Record<string, any> = {}
  
  if (data.caption !== undefined) {
    updates.caption = data.caption
  }
  
  if (data.label !== undefined) {
    updates.label = data.label
  }
  
  if (data.isLocked !== undefined) {
    updates.isLocked = data.isLocked
  }
  
  props.updateAttributes(updates)
  
  // Force a refresh of the computed properties
  imageAttributes.value
  captionData.value
}

const unlockImage = () => {
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
watch(
  () => props.node.attrs,
  () => {
    // Any additional watching logic can go here
  },
  { deep: true }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
