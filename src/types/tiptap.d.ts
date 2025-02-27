import '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertDataTable: {
      insertDataTable: (notaId: string) => ReturnType
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