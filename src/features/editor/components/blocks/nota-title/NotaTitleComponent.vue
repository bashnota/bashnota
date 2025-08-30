<template>
  <NodeViewWrapper class="nota-title-block">
    <div class="nota-title-container">
      <div
        ref="titleInput"
        class="nota-title-input"
        contenteditable="true"
        :placeholder="placeholder"
        @input="handleInput"
        @blur="handleBlur"
        @keydown="handleKeydown"
        @focus="handleFocus"
      ></div>
    </div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { useNotaStore } from '@/features/nota/stores/nota'
import { toast } from 'vue-sonner'

interface Props {
  node: any
  updateAttributes: (attrs: Record<string, any>) => void
  editor: any
}

const props = defineProps<Props>()

const notaStore = useNotaStore()
const titleInput = ref<HTMLElement>()
const originalTitle = ref('')
const currentTitle = ref('')
const isSaving = ref(false)

const placeholder = computed(() => {
  return 'Untitled'
})

onMounted(() => {
  if (titleInput.value) {
    // Set the initial content
    const title = props.node.attrs.title || ''
    titleInput.value.textContent = title
    currentTitle.value = title
    originalTitle.value = title
  }
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLElement
  currentTitle.value = target.textContent || ''
  
  // Update the node attributes
  props.updateAttributes({ title: currentTitle.value })
}

const handleFocus = () => {
  originalTitle.value = currentTitle.value
}

const handleBlur = async () => {
  if (isSaving.value) return
  
  const title = currentTitle.value.trim()
  
  // Don't save if no changes or empty
  if (title === originalTitle.value || title === '') {
    if (title === '') {
      // Revert empty title
      if (titleInput.value) {
        titleInput.value.textContent = originalTitle.value
        currentTitle.value = originalTitle.value
      }
      props.updateAttributes({ title: originalTitle.value })
    }
    return
  }
  
  // Auto-save the title
  await saveTitle(title)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    // Move focus to the next block to trigger auto-save
    props.editor.commands.focus()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    // Revert to original title
    if (titleInput.value) {
      titleInput.value.textContent = originalTitle.value
      currentTitle.value = originalTitle.value
    }
    props.updateAttributes({ title: originalTitle.value })
  }
}

const saveTitle = async (title: string) => {
  if (isSaving.value) return
  
  try {
    isSaving.value = true
    
    // Get the nota ID from the editor or URL
    const notaId = props.editor.options.content.notaId || 
                   window.location.pathname.split('/').pop()
    
    if (notaId) {
      await notaStore.updateNotaTitle(notaId, title)
      originalTitle.value = title
      toast.success('Title updated')
    }
    
  } catch (error) {
    console.error('Error saving title:', error)
    toast.error('Failed to update title')
    
    // Revert on error
    if (titleInput.value) {
      titleInput.value.textContent = originalTitle.value
      currentTitle.value = originalTitle.value
    }
    props.updateAttributes({ title: originalTitle.value })
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.nota-title-block {
  margin-bottom: 1rem;
}

.nota-title-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nota-title-input {
  flex: 1;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  color: hsl(var(--foreground));
  background: transparent;
  border: none;
  outline: none;
  padding: 0.5rem 0;
  min-height: 3rem;
  resize: none;
  font-family: inherit;
}

.nota-title-input:empty::before {
  content: attr(placeholder);
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}

.nota-title-input:focus {
  outline: none;
}



/* Responsive design */
@media (max-width: 768px) {
  .nota-title-input {
    font-size: 1.5rem;
    min-height: 2.5rem;
  }
}
</style>
