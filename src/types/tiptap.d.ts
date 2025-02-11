import '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertDataTable: {
      insertDataTable: (notaId: string) => ReturnType
    }
  }
} 