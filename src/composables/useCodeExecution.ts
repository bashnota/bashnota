import { ref, computed, watch } from 'vue'
import { JupyterService } from '@/services/jupyterService'
import type { JupyterServer } from '@/types/jupyter'

export function useCodeExecution(codeRef: Ref<string>) {
  const jupyterService = new JupyterService()
  const output = ref('')
  const isExecuting = ref(false)
  const error = ref<Error | null>(null)
  const isCopied = ref(false)
  const hasError = ref(false)

  const formatOutput = (result: any) => {
    const parts = []

    // Add stdout if present
    if (result.content.stdout) {
      parts.push(result.content.stdout)
    }

    // Add stderr if present
    if (result.content.stderr) {
      parts.push(result.content.stderr)
    }

    // Add execution result if present
    if (result.content.data) {
      if (result.content.data['text/plain']) {
        parts.push(result.content.data['text/plain'])
      }
      if (result.content.data['text/html']) {
        parts.push(result.content.data['text/html'])
      }
    }

    // Add error if present
    if (result.content.error) {
      hasError.value = true
      parts.push(`${result.content.error.ename}: ${result.content.error.evalue}`)
      if (result.content.error.traceback) {
        parts.push(result.content.error.traceback.join('\n'))
      }
      error.value = new Error(`${result.content.error.ename}: ${result.content.error.evalue}`)
    }

    return parts.join('\n')
  }

  const execute = async (server: JupyterServer, kernelName: string) => {
    isExecuting.value = true
    hasError.value = false
    output.value = ''
    error.value = null

    try {
      // Execute code and get result directly
      const result = await jupyterService.executeCode(server, kernelName, codeRef.value)
      output.value = formatOutput(result)
    } catch (err) {
      console.error('Execution error:', err)
      hasError.value = true
      error.value = err instanceof Error ? err : new Error('Execution failed')
      output.value = error.value.message
    } finally {
      isExecuting.value = false
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output.value)
      isCopied.value = true
      setTimeout(() => {
        isCopied.value = false
      }, 2000)
    } catch (err) {
      console.error('Failed to copy output:', err)
      error.value = new Error('Failed to copy output to clipboard')
    }
  }

  // Watch for code changes to clear output
  watch(codeRef, () => {
    output.value = ''
    error.value = null
    isCopied.value = false
  })

  return {
    output,
    isExecuting,
    error,
    hasError,
    execute,
    copyOutput,
    isCopied,
  }
}
