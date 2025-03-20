<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useCitationStore } from '@/stores/citationStore'
import { computed } from 'vue'

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

const citationStore = useCitationStore()
const citationKey = computed(() => props.node.attrs.citationKey)
</script>

<template>
  <NodeViewWrapper as="span" class="citation-reference">
    [{{ node.attrs.citationNumber || '?' }}]
  </NodeViewWrapper>
</template>

<style>
.citation-reference {
  @apply inline-flex items-center justify-center bg-primary/10 text-primary px-1 py-0.5 rounded-sm text-xs font-medium;
  user-select: all;
  cursor: pointer;
}
</style> 