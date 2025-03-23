import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MermaidBlock from '../blocks/mermaid-block/MermaidBlock.vue'
import type { MermaidTheme } from '../blocks/mermaid-block/types'

export interface MermaidOptions {
  HTMLAttributes: Record<string, any>;
  defaultContent?: string;
  defaultTheme?: MermaidTheme;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /**
       * Add a mermaid diagram block
       */
      setMermaid: (options?: { content?: string | { diagram: string }; theme?: MermaidTheme }) => ReturnType
      /**
       * Update a mermaid diagram's content
       */
      updateMermaidContent: (content: string | { diagram: string }) => ReturnType
    }
  }
}

// Default example for a valid diagram
const DEFAULT_MERMAID_CONTENT = `graph TD
    A[Start] --> B{Is it valid?}
    B -->|Yes| C[OK]
    B -->|No| D[Error]
    C --> E[End]
    D --> E`;

// Helper function to normalize content into a string
function normalizeContent(content: string | { diagram: string } | any): string {
  if (!content) return '';
  
  if (typeof content === 'string') {
    return content;
  }
  
  if (typeof content === 'object' && content !== null) {
    if ('diagram' in content) {
      return content.diagram || '';
    }
  }
  
  return String(content);
}

export const Mermaid = Node.create<MermaidOptions>({
  name: 'mermaid',
  group: 'block',
  atom: true,
  inline: false,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      defaultContent: DEFAULT_MERMAID_CONTENT,
      defaultTheme: 'default',
    }
  },

  addAttributes() {
    return {
      content: {
        default: this.options.defaultContent,
        parseHTML: (element) => {
          const content = element.getAttribute('data-content') || this.options.defaultContent;
          return normalizeContent(content);
        },
        renderHTML: (attributes) => {
          return {
            'data-content': normalizeContent(attributes.content),
          }
        },
      },
      theme: {
        default: this.options.defaultTheme,
        parseHTML: (element) => element.getAttribute('data-theme') || this.options.defaultTheme,
        renderHTML: (attributes) => {
          return {
            'data-theme': attributes.theme,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {}
          const element = dom as HTMLElement
          const content = element.getAttribute('data-content') || this.options.defaultContent;
          
          return {
            content: normalizeContent(content),
            theme: element.getAttribute('data-theme') || this.options.defaultTheme,
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      { 'data-type': 'mermaid' }
    ), 0]
  },

  addNodeView() {
    // @ts-expect-error Vue component compatibility with NodeViewRenderer
    return VueNodeViewRenderer(MermaidBlock)
  },

  addCommands() {
    return {
      setMermaid: (options = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            content: options.content ? normalizeContent(options.content) : this.options.defaultContent,
            theme: options.theme || this.options.defaultTheme,
          },
        })
      },
      updateMermaidContent: (content) => ({ tr, dispatch, state }) => {
        // Try to find a mermaid node at the selection
        const { selection } = state
        const currentNode = selection.$anchor.node()
        
        if (currentNode.type.name === this.name) {
          if (dispatch) {
            tr.setNodeMarkup(selection.$anchor.pos - selection.$anchor.parentOffset, undefined, {
              ...currentNode.attrs,
              content: normalizeContent(content),
            })
          }
          
          return true
        }
        
        return false
      },
    }
  },
})
