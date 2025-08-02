import { ref, computed } from 'vue'
import { EditorView } from '@codemirror/view'
import { indentWithTab, indentMore, indentLess } from '@codemirror/commands'

export interface CodeFormattingOptions {
  language: string
  tabSize: number
  insertSpaces: boolean
  autoFormat: boolean
}

export function useCodeFormatting(options: CodeFormattingOptions) {
  const isFormatting = ref(false)
  const formatError = ref<string | null>(null)

  // Language-specific formatters
  const formatters = {
    python: async (code: string): Promise<string> => {
      // Simple Python formatting rules
      const lines = code.split('\n')
      let indentLevel = 0
      const formatted = lines.map(line => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        
        // Decrease indent for dedent keywords
        if (trimmed.match(/^(except|elif|else|finally):/)) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
        
        const formatted = ' '.repeat(indentLevel * options.tabSize) + trimmed
        
        // Increase indent after colon
        if (trimmed.endsWith(':')) {
          indentLevel++
        }
        
        return formatted
      })
      
      return formatted.join('\n')
    },

    javascript: async (code: string): Promise<string> => {
      // Simple JS formatting
      const lines = code.split('\n')
      let indentLevel = 0
      const formatted = lines.map(line => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        
        // Handle closing braces
        if (trimmed.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
        
        const formatted = ' '.repeat(indentLevel * options.tabSize) + trimmed
        
        // Handle opening braces
        if (trimmed.endsWith('{')) {
          indentLevel++
        }
        
        return formatted
      })
      
      return formatted.join('\n')
    },

    json: async (code: string): Promise<string> => {
      try {
        const parsed = JSON.parse(code)
        return JSON.stringify(parsed, null, options.tabSize)
      } catch (error) {
        throw new Error('Invalid JSON syntax')
      }
    }
  }

  const formatCode = async (code: string): Promise<string> => {
    if (!code.trim()) return code
    
    isFormatting.value = true
    formatError.value = null
    
    try {
      const formatter = formatters[options.language as keyof typeof formatters]
      if (formatter) {
        return await formatter(code)
      }
      
      // Fallback: basic indentation
      return formatBasicIndentation(code)
    } catch (error) {
      formatError.value = error instanceof Error ? error.message : 'Formatting failed'
      return code
    } finally {
      isFormatting.value = false
    }
  }

  const formatBasicIndentation = (code: string): string => {
    const lines = code.split('\n')
    return lines.map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      return trimmed
    }).join('\n')
  }

  const getFormattingExtensions = () => {
    return [
      EditorView.updateListener.of((update) => {
        if (update.docChanged && options.autoFormat) {
          // Auto-format on certain triggers
          const changes = update.changes
          changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            const insertedText = inserted.toString()
            if (insertedText === '\n' || insertedText === ':' || insertedText === '}') {
              // Trigger auto-formatting for the current line
              setTimeout(() => {
                formatCurrentLine(update.view)
              }, 100)
            }
          })
        }
      })
    ]
  }

  const formatCurrentLine = (view: EditorView) => {
    const { state } = view
    const line = state.doc.lineAt(state.selection.main.head)
    const lineText = line.text
    
    if (lineText.trim()) {
      // Apply basic indentation rules
      const indentMatch = lineText.match(/^(\s*)/)
      const currentIndent = indentMatch ? indentMatch[1] : ''
      const content = lineText.trim()
      
      // Calculate proper indentation based on context
      const properIndent = calculateIndentation(view, line.number)
      const newLineText = properIndent + content
      
      if (newLineText !== lineText) {
        view.dispatch({
          changes: {
            from: line.from,
            to: line.to,
            insert: newLineText
          }
        })
      }
    }
  }

  const calculateIndentation = (view: EditorView, lineNumber: number): string => {
    const { state } = view
    let indentLevel = 0
    
    // Look at previous lines to determine indentation
    for (let i = 1; i < lineNumber; i++) {
      const line = state.doc.line(i)
      const text = line.text.trim()
      
      if (text.endsWith(':') || text.endsWith('{')) {
        indentLevel++
      } else if (text.startsWith('}') || text.match(/^(except|elif|else|finally):/)) {
        indentLevel = Math.max(0, indentLevel - 1)
      }
    }
    
    return ' '.repeat(indentLevel * options.tabSize)
  }

  const formatSelection = async (view: any): Promise<void> => {
    const { state } = view
    const { from, to } = state.selection.main
    const selectedText = state.doc.sliceString(from, to)
    
    if (selectedText) {
      const formatted = await formatCode(selectedText)
      view.dispatch({
        changes: { from, to, insert: formatted }
      })
    }
  }

  const formatDocument = async (view: any): Promise<void> => {
    const { state } = view
    const fullText = state.doc.toString()
    const formatted = await formatCode(fullText)
    
    view.dispatch({
      changes: { from: 0, to: state.doc.length, insert: formatted }
    })
  }

  return {
    isFormatting: computed(() => isFormatting.value),
    formatError: computed(() => formatError.value),
    formatCode,
    formatSelection,
    formatDocument,
    getFormattingExtensions,
    formatCurrentLine
  }
} 








