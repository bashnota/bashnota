import { defineComponent, getCurrentInstance, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PropType } from 'vue'
import type { Editor } from './editor'

/** Vue host for a raw ProseMirror EditorView. */
export const EditorContent = defineComponent({
  name: 'EditorContent',
  inheritAttrs: false,
  props: {
    editor: { type: Object as PropType<Editor | null>, default: null },
  },
  setup(props, { attrs }) {
    const host = ref<HTMLElement | null>(null)
    const appContext = getCurrentInstance()?.appContext ?? null

    const mount = () => {
      if (!host.value || !props.editor) return
      props.editor.setAppContext(appContext)
      props.editor.mount(host.value)
    }

    onMounted(mount)
    watch(() => props.editor, (next, previous) => {
      if (previous && previous !== next) previous.unmount()
      mount()
    })
    onBeforeUnmount(() => props.editor?.unmount())

    return () => h('div', { ...attrs, ref: host, 'data-editor-content': '' })
  },
})

export default EditorContent
