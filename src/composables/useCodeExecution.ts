import { ref, computed, watch } from 'vue'
import { JupyterService } from '@/services/jupyterService'
import type { JupyterServer } from '@/types/jupyter'

export function useCodeExecution(codeRef: Ref<string>) {
  const jupyterService = new JupyterService()
  const output = ref('')
  const isExecuting = ref(false)
  const error = ref<Error | null>(null)
  const isCopied = ref(false)

  const hasError = computed(() => error.value !== null)

  async function execute(server: JupyterServer, kernelName: string) {
    isExecuting.value = true
    error.value = null
    output.value = 'Executing...'

    try {
      // Create session with the selected server and kernel
      const session = await jupyterService.createSession(server, kernelName)

      try {
        // Execute code using the selected server
        const result = await jupyterService.executeCode(
          server,
          session.id, 
          codeRef.value
        )

        // Get execution result from the selected server
        const executionResult = await jupyterService.getExecutionResult(
          server,
          session.id,
          result.msg_id
        )

        // Format output
        const outputs = []
        if (executionResult.content.stdout) outputs.push(executionResult.content.stdout)
        if (executionResult.content.stderr) outputs.push(executionResult.content.stderr)
        if (executionResult.content.error) {
          const { ename, evalue, traceback } = executionResult.content.error
          outputs.push(`${ename}: ${evalue}`)
          outputs.push(...traceback)
          error.value = new Error(`${ename}: ${evalue}`)
        }
        if (executionResult.content.data) {
          if (executionResult.content.data['text/plain']) {
            outputs.push(executionResult.content.data['text/plain'])
          }
          if (executionResult.content.data['text/html']) {
            outputs.push(executionResult.content.data['text/html'])
          }
        }

        output.value = outputs.join('\n')
      } finally {
        // Always clean up the session
        await jupyterService.deleteSession(server, session.id)
      }
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Unknown error occurred')
      output.value = error.value.message
    } finally {
      isExecuting.value = false
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output.value)
      isCopied.value = true
      // Reset copy status after 2 seconds
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
    isCopied
  }
} 