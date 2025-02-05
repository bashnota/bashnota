<template>
  <div>
    <editor-menu-bar :editor="editor" />
    <editor-content :editor="editor" />
  </div>
</template>

<script>
import { EditorContent, EditorMenuBar, useEditor } from '@tiptap/vue-2';
import StarterKit from '@tiptap/starter-kit';

export default {
  components: {
    EditorContent,
    EditorMenuBar,
  },
  setup() {
    const editor = useEditor({
      extensions: [
        StarterKit,
      ],
      content: '<p>Hello World!</p>',
    });

    return {
      editor,
    };
  },
  beforeUnmount() {
    this.editor.destroy();
  },
};
</script>

<style>
/* Add your styles here */
</style>
