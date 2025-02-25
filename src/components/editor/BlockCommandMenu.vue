<script setup lang="ts">
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Trash2Icon, ScissorsIcon, CopyIcon } from 'lucide-vue-next'
import { onMounted, onUnmounted } from 'vue'
import type { EditorView } from '@tiptap/pm/view'
import { serializeForClipboard } from './extensions/DragHandlePlugin'
import type { Selection } from '@tiptap/pm/state'

const props = defineProps<{
  position: { x: number; y: number } | null
  selection: Selection | null
  isVisible: boolean
  editorView?: EditorView
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const cut = () => {
  emit('close')
  if (!props.editorView || !props.selection) return

  const slice = props.selection.content()
  const { dom, text } = serializeForClipboard(props.editorView, slice)

  // Copy the content to the clipboard
  const clipboardItem = new ClipboardItem({
    'text/html': new Blob([dom.innerHTML], { type: 'text/html' }),
    'text/plain': new Blob([text], { type: 'text/plain' }),
  })

  navigator.clipboard.write([clipboardItem]).then(() => {
    if (!props.editorView || !props.selection) return

    // After copying, delete the selected block
    const { state, dispatch } = props.editorView
    const tr = state.tr.delete(props.selection.from, props.selection.to)
    dispatch(tr)
  })
}

const copy = () => {
  emit('close')
  if (!props.editorView || !props.selection) return

  const slice = props.selection.content()
  const { dom, text } = serializeForClipboard(props.editorView, slice)

  // Copy the content to the clipboard
  const clipboardItem = new ClipboardItem({
    'text/html': new Blob([dom.innerHTML], { type: 'text/html' }),
    'text/plain': new Blob([text], { type: 'text/plain' }),
  })

  navigator.clipboard.write([clipboardItem])
}

const deleteBlock = () => {
  emit('close')
  if (!props.editorView || !props.selection) return

  const { state, dispatch } = props.editorView!
  const tr = state.tr.delete(props.selection.from, props.selection.to)
  dispatch(tr)

  // Focus the editor after deleting
  props.editorView.focus()
}

// Handle click outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.command-menu')) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <Command
    v-if="isVisible && position"
    class="fixed z-50 rounded-lg border shadow-md w-64 h-auto command-menu bg-popover"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
    }"
  >
    <CommandList>
      <CommandGroup>
        <CommandItem value="cut" @select="cut">
          <ScissorsIcon class="mr-2 h-4 w-4" />
          <span>Cut</span>
        </CommandItem>
        <CommandItem value="copy" @select="copy">
          <CopyIcon class="mr-2 h-4 w-4" />
          <span>Copy</span>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator />

      <CommandGroup>
        <CommandItem
          class="text-red-600 hover:bg-red-100 hover:text-red-600"
          value="delete"
          @select="deleteBlock"
        >
          <Trash2Icon class="mr-2 h-4 w-4" />
          <span>Delete</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
</template>

<style scoped>
.fixed {
  position: fixed;
}
</style>
