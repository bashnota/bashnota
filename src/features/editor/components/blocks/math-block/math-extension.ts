/**
 * Math node — ported onto the raw-ProseMirror primitives.
 *
 * Like-for-like port of the former `Node.create`. `toDOM` reproduces the original
 * `renderHTML` (a `div[data-type="math"]` carrying `data-latex`); the configured
 * `class: 'math-block'` from `.configure({ HTMLAttributes })` at the registration
 * site is merged back in by the adapter, so serialisation is unchanged.
 */
import { defineNode } from '@/features/editor/pm'
import type { NodeDefinition } from '@/features/editor/pm'

export interface MathOptions {
  HTMLAttributes: Record<string, unknown>
}

export const mathNodeDefinition: NodeDefinition = {
  name: 'math',
  group: 'block',
  atom: true,
  draggable: true,
  isolating: true,
  attrs: {
    latex: {
      default: '',
      parseHTML: (element) => element.getAttribute('data-latex') || '',
    },
    displayMode: {
      default: false,
      parseHTML: (element) => element.getAttribute('data-display-mode') === 'true',
    },
  },
  parseDOM: [{ tag: 'div[data-type="math"]' }],
  toDOM: (node) => ['div', {
    'data-latex': node.attrs.latex,
    'data-display-mode': String(node.attrs.displayMode),
    'data-type': 'math',
    class: 'math-block',
  }],
}

export const mathDefinition = defineNode(mathNodeDefinition)

export const MathExtension = mathDefinition

export default MathExtension
