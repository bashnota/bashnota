<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  editor: any
}>()

const headings = computed(() => {
  if (!props.editor) return []
  
  const json = props.editor.getJSON()
  const headings = []
  
  const processNode = (node: any, level = 0) => {
    if (node.type === 'heading') {
      headings.push({
        level: node.attrs.level,
        text: node.content?.[0]?.text || '',
        indent: level
      })
    }
    if (node.content) {
      node.content.forEach((child: any) => processNode(child, level + 1))
    }
  }
  
  json.content?.forEach(node => processNode(node))
  return headings
})

const scrollToHeading = (text: string) => {
  const element = document.evaluate(
    `//h1[contains(text(),'${text}')] | //h2[contains(text(),'${text}')] | //h3[contains(text(),'${text}')]`,
    document.body,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue as HTMLElement
  
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="table-of-contents">
    <h3>Table of Contents</h3>
    <div class="toc-items">
      <button
        v-for="(heading, index) in headings"
        :key="index"
        class="toc-item"
        :style="{ paddingLeft: `${heading.level * 1}rem` }"
        @click="scrollToHeading(heading.text)"
      >
        {{ heading.text }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.table-of-contents {
  padding: 1rem;
  background: var(--color-toc-background);
  border-radius: 8px;
  margin-bottom: 1rem;
}

h3 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
  color: var(--color-toc-text);
}

.toc-items {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toc-item {
  text-align: left;
  padding: 0.25rem;
  background: none;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--color-toc-text);
  cursor: pointer;
  transition: all 0.2s;
}

.toc-item:hover {
  background: var(--color-toc-hover);
}
</style> 