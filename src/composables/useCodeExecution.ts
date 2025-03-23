import { computed, ref } from 'vue'
import { useCodeExecutionStore } from '../stores/codeExecutionStore'
import { logger } from '@/services/logger'

export function useCodeExecution(cellId: string) {
  const store = useCodeExecutionStore()
  const cell = computed(() => store.getCellById(cellId))
  const isCopied = ref(false)

  const execute = async () => {
    await store.executeCell(cellId)
  }

  const copyOutput = async () => {
    if (!cell.value?.output) return

    try {
      await navigator.clipboard.writeText(cell.value.output)

      isCopied.value = true
      setTimeout(() => {
        isCopied.value = false
      }, 2000)

      return true
    } catch (error) {
      logger.error('Failed to copy output:', error)
      return false
    }
  }

  return {
    cell,
    execute,
    copyOutput,
    isCopied,
    executeAll: store.executeAll,
  }
}
