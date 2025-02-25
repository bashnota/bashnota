<template>
  <node-view-wrapper class="math-block">
    <div class="math-display" v-show="!isEditing" @dblclick="startEditing">
      <div ref="mathOutput"></div>
    </div>
    <div v-show="isEditing" class="math-input">
      <textarea
        ref="textarea"
        v-model="latex"
        @blur="stopEditing"
        @keydown.enter.prevent="stopEditing"
        @keydown.esc="stopEditing"
        rows="2"
        placeholder="Enter LaTeX expression..."
      ></textarea>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import 'mathjax/es5/tex-svg'

declare global {
  interface Window {
    MathJax: any
  }
}

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  updateAttributes: {
    type: Function,
    required: true,
  },
})

const isEditing = ref(false)
const latex = ref(props.node.attrs.latex || '')
const mathOutput = ref<HTMLElement | null>(null)
const textarea = ref<HTMLTextAreaElement | null>(null)

const renderMath = () => {
  if (mathOutput.value && latex.value) {
    try {
      const output = window.MathJax.tex2svg(latex.value, {
        display: true,
      })
      mathOutput.value.innerHTML = ''
      mathOutput.value.appendChild(output)
    } catch (error) {
      console.error('Error rendering LaTeX:', error)
      mathOutput.value.innerHTML = '<span style="color: red;">Invalid LaTeX</span>'
    }
  }
}

const startEditing = () => {
  isEditing.value = true
  setTimeout(() => {
    textarea.value?.focus()
  })
}

const stopEditing = () => {
  isEditing.value = false
  props.updateAttributes({
    latex: latex.value,
  })
}

watch(
  () => props.node.attrs.latex,
  (newLatex) => {
    latex.value = newLatex
    renderMath()
  },
)

onMounted(() => {
  // Wait for MathJax to be loaded
  const checkMathJax = () => {
    if (window.MathJax) {
      renderMath()
    } else {
      setTimeout(checkMathJax, 100)
    }
  }
  checkMathJax()
})
</script>

<style scoped>
.math-block {
  margin: 1em 0;
  padding: 0.5em;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.math-display {
  min-height: 2em;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.math-input {
  width: 100%;
}

.math-input textarea {
  width: 100%;
  padding: 0.5em;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: monospace;
}
</style>
