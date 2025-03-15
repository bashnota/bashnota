<template>
  <div 
    class="math-display flex items-center min-h-[2em]" 
    :class="{ 
      'cursor-pointer': !isReadOnly,
      'justify-center': !numbered,
      'justify-between': numbered
    }"
    @click.stop="onClick"
  >
    <div ref="mathOutputRef" class="w-full overflow-x-auto"></div>
    <div v-if="numbered" class="equation-number ml-4 text-muted-foreground text-sm">
      ({{ equationNumber }})
    </div>
    <div v-if="mathError" class="text-destructive text-sm">{{ mathError }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineProps, defineEmits, onErrorCaptured, computed } from 'vue'
import { useMathJax } from '@/composables/useMathJax'
import { useEquationNumber } from '@/composables/useEquationCounter'

const props = defineProps<{
  latex: string
  isReadOnly: boolean
  numbered?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
}>()

// Generate a unique ID for this equation
const equationId = ref(`eq-${Math.random().toString(36).substring(2, 11)}`)

// Get the equation counter
const equationCounter = useEquationNumber()

// Compute the equation number
const equationNumber = computed(() => {
  if (props.numbered) {
    return equationCounter.getNumber(equationId.value)
  }
  return 0
})

const mathOutputRef = ref<HTMLElement | null>(null)
const mathError = ref<string | null>(null)
const { renderLatex, initMathJax, isMathJaxLoaded, error } = useMathJax()

const renderMath = async () => {
  try {
    mathError.value = null
    
    if (!isMathJaxLoaded.value) {
      await initMathJax()
    }
    
    if (props.latex) {
      const success = renderLatex(props.latex, mathOutputRef.value, true)
      if (!success && error.value) {
        mathError.value = 'Error rendering LaTeX'
      }
    } else if (mathOutputRef.value) {
      // Empty math block
      mathOutputRef.value.innerHTML = ''
    }
  } catch (err) {
    mathError.value = err instanceof Error ? err.message : String(err)
    console.error('Error in renderMath:', err)
  }
}

const onClick = (event: MouseEvent) => {
  try {
    if (!props.isReadOnly) {
      event.preventDefault()
      event.stopPropagation()
      emit('edit')
    }
  } catch (err) {
    mathError.value = err instanceof Error ? err.message : String(err)
    console.error('Error in onClick:', err)
  }
}

watch(() => props.latex, renderMath, { immediate: true })

onMounted(() => {
  renderMath()
})

// Capture errors
onErrorCaptured((err) => {
  mathError.value = err instanceof Error ? err.message : String(err)
  console.error('Error captured in MathDisplay:', err)
  return false
})
</script> 