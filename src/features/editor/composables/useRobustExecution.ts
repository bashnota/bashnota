import { computed } from 'vue'
import { useCodeExecutionStore } from '@/features/editor/stores/codeExecutionStore'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
import { useSharedSession } from './useSharedSession'
import { logger } from '@/services/logger'
import type { JupyterServer } from '@/features/jupyter/types/jupyter'

/**
 * Configuration interface for code execution
 */
interface ExecutionConfig {
  cellId: string
  code: string
  forceSharedSession?: boolean
}

/**
 * Result interface for execution configuration
 */
interface ConfigurationResult {
  success: boolean
  serverConfig?: JupyterServer
  kernelName?: string
  sessionId?: string
  error?: string
}

/**
 * Robust composable for code execution with shared session support
 * Handles auto-detection, configuration, and session management
 */
export function useRobustExecution() {
  const codeExecutionStore = useCodeExecutionStore()
  const jupyterStore = useJupyterStore()
  const { isSharedSessionEnabled, validateSharedSession } = useSharedSession()
  
  /**
   * Auto-detect and configure server/kernel with shared session override
   */
  const autoConfigureExecution = async (config: ExecutionConfig): Promise<ConfigurationResult> => {
    const { cellId, code, forceSharedSession = false } = config
    
    try {
      logger.log(`[RobustExecution] Auto-configuring execution for cell ${cellId}`)
      
      // Check if shared session is enabled or forced
      const useSharedSession = isSharedSessionEnabled.value || forceSharedSession
      
      // Get existing cell data
      const existingCell = codeExecutionStore.getCellById(cellId)
      
      // If shared session mode is enabled, validate and override any existing configuration
      if (useSharedSession) {
        logger.log(`[RobustExecution] Shared session mode active, overriding any existing configuration`)
        
        // Validate shared session setup
        const isValidSharedSession = await validateSharedSession()
        if (!isValidSharedSession) {
          return {
            success: false,
            error: 'Failed to validate shared session setup'
          }
        }
        
        // Get shared session ID
        const sharedSessionId = await codeExecutionStore.ensureSharedSession()
        
        // If cell exists with server/kernel config, just update session
        if (existingCell?.serverConfig && existingCell.kernelName) {
          logger.log(`[RobustExecution] Updating existing cell to use shared session: ${sharedSessionId}`)
          
          // Force update the cell to use shared session
          const updatedCell = {
            ...existingCell,
            sessionId: sharedSessionId,
            code: code // Update code as well
          }
          
          codeExecutionStore.addCell(updatedCell)
          
          return {
            success: true,
            serverConfig: existingCell.serverConfig,
            kernelName: existingCell.kernelName,
            sessionId: sharedSessionId
          }
        }
      } else if (existingCell?.serverConfig && existingCell.kernelName) {
        // Not in shared mode and cell is already configured
        logger.log(`[RobustExecution] Cell already configured, using existing configuration`)
        return {
          success: true,
          serverConfig: existingCell.serverConfig,
          kernelName: existingCell.kernelName,
          sessionId: existingCell.sessionId
        }
      }
      
      // Need to auto-detect server and kernel
      const detectionResult = await detectServerAndKernel()
      if (!detectionResult.success) {
        return detectionResult
      }
      
      // Determine session ID
      const sessionId = useSharedSession 
        ? await codeExecutionStore.ensureSharedSession()
        : 'default'
      
      // Create or update the cell
      const cellConfig = {
        id: cellId,
        code,
        serverConfig: detectionResult.serverConfig!,
        kernelName: detectionResult.kernelName!,
        sessionId,
        output: existingCell?.output || ''
      }
      
      codeExecutionStore.addCell(cellConfig)
      
      logger.log(`[RobustExecution] Cell configured successfully`, {
        server: `${detectionResult.serverConfig!.ip}:${detectionResult.serverConfig!.port}`,
        kernel: detectionResult.kernelName,
        session: sessionId,
        sharedMode: useSharedSession
      })
      
      return {
        success: true,
        serverConfig: detectionResult.serverConfig,
        kernelName: detectionResult.kernelName,
        sessionId
      }
      
    } catch (error) {
      logger.error(`[RobustExecution] Auto-configuration failed for cell ${cellId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  
  /**
   * Detect available server and kernel
   */
  const detectServerAndKernel = async (): Promise<ConfigurationResult> => {
    try {
      logger.log('[RobustExecution] Detecting available Jupyter server...')
      
      // Load servers from store
      await jupyterStore.loadServers()
      const availableServers = jupyterStore.jupyterServers
      
      if (!availableServers.length) {
        return {
          success: false,
          error: 'No Jupyter servers configured. Please add a server in settings.'
        }
      }
      
      // Use first available server
      const firstServer = availableServers[0]
      logger.log(`[RobustExecution] Using server: ${firstServer.ip}:${firstServer.port}`)
      
      // Get kernels for this server
      const serverKernels = await jupyterStore.getAvailableKernels(firstServer) || []
      if (serverKernels.length > 0) {
        jupyterStore.updateKernels(firstServer, serverKernels)
      }
      
      if (!serverKernels.length) {
        return {
          success: false,
          error: 'No kernels available on the selected server'
        }
      }
      
      // Prefer Python kernel if available, otherwise use first kernel
      const pythonKernel = serverKernels.find((k: any) => 
        k.spec?.language?.toLowerCase() === 'python' || 
        k.name.toLowerCase().includes('python')
      ) || serverKernels[0]
      
      logger.log(`[RobustExecution] Using kernel: ${pythonKernel.name}`)
      
      return {
        success: true,
        serverConfig: firstServer,
        kernelName: pythonKernel.name
      }
      
    } catch (error) {
      logger.error('[RobustExecution] Server/kernel detection failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Detection failed'
      }
    }
  }
  
  /**
   * Execute cell with robust configuration
   */
  const executeCell = async (cellId: string, code: string): Promise<boolean> => {
    try {
      logger.log(`[RobustExecution] Executing cell ${cellId}`)
      
      // Auto-configure if needed
      const configResult = await autoConfigureExecution({ cellId, code })
      if (!configResult.success) {
        logger.error(`[RobustExecution] Configuration failed: ${configResult.error}`)
        return false
      }
      
      // Execute the cell
      await codeExecutionStore.executeCell(cellId)
      
      // Get the execution result and ensure output is saved
      const executedCell = codeExecutionStore.getCellById(cellId)
      if (executedCell && executedCell.output) {
        logger.log(`[RobustExecution] Cell ${cellId} executed with output (${executedCell.output.length} chars)`)
        
        // The output will be automatically persisted by the useOutputManagement composable
        // through the watch mechanism in the OutputDisplay component
      }
      
      logger.log(`[RobustExecution] Cell ${cellId} executed successfully`)
      return true
      
    } catch (error) {
      logger.error(`[RobustExecution] Execution failed for cell ${cellId}:`, error)
      return false
    }
  }
  
  /**
   * Get execution status for a cell
   */
  const getExecutionStatus = computed(() => (cellId: string) => {
    const cell = codeExecutionStore.getCellById(cellId)
    if (!cell) {
      return {
        configured: false,
        hasServer: false,
        hasKernel: false,
        sessionId: null,
        isShared: false
      }
    }
    
    const isShared = isSharedSessionEnabled.value && 
                    cell.sessionId === codeExecutionStore.sharedSessionId
    
    return {
      configured: Boolean(cell.serverConfig && cell.kernelName),
      hasServer: Boolean(cell.serverConfig),
      hasKernel: Boolean(cell.kernelName),
      sessionId: cell.sessionId,
      isShared
    }
  })
  
  return {
    // Core functions
    autoConfigureExecution,
    detectServerAndKernel,
    executeCell,
    
    // Status functions
    getExecutionStatus,
    
    // Computed properties
    isSharedSessionEnabled
  }
}