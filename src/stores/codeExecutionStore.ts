import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CodeExecutionService } from '../services/codeExecutionService'
import type { CodeCell, KernelSession } from '@/types/codeExecution'
import type { JupyterServer } from '@/types/jupyter'

export const useCodeExecutionStore = defineStore('codeExecution', () => {
  const cells = ref<Map<string, CodeCell>>(new Map())
  const kernelSessions = ref<Map<string, KernelSession>>(new Map())
  const executionService = new CodeExecutionService()

  // Getters
  const getCellById = computed(() => (id: string) => cells.value.get(id))
  const getCellsByKernel = computed(() => (kernelId: string) => {
    const session = kernelSessions.value.get(kernelId)
    return session?.cells.map((id) => cells.value.get(id)).filter(Boolean) ?? []
  })

  // Actions
  function addCell(cell: Omit<CodeCell, 'isExecuting' | 'hasError' | 'error'>) {
    cells.value.set(cell.id, {
      ...cell,
      isExecuting: false,
      hasError: false,
      error: null,
    })
  }

  async function createKernelSession(serverConfig: JupyterServer, kernelName: string) {
    try {
      const kernelId = await executionService.createKernel(serverConfig, kernelName)
      const sessionKey = `${serverConfig.ip}:${serverConfig.port}:${kernelName}`
      kernelSessions.value.set(sessionKey, {
        kernelId,
        serverConfig,
        kernelName,
        cells: [],
      })
      return sessionKey
    } catch (error) {
      console.error('Failed to create kernel session:', error)
      throw error
    }
  }

  async function executeCell(cellId: string) {
    const cell = cells.value.get(cellId)
    if (!cell || !cell.serverConfig) return

    cell.isExecuting = true
    cell.hasError = false
    cell.error = null
    cell.output = ''
    cells.value.set(cellId, cell)

    try {
      // Get or create kernel session
      const sessionKey = `${cell.serverConfig.ip}:${cell.serverConfig.port}:${cell.kernelName}`
      let session = kernelSessions.value.get(sessionKey)

      if (!session) {
        const newSessionKey = await createKernelSession(cell.serverConfig, cell.kernelName)
        session = kernelSessions.value.get(newSessionKey)
      }

      if (!session) throw new Error('Failed to create or get kernel session')

      // Add cell to session if not already added
      if (!session.cells.includes(cellId)) {
        session.cells.push(cellId)
      }

      // Execute code
      const results = await executionService.executeNotebookBlocks(
        cell.serverConfig,
        session.kernelId,
        [{ id: cellId, notebookId: sessionKey, code: cell.code }],
      )

      const result = results[0]
      if (result) {
        cell.output = result.output
      }
    } catch (error) {
      cell.hasError = true
      cell.error = error instanceof Error ? error : new Error('Execution failed')
      cell.output = cell.error.message
    } finally {
      cell.isExecuting = false
      cells.value.set(cellId, cell)
    }
  }

  async function executeAll() {
    // Group cells by kernel session
    const cellsBySession = new Map<string, CodeCell[]>()

    for (const cell of cells.value.values()) {
      if (!cell.serverConfig) continue

      const sessionKey = `${cell.serverConfig.ip}:${cell.serverConfig.port}:${cell.kernelName}`
      if (!cellsBySession.has(sessionKey)) {
        cellsBySession.set(sessionKey, [])
      }
      cellsBySession.get(sessionKey)?.push(cell)
    }

    // Execute cells for each session in parallel
    const executionPromises = Array.from(cellsBySession.entries()).map(
      async ([sessionKey, sessionCells]) => {
        let session = kernelSessions.value.get(sessionKey)

        if (!session) {
          const config = sessionCells[0].serverConfig
          if (!config) return

          const kernelName = sessionCells[0].kernelName
          const newSessionKey = await createKernelSession(config, kernelName)
          session = kernelSessions.value.get(newSessionKey)
        }

        if (!session) throw new Error('Failed to create or get kernel session')

        // Update session cells
        session.cells = sessionCells.map((cell) => cell.id)

        // Prepare cells for execution
        const codeBlocks = sessionCells.map((cell) => ({
          id: cell.id,
          notebookId: sessionKey,
          code: cell.code,
        }))

        // Mark cells as executing
        sessionCells.forEach((cell) => {
          cell.isExecuting = true
          cell.hasError = false
          cell.error = null
          cell.output = ''
        })

        try {
          const results = await executionService.executeNotebookBlocks(
            session.serverConfig,
            session.kernelId,
            codeBlocks,
          )

          // Update cell outputs
          results.forEach((result) => {
            const cell = cells.value.get(result.id)
            if (cell) {
              cell.output = result.output
            }
          })
        } catch (error) {
          sessionCells.forEach((cell) => {
            cell.hasError = true
            cell.error = error instanceof Error ? error : new Error('Execution failed')
            cell.output = cell.error.message
          })
        } finally {
          sessionCells.forEach((cell) => {
            cell.isExecuting = false
          })
        }
      },
    )

    await Promise.all(executionPromises)
  }

  async function cleanup() {
    // Clean up all kernel sessions
    for (const session of kernelSessions.value.values()) {
      try {
        await executionService.deleteKernel(session.serverConfig, session.kernelId)
      } catch (error) {
        console.error('Failed to delete kernel:', error)
      }
    }
    kernelSessions.value.clear()
  }

  return {
    cells,
    kernelSessions,
    getCellById,
    getCellsByKernel,
    addCell,
    executeCell,
    executeAll,
    cleanup,
  }
})
