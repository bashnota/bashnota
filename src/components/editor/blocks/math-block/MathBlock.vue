<template>
  <node-view-wrapper 
    class="math-block" 
    :class="{ 
      'border border-border rounded-md p-4 my-4': !isReadOnly,
      'my-4': isReadOnly
    }"
  >
    <Card v-if="!isReadOnly" class="shadow-sm">
      <CardContent class="p-4">
        <MathDisplay 
          v-if="!isEditing" 
          :latex="latex" 
          :isReadOnly="isReadOnly"
          @edit="startEditing"
        />
        <MathInput
          v-else
          v-model="latex"
          placeholder="Enter LaTeX expression..."
          :rows="2"
          @save="stopEditing"
          @cancel="cancelEditing"
        />
      </CardContent>
    </Card>
    
    <div v-else>
      <MathDisplay 
        :latex="latex" 
        :isReadOnly="isReadOnly"
      />
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { Card, CardContent } from '@/components/ui/card'
import MathDisplay from './MathDisplay.vue'
import MathInput from './MathInput.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  updateAttributes: {
    type: Function,
    required: true,
  },
  editor: {
    type: Object,
    required: true,
  },
})

const isEditing = ref(false)
const latex = ref(props.node.attrs.latex || '')
const isReadOnly = computed(() => !props.editor.isEditable)

// Watch for changes in the node attributes
const updateLatexFromNode = () => {
  if (props.node.attrs.latex !== undefined) {
    latex.value = props.node.attrs.latex
  }
}

// Start editing mode
const startEditing = () => {
  if (isReadOnly.value) return
  isEditing.value = true
}

// Save changes and exit editing mode
const stopEditing = () => {
  isEditing.value = false
  props.updateAttributes({
    latex: latex.value,
  })
}

// Cancel editing without saving
const cancelEditing = () => {
  isEditing.value = false
  // Reset to the original value
  latex.value = props.node.attrs.latex || ''
}

// Watch for external changes to the node
watch(
  () => props.node.attrs.latex,
  () => updateLatexFromNode()
)

// Watch for changes in read-only status
watch(isReadOnly, (newValue) => {
  // Force stop editing when switched to read-only
  if (newValue && isEditing.value) {
    stopEditing()
  }
})
</script>
