import { ref } from 'vue'
import { CodeFixService } from '@/services/codeFixService'
import { toast } from '@/components/ui/toast'
import { useRouter } from 'vue-router'

interface AiCodeFixerOptions {
  onApplyFix: (fixedCode: string) => void
  onClose: () => void
}

export function useAiCodeFixer(options: AiCodeFixerOptions) {
  const isOpen = ref(false)
  const isLoading = ref(false)
  const fixedCode = ref('')
  const explanation = ref('')
  const isCopied = ref(false)
  const hasError = ref(false)
  const errorMessage = ref('')
  const provider = ref('')
  const router = useRouter()

  const codeFixService = new CodeFixService()

  const handleFixRequest = (originalCode: string, errorOutput: string) => {
    isOpen.value = true
  }

  const applyFix = (fixedCode: string) => {
    options.onApplyFix(fixedCode)
    close()
  }

  const close = () => {
    isOpen.value = false
    options.onClose()
  }

  const generateAiFix = async (originalCode: string, errorOutput: string, language: string) => {
    isLoading.value = true
    hasError.value = false
    errorMessage.value = ''
    
    try {
      const result = await codeFixService.generateFix(
        originalCode,
        errorOutput,
        language
      )
      
      fixedCode.value = result.fixedCode
      explanation.value = result.explanation
      provider.value = result.provider
    } catch (error) {
      console.error('Failed to generate AI fix:', error)
      hasError.value = true
      
      const errorStr = error instanceof Error ? error.message : 'Unknown error occurred'
      errorMessage.value = errorStr
      
      toast({
        title: 'AI Fix Failed',
        description: errorMessage.value,
        variant: 'destructive'
      })
    } finally {
      isLoading.value = false
    }
  }

  const copyFixedCode = async () => {
    try {
      await navigator.clipboard.writeText(fixedCode.value)
      isCopied.value = true
      setTimeout(() => {
        isCopied.value = false
      }, 2000)
      return true
    } catch (error) {
      console.error('Failed to copy code:', error)
      return false
    }
  }

  const goToAISettings = () => {
    router.push('/settings?tab=ai')
  }

  const retryGeneration = (originalCode: string, errorOutput: string, language: string) => {
    generateAiFix(originalCode, errorOutput, language)
  }

  const getDiffSummary = (originalCode: string) => {
    if (!fixedCode.value) return ''
    
    const originalLines = originalCode.split('\n').length
    const fixedLines = fixedCode.value.split('\n').length
    const lineChange = fixedLines - originalLines
    
    if (lineChange > 0) return `+${lineChange} lines`
    if (lineChange < 0) return `${lineChange} lines`
    return 'Same number of lines'
  }

  return {
    isOpen,
    isLoading,
    fixedCode,
    explanation,
    isCopied,
    hasError,
    errorMessage,
    provider,
    handleFixRequest,
    applyFix,
    close,
    generateAiFix,
    copyFixedCode,
    goToAISettings,
    retryGeneration,
    getDiffSummary
  }
} 