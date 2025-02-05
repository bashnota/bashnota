<script setup lang="ts">
import { Editor } from '@tiptap/vue-3'

defineProps<{
  editor: Editor | null
}>()
</script>

<template>
  <div class="editor-toolbar" v-if="editor">
    <button
      @click="editor.chain().focus().toggleBold().run()"
      :class="{ 'is-active': editor.isActive('bold') }"
    >
      Bold
    </button>
    <button
      @click="editor.chain().focus().toggleItalic().run()"
      :class="{ 'is-active': editor.isActive('italic') }"
    >
      Italic
    </button>
    <button
      @click="editor.chain().focus().toggleCode().run()"
      :class="{ 'is-active': editor.isActive('code') }"
    >
      Code
    </button>
    <button
      @click="editor.chain().focus().toggleCodeBlock().run()"
      :class="{ 'is-active': editor.isActive('codeBlock') }"
    >
      Code Block
    </button>
    <button
      @click="editor.chain().focus().toggleBulletList().run()"
      :class="{ 'is-active': editor.isActive('bulletList') }"
    >
      Bullet List
    </button>
    <button
      @click="editor.chain().focus().toggleOrderedList().run()"
      :class="{ 'is-active': editor.isActive('orderedList') }"
    >
      Ordered List
    </button>
  </div>
</template>

<style scoped>
.editor-toolbar {
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

button:hover {
  background: var(--color-background-soft);
}

button.is-active {
  background: var(--color-primary);
  color: white;
}
</style> 