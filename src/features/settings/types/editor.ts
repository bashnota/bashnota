export interface EditorSettings {
  // Text Editing
  fontSize: number[]
  lineHeight: number[]
  textColor: string
  lightModeTextColor: string
  autoSave: boolean
  spellCheck: boolean
  wordWrap: boolean
  
  // Code Editing
  codeTheme: string
  codeFontSize: number[]
  codeLineHeight: number[]
  showLineNumbers: boolean
  highlightActiveLine: boolean
  autoCloseBrackets: boolean
  autoIndent: boolean
  tabSize: number[]
  
  // Formatting
  autoFormat: boolean
  formatOnSave: boolean
  trimTrailingWhitespace: boolean
  insertFinalNewline: boolean
  indentType: 'spaces' | 'tabs'
  indentSize: number[]
}

export const editorSettingsDefaults: EditorSettings = {
  fontSize: [16],
  lineHeight: [1.6],
  textColor: '#e5e5e5',
  lightModeTextColor: '#1f1f1f',
  autoSave: true,
  spellCheck: true,
  wordWrap: true,
  codeTheme: 'vs-dark',
  codeFontSize: [14],
  codeLineHeight: [1.4],
  showLineNumbers: true,
  highlightActiveLine: true,
  autoCloseBrackets: true,
  autoIndent: true,
  tabSize: [2],
  autoFormat: true,
  formatOnSave: false,
  trimTrailingWhitespace: true,
  insertFinalNewline: true,
  indentType: 'spaces',
  indentSize: [2]
}
