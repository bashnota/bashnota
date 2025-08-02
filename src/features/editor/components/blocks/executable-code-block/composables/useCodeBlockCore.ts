import { ref, computed, watch } from 'vue'
import { logger } from '@/services/logger'
import { useCodeTemplates } from './features/useCodeTemplates'

export function useCodeBlockCore(props: any, emit: any) {
  // DOM refs
  const codeBlockRef = ref<HTMLElement>()
  const outputRendererRef = ref<HTMLElement>()
  
  // Template functionality
  const { applyTemplate } = useCodeTemplates(props.language)
  
  // Cell state - simplified from the original complex state management
  const cell = computed(() => ({
    output: '',
    hasError: false,
    isExecuting: false
  }))
  
  // Code state
  const codeValue = ref(props.code)
  const hasUnsavedChanges = ref(false)
  
  // Watch for code changes
  watch(() => props.code, (newCode) => {
    if (newCode !== codeValue.value) {
      codeValue.value = newCode
      hasUnsavedChanges.value = false
    }
  })
  
  watch(codeValue, (newCode) => {
    if (newCode !== props.code) {
      hasUnsavedChanges.value = true
    }
  })
  
  // Basic readiness check
  const isReadyToExecute = computed(() => {
    return !!(codeValue.value?.trim() && props.language)
  })
  
  // CSS classes for the container
  const codeBlockClasses = computed(() => {
    return {
      'executing-block': cell.value?.isExecuting,
      'error-block': cell.value?.hasError,
      'published-block': props.isPublished
    }
  })
  
  // State management methods
  const updateCode = (newCode: string) => {
    codeValue.value = newCode
    emit('update:code', newCode)
  }
  
  const saveChanges = () => {
    emit('update:code', codeValue.value)
    hasUnsavedChanges.value = false
  }
  
  // Copy functionality  
  const isCodeCopied = ref(false)
  const isOutputCopied = ref(false)
  
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeValue.value)
      isCodeCopied.value = true
      setTimeout(() => isCodeCopied.value = false, 2000)
    } catch (error) {
      logger.error('Failed to copy code:', error)
    }
  }
  
  const copyOutput = async () => {
    try {
      const output = cell.value?.output || ''
      await navigator.clipboard.writeText(output)
      isOutputCopied.value = true
      setTimeout(() => isOutputCopied.value = false, 2000)
    } catch (error) {
      logger.error('Failed to copy output:', error)
    }
  }
  
  // Code formatting implementation
  const handleCodeFormatted = async () => {
    try {
      logger.log('Code formatting requested for language:', props.language)
      
      // Basic formatting rules by language
      let formattedCode = codeValue.value
      
      switch (props.language) {
        case 'python':
          // Remove excessive empty lines and normalize indentation
          formattedCode = formattedCode
            .split('\n')
            .map((line: string) => line.trimEnd()) // Remove trailing whitespace
            .join('\n')
            .replace(/\n{3,}/g, '\n\n') // Reduce multiple empty lines to max 2
          break
          
        case 'javascript':
        case 'typescript':
          // Basic JS/TS formatting
          formattedCode = formattedCode
            .replace(/;\s*\n/g, ';\n') // Normalize semicolon line endings
            .replace(/{\s*\n/g, '{\n') // Normalize opening braces
            .replace(/\n{3,}/g, '\n\n') // Reduce multiple empty lines
          break
          
        case 'json':
          try {
            // Parse and reformat JSON
            const parsed = JSON.parse(formattedCode)
            formattedCode = JSON.stringify(parsed, null, 2)
          } catch (error) {
            logger.warn('Invalid JSON, skipping format:', error)
          }
          break
          
        case 'sql':
          // Basic SQL formatting
          formattedCode = formattedCode
            .toUpperCase()
            .replace(/\bselect\b/gi, 'SELECT')
            .replace(/\bfrom\b/gi, 'FROM')
            .replace(/\bwhere\b/gi, 'WHERE')
            .replace(/\bjoin\b/gi, 'JOIN')
            .replace(/\border by\b/gi, 'ORDER BY')
            .replace(/\bgroup by\b/gi, 'GROUP BY')
          break
          
        default:
          // Generic formatting: remove trailing spaces and normalize line endings
          formattedCode = formattedCode
            .split('\n')
            .map((line: string) => line.trimEnd())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
      }
      
      if (formattedCode !== codeValue.value) {
        updateCode(formattedCode)
        logger.log('Code formatted successfully')
      } else {
        logger.log('Code was already formatted')
      }
    } catch (error) {
      logger.error('Code formatting failed:', error)
    }
  }
  
  // Template handling
  const handleTemplateSelected = (template: any) => {
    const formattedCode = applyTemplate(template, props.language)
    updateCode(formattedCode)
  }
  
  return {
    // Refs
    codeBlockRef,
    outputRendererRef,
    
    // State
    cell,
    codeValue,
    hasUnsavedChanges,
    isReadyToExecute,
    codeBlockClasses,
    isCodeCopied,
    isOutputCopied,
    
    // Methods
    updateCode,
    saveChanges,
    copyCode,
    copyOutput,
    handleCodeFormatted,
    handleTemplateSelected
  }
}
