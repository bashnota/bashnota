<template>
  <div class="mixed-content-display">
    <div v-if="processedContent" v-html="processedContent" class="mixed-content-wrapper"></div>
    <div v-else class="min-h-[1.5em]">{{ props.content }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMathJax } from '@/features/editor/composables/useMathJax'
import { logger } from '@/services/logger'
import {
  sanitizeRenderedTheoremContent,
  sanitizeTheoremSource,
} from '@/features/editor/utils/sanitizeTheoremContent'

const props = defineProps<{
  content: string
}>()

const processedContent = ref<string>('')
const { renderLatexInline, initMathJax, isMathJaxLoaded } = useMathJax()

const prepareSource = (content: string) => {
  // The persisted value remains untouched; this is only the transient source
  // passed to MathJax and, on failure, rendered as the safe fallback.
  return sanitizeTheoremSource(content)
    .split('\n\n')
    .map(paragraph => `<p>${paragraph.trim()}</p>`)
    .join('')
    .replace(/\n/g, '<br>')
}

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
    
    // Strip untrusted source attributes before it is combined with MathJax's
    // generated markup. The second sanitization below is still required: a
    // renderer error or an unexpected renderer result must never bypass v-html.
    const contentWithBreaks = prepareSource(props.content)
    
    // Convert LaTeX expressions to HTML with MathJax
    const result = renderLatexInline(contentWithBreaks)
    processedContent.value = sanitizeRenderedTheoremContent(result)
  } catch (error) {
    logger.error('Error processing mixed content:', error)
    // The same post-render boundary covers the renderer-error fallback.
    processedContent.value = sanitizeRenderedTheoremContent(prepareSource(props.content))
  }
}

// Watch for changes in content
watch(() => props.content, processContent, { immediate: true })

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




