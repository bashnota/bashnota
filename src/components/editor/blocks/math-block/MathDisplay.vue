<template>
  <div 
    class="math-display flex justify-center items-center min-h-[2em]" 
    :class="{ 'cursor-pointer': !isReadOnly }"
    @dblclick="onDoubleClick"
  >
    <div ref="mathOutputRef"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineProps, defineEmits } from 'vue'
import { useMathJax } from '@/composables/useMathJax'

const props = defineProps<{
  latex: string
  isReadOnly: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

const mathOutputRef = ref<HTMLElement | null>(null)
const { renderLatex, initMathJax, isMathJaxLoaded } = useMathJax()

const renderMath = async () => {
  if (!isMathJaxLoaded.value) {
    await initMathJax()
  }
  
  if (props.latex) {
    renderLatex(props.latex, mathOutputRef.value, true)
  } else if (mathOutputRef.value) {
    // Empty math block
    mathOutputRef.value.innerHTML = ''
  }
}

const onDoubleClick = () => {
  if (!props.isReadOnly) {
    emit('edit')
  }
}

watch(() => props.latex, renderMath, { immediate: true })

onMounted(renderMath)
</script> 