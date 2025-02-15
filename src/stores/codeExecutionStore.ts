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
  const getCellsBySession = computed(() => (sessionId: string) => {
    const session = kernelSessions.value.get(sessionId)
    return session?.cells.map((id) => cells.value.get(id)).filter(Boolean) ?? []
  })
  const getAllSessions = computed(() => Array.from(kernelSessions.value.values()))

  // Session Management
  function createSession(name: string) {
    const sessionId = name.toLowerCase().replace(/\s/g, '-')
    kernelSessions.value.set(sessionId, {
      id: sessionId,
      kernelId: '',
      serverConfig: {} as JupyterServer,
      kernelName: '',
      cells: [],
      name,
    })
    return sessionId
  }

  function deleteSession(sessionId: string) {
    const session = kernelSessions.value.get(sessionId)
    if (session) {
      // Clean up kernel if it exists
      if (session.kernelId && session.serverConfig) {
        executionService
          .deleteKernel(session.serverConfig, session.kernelId)
          .catch((error) => console.error('Failed to delete kernel:', error))
      }

      // Update cells to remove session association
      session.cells.forEach((cellId) => {
        const cell = cells.value.get(cellId)
        if (cell) {
          cell.sessionId = ''
          cells.value.set(cellId, cell)
        }
      })
      kernelSessions.value.delete(sessionId)
    }
  }

  function addCellToSession(cellId: string, sessionId: string) {
    const session = kernelSessions.value.get(sessionId)
    const cell = cells.value.get(cellId)
    if (session && cell) {
      if (!session.cells.includes(cellId)) {
        session.cells.push(cellId)
      }
      cell.sessionId = sessionId
      cells.value.set(cellId, cell)
    }
  }

  function removeCellFromSession(cellId: string, sessionId: string) {
    const session = kernelSessions.value.get(sessionId)
    const cell = cells.value.get(cellId)
    if (session && cell) {
      session.cells = session.cells.filter((id) => id !== cellId)
      cell.sessionId = ''
      cells.value.set(cellId, cell)
    }
  }

  // Cell Management
  function addCell(cell: Omit<CodeCell, 'isExecuting' | 'hasError' | 'error'>) {
    cells.value.set(cell.id, {
      ...cell,
      isExecuting: false,
      hasError: false,
      error: null,
    })
  }

  async function createKernelSession(
    serverConfig: JupyterServer,
    kernelName: string,
    sessionId: string,
  ) {
    try {
      const kernelId = await executionService.createKernel(serverConfig, kernelName)
      const session = kernelSessions.value.get(sessionId)
      if (session) {
        session.kernelId = kernelId
        session.serverConfig = serverConfig
        session.kernelName = kernelName
        kernelSessions.value.set(sessionId, { ...session })
      }
      return sessionId
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
    cells.value.set(cellId, { ...cell })

    try {
      // Get or create kernel session
      let session: KernelSession | undefined

      if (cell.sessionId) {
        session = kernelSessions.value.get(cell.sessionId)

        if (!session?.kernelId) {
          await createKernelSession(cell.serverConfig, cell.kernelName, cell.sessionId)
          session = kernelSessions.value.get(cell.sessionId)
        }
      } else {
        // Create a new session for this cell if it doesn't have one
        const sessionId = createSession(`Session ${kernelSessions.value.size + 1}`)
        await createKernelSession(cell.serverConfig, cell.kernelName, sessionId)
        session = kernelSessions.value.get(sessionId)
        addCellToSession(cellId, sessionId)
      }

      if (!session) throw new Error('Failed to create or get kernel session')

      // Execute code with streaming updates
      const results = await executionService.executeNotebookBlocks(
        cell.serverConfig,
        session.kernelId,
        [{ id: cellId, notebookId: session.id, code: cell.code }],
        (blockId, output) => {
          const updatedCell = cells.value.get(blockId)
          if (updatedCell) {
            updatedCell.output += output
            cells.value.set(blockId, { ...updatedCell })
          }
        },
      )

      // Final output update
      const result = results[0]
      if (result) {
        cell.output = result.output
        cell.hasError = result.hasError || false
      }
    } catch (error) {
      cell.hasError = true
      cell.error = error instanceof Error ? error : new Error('Execution failed')
      cell.output = cell.error.message
    } finally {
      cell.isExecuting = false
      cells.value.set(cellId, { ...cell })
    }
  }

  async function executeAll() {
    // Group cells by session
    const sessionCells = new Map<string, CodeCell[]>()

    for (const cell of cells.value.values()) {
      if (!cell.serverConfig || !cell.sessionId) continue

      if (!sessionCells.has(cell.sessionId)) {
        sessionCells.set(cell.sessionId, [])
      }
      sessionCells.get(cell.sessionId)?.push(cell)
    }

    // Execute cells for each session in parallel
    const executionPromises = Array.from(sessionCells.entries()).map(
      async ([sessionId, sessionCells]) => {
        const session = kernelSessions.value.get(sessionId)
        if (!session) return

        // Ensure session has a kernel
        if (!session.kernelId) {
          const firstCell = sessionCells[0]
          await createKernelSession(firstCell.serverConfig!, firstCell.kernelName, sessionId)
        }

        const updatedSession = kernelSessions.value.get(sessionId)
        if (!updatedSession?.kernelId) throw new Error('Failed to create or get kernel session')

        // Prepare cells for execution
        const codeBlocks = sessionCells.map((cell) => ({
          id: cell.id,
          notebookId: sessionId,
          code: cell.code,
        }))

        // Mark cells as executing
        sessionCells.forEach((cell) => {
          cell.isExecuting = true
          cell.hasError = false
          cell.error = null
          cell.output = ''
          cells.value.set(cell.id, { ...cell })
        })

        try {
          const results = await executionService.executeNotebookBlocks(
            updatedSession.serverConfig,
            updatedSession.kernelId,
            codeBlocks,
            (blockId, output) => {
              const cell = cells.value.get(blockId)
              if (cell) {
                cell.output += output
                cells.value.set(blockId, { ...cell })
              }
            },
          )

          // Final output update
          results.forEach((result) => {
            const cell = cells.value.get(result.id)
            if (cell) {
              cell.output = result.output
              cell.hasError = result.hasError || false
              cells.value.set(cell.id, { ...cell })
            }
          })
        } catch (error) {
          sessionCells.forEach((cell) => {
            cell.hasError = true
            cell.error = error instanceof Error ? error : new Error('Execution failed')
            cell.output = cell.error.message
            cells.value.set(cell.id, { ...cell })
          })
        } finally {
          sessionCells.forEach((c) => {
            const cell = cells.value.get(c.id)
            if (cell) {
              cell.isExecuting = false
              cells.value.set(cell.id, { ...cell })
            }
          })
        }
      },
    )

    await Promise.all(executionPromises)
  }

  async function cleanup() {
    // Clean up all kernel sessions
    for (const session of kernelSessions.value.values()) {
      if (session.kernelId && session.serverConfig) {
        try {
          await executionService.deleteKernel(session.serverConfig, session.kernelId)
        } catch (error) {
          console.error('Failed to delete kernel:', error)
        }
      }
    }
    kernelSessions.value.clear()
    cells.value.clear()
  }

  return {
    cells,
    kernelSessions,
    getCellById,
    getCellsBySession,
    getAllSessions,
    addCell,
    executeCell,
    executeAll,
    cleanup,
    createSession,
    deleteSession,
    addCellToSession,
    removeCellFromSession,
  }
})
