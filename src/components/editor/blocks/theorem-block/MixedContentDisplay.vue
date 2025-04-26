<template>
  <div class="mixed-content-display">
    <div v-if="processedContent" v-html="processedContent" class="mixed-content-wrapper"></div>
    <div v-else class="min-h-[1.5em]">{{ props.content }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMathJax } from '@/composables/useMathJax'
import { logger } from '@/services/logger'

const props = defineProps<{
  content: string
}>()

const processedContent = ref<string>('')
const { renderLatexInline, initMathJax, isMathJaxLoaded } = useMathJax()

// Process content to render LaTeX expressions inside dollar signs
const processContent = async () => {
  try {
    if (!props.content) {
      processedContent.value = ''
      return
    }

    // Make sure MathJax is loaded
    if (!isMathJaxLoaded.value) {
      await initMathJax()
    }
    
    // Pre-process content to preserve whitespace and add proper line breaks
    let contentWithBreaks = props.content
      // Replace newlines with proper paragraph breaks
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.trim()}</p>`)
      .join('')
      // Replace single newlines with line breaks
      .replace(/\n/g, '<br>')
    
    // Convert LaTeX expressions to HTML with MathJax
    const result = renderLatexInline(contentWithBreaks)
    processedContent.value = result
  } catch (error) {
    logger.error('Error processing mixed content:', error)
    // Fallback to plain text if processing fails
    processedContent.value = props.content
  }
}

// Watch for changes in content
watch(() => props.content, processContent, { immediate: true })

// Process content on mount
onMounted(async () => {
  await processContent()
})
</script>

<style>
.mixed-content-display {
  line-height: 1.6;
}

/* Make sure inline math formulas don't break the text flow */
.mixed-content-wrapper .MJX-TEX {
  display: inline-block;
  vertical-align: middle;
}

.mixed-content-wrapper p {
  margin-bottom: 0.75em;
}

.mixed-content-wrapper p:last-child {
  margin-bottom: 0;
}
</style>