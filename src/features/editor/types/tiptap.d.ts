import '@tiptap/core'
import type { EditorEvents } from '@tiptap/vue-3'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertNotaTable: {
      insertNotaTable: (notaId: string) => ReturnType
    }
    insertInlineAIGeneration: {
      /**
       * Insert an inline AI generation block
       */
      insertInlineAIGeneration: () => ReturnType
    }
    generateInlineAI: {
      /**
       * Generate AI content for an inline block
       */
      generateInlineAI: (pos: number, prompt: string, isContinuation?: boolean) => ReturnType
    }
    generateText: {
      /**
       * Generate text using AI
       */
      generateText: (prompt: string) => ReturnType
    }
  }
}

declare module '@tiptap/vue-3' {
  interface EditorEvents {
    'toggle-ai-sidebar': () => void
  }
} 








