import { ref } from 'vue'
import { loadPyodide } from 'pyodide'
import type { PyodideInterface } from 'pyodide'

export function usePyodide() {
  const pyodide = ref<PyodideInterface | null>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  let stdoutBuffer = ''
  let stderrBuffer = ''

  const initializePyodide = async () => {
    if (isInitialized.value) return

    try {
      isLoading.value = true
      pyodide.value = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/',
        stdout: (output) => {
          stdoutBuffer += output
        },
        stderr: (error) => {
          stderrBuffer += error
        }
      })
      // Initialize sys for proper stdout handling
      await pyodide.value.runPythonAsync(`
        import sys
        import io
        sys.stdout = io.StringIO()
      `)
      isInitialized.value = true
    } catch (error) {
      console.error('Failed to initialize Pyodide:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const execute = async (code: string): Promise<string> => {
    if (!pyodide.value) {
      throw new Error('Pyodide not initialized')
    }

    isLoading.value = true
    try {
      // Clear buffers before execution
      stdoutBuffer = ''
      stderrBuffer = ''

      // Reset stdout
      await pyodide.value.runPythonAsync('sys.stdout.seek(0)\nsys.stdout.truncate(0)')
      
      // Run the actual code
      const result = await pyodide.value.runPythonAsync(code)
      
      // Get stdout content
      const stdout = await pyodide.value.runPythonAsync('sys.stdout.getvalue()')
      
      // Combine outputs
      let output = ''
      if (stdout) output += stdout
      if (stderrBuffer) output += `Error: ${stderrBuffer}`
      if (result !== undefined && result !== null && result.toString() !== 'undefined' && result.toString() !== 'None') {
        output += result.toString()
      }
      
      return output.trim() || 'No output'
    } catch (error) {
      if (stderrBuffer) {
        return `Error: ${stderrBuffer.trim()}`
      }
      return `Error: ${error instanceof Error ? error.message : String(error)}`
    } finally {
      isLoading.value = false
    }
  }

  return {
    execute,
    isLoading,
    isInitialized,
    initializePyodide,
  }
} 