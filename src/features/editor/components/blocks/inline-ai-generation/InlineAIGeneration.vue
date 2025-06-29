<template>
  <node-view-wrapper class="inline-ai-generation">
    <div v-if="node.attrs.isLoading">
      Loading...
    </div>
    <div v-else-if="node.attrs.error">
      Error: {{ node.attrs.error }}
    </div>
    <div v-else>
      <p><strong>Prompt:</strong> {{ node.attrs.prompt }}</p>
      <p><strong>Result:</strong> {{ node.attrs.result }}</p>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
</script>

<style scoped>
.inline-ai-generation {
  border: 1px solid #eee;
  padding: 10px;
  margin: 10px 0;
  border-radius: 5px;
}
</style> 








