import { Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ExecutableCodeBlock from '@/components/editor/blocks/executable-code-block/ExecutableCodeBlock.vue'

export const ExecutableCodeBlockExtension = Node.create({
  name: 'executableCodeBlock',
  
  group: 'block',
  
  content: 'text*',
  
  addAttributes() {
    return {
      id: { default: null },
      code: { default: '' },
      language: { default: 'python' },
      result: { default: null },
      serverID: { default: null },
      kernelName: { default: null },
      sessionId: { default: null },
      notaId: { default: null },
      kernelPreference: { default: null }
    }
  },
  
  parseHTML() {
    return [{ tag: 'div[data-type="executable-code-block"]' }]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'executable-code-block', ...HTMLAttributes }, 0]
  },
  
  addNodeView() {
    return VueNodeViewRenderer(ExecutableCodeBlock)
  }
}) 