import { Editor } from '@tiptap/vue-3'
import { getEditorExtensions } from '@/features/editor/components/extensions'

/**
 * Converts a Markdown string to a Tiptap-compatible JSON object.
 * @param markdown The Markdown string to convert.
 * @returns A JSON object representing the Tiptap document.
 */
export function markdownToTiptap(markdown: string): object {
  const editor = new Editor({
    extensions: getEditorExtensions(),
    content: markdown,
  })

  const json = editor.getJSON()
  editor.destroy()
  return json
} 