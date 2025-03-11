declare module './AiCodeFixer.vue' {
  import { DefineComponent } from 'vue'
  
  const AiCodeFixer: DefineComponent<{
    originalCode: string
    errorOutput: string
    isOpen: boolean
    language: string
  }, {
    generateAiFix: () => Promise<void>
    retryGeneration: () => void
    applyFix: () => void
    closeDialog: () => void
    copyFixedCode: () => Promise<void>
    goToAISettings: () => void
  }, any>
  
  export default AiCodeFixer
} 