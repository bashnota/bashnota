import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Node as UnistNode } from 'unist'
import { visit } from 'unist-util-visit'

interface MarkdownNode extends UnistNode {
  lang?: string
  value?: string
  children?: MarkdownNode[]
}

export const MarkdownPasteExtension = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData('text/plain')
            if (!text) return false

            const processor = unified().use(remarkParse)
            const tree = processor.parse(text)
            
            const { tr } = view.state
            let pos = view.state.selection.from

            // Delete the selection if there is one
            if (view.state.selection.empty === false) {
              tr.deleteSelection()
            }

            visit(tree, (node: MarkdownNode) => {
              if (node.type === 'code') {
                const codeNode = view.state.schema.nodes.executableCodeBlock.create(
                  {
                    language: node.lang || 'plain',
                    executeable: false,
                  },
                  view.state.schema.text(node.value || '')
                )
                tr.insert(pos, codeNode)
                pos += codeNode.nodeSize
              } else if (node.type === 'paragraph') {
                const text = node.children
                  ?.map(child => (child.type === 'text' ? child.value : ''))
                  .join('')
                if (text) {
                  const paragraphNode = view.state.schema.nodes.paragraph.create(
                    null,
                    view.state.schema.text(text)
                  )
                  tr.insert(pos, paragraphNode)
                  pos += paragraphNode.nodeSize
                }
              }
            })

            view.dispatch(tr)
            return true
          },
        },
      }),
    ]
  },
}) 