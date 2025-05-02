import { defineStore } from 'pinia'
import { ref, computed, reactive, readonly } from 'vue'
import { CodeExecutionService } from '../services/codeExecutionService'
import { JupyterService } from '../services/jupyterService'
import type { CodeCell, KernelSession } from '@/types/codeExecution'
import type { JupyterServer } from '@/types/jupyter'
import { useNotaStore } from './nota'
import { useJupyterStore } from './jupyterStore'
import { getURLWithoutProtocol } from '@/lib/utils'
import { logger } from '@/services/logger'

export const useCodeExecutionStore = defineStore('codeExecution', () => {
  const cells = ref<Map<string, CodeCell>>(new Map())
  const kernelSessions = ref<Map<string, KernelSession>>(new Map())
  const executionService = new CodeExecutionService()
  const notaStore = useNotaStore()
  const jupyterStore = useJupyterStore()

  // Track whether we're using a shared session for all code blocks
  const sharedSessionMode = ref<boolean>(false)
  const sharedSessionId = ref<string | null>(null)
  
  // Dialog control for server selection
  const serverDialogState = reactive({
    isOpen: false,
    notaId: '',
    resolveFn: null as ((value: boolean) => void) | null
  })
  
  // For external components to access dialog state
  const serverDialogControls = readonly({
    isOpen: computed(() => serverDialogState.isOpen),
    notaId: computed(() => serverDialogState.notaId)
  })

  // Getters
  const getCellById = computed(() => (id: string) => cells.value.get(id))
  const getCellsBySession = computed(() => (sessionId: string) => {
    const session = kernelSessions.value.get(sessionId)
    return session?.cells.map((id) => cells.value.get(id)).filter(Boolean) ?? []
  })
  const getAllSessions = computed(() => Array.from(kernelSessions.value.values()))

  // Load saved sessions from nota config
  const loadSavedSessions = (notaId: string) => {
    const nota = notaStore.getCurrentNota(notaId)
    if (!nota?.config?.savedSessions) return

    // Load shared session mode preference
    if (nota.config.sharedSessionMode !== undefined) {
      sharedSessionMode.value = nota.config.sharedSessionMode
    }

    // Load shared session ID if available
    if (nota.config.sharedSessionId) {
      sharedSessionId.value = nota.config.sharedSessionId
    }

    // Clear existing sessions first
    kernelSessions.value.clear()

    // Restore saved sessions
    nota.config.savedSessions.forEach((savedSession) => {
      kernelSessions.value.set(savedSession.id, {
        id: savedSession.id,
        kernelId: '', // Will be set when actually connecting
        serverConfig: {} as JupyterServer, // Will be set when cells are registered
        kernelName: '', // Will be set when cells are registered
        cells: [],
        name: savedSession.name,
      })

      // If this is the shared session, update the sharedSessionId
      if (savedSession.isShared) {
        sharedSessionId.value = savedSession.id
      }
    })
  }

  // Save current sessions to nota config
  const saveSessions = async (notaId: string) => {
    const savedSessions = Array.from(kernelSessions.value.values()).map((session) => ({
      id: session.id,
      name: session.name,
      isShared: session.id === sharedSessionId.value,
    }))

    await notaStore.updateNotaConfig(notaId, (config) => {
      config.savedSessions = savedSessions
      config.sharedSessionMode = sharedSessionMode.value
      config.sharedSessionId = sharedSessionId.value
    })
  }

  // Session Management
  function createSession(name: string) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
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

  // Handle server selection for shared session mode
  async function handleServerSelected(server: JupyterServer) {
    try {
      logger.log(`Server selected for shared session: ${server.ip}:${server.port}`);
      
      // Create a shared session
      const sessionId = await ensureSharedSession();
      const session = kernelSessions.value.get(sessionId);
      
      if (!session) {
        throw new Error('Failed to create shared session');
      }
      
      // Test connection first
      const jupyterService = new JupyterService();
      const testResult = await jupyterService.testConnection(server);
      
      if (!testResult.success) {
        throw new Error(`Server connection failed: ${testResult.message}`);
      }
      
      // Get available kernels
      const availableKernels = await jupyterService.getAvailableKernels(server);
      
      if (!availableKernels || availableKernels.length === 0) {
        throw new Error('No kernels available on the server');
      }
      
      // Prefer Python kernel if available, otherwise use first kernel
      const pythonKernel = availableKernels.find(k => 
        k.spec?.language?.toLowerCase() === 'python' || 
        k.name.toLowerCase().includes('python')
      ) || availableKernels[0];
      
      // Update session with server config and kernel
      session.serverConfig = server;
      session.kernelName = pythonKernel.name;
      kernelSessions.value.set(sessionId, { ...session });
      
      logger.log(`Shared session initialized with server ${server.ip}:${server.port} and kernel ${pythonKernel.name}`);
      
      // Create the kernel on the server
      await createKernelSession(server, pythonKernel.name, sessionId);
      
      // Apply this shared session to all cells
      for (const cell of cells.value.values()) {
        await applySharedSessionToCell(cell.id);
      }
      
      logger.log('Shared session fully initialized and applied to all cells');
      
      // Save the session configuration
      if (serverDialogState.notaId) {
        await saveSessions(serverDialogState.notaId);
      }
      
      // Signal success
      if (serverDialogState.resolveFn) {
        serverDialogState.resolveFn(true);
        serverDialogState.resolveFn = null;
      }
      
    } catch (error) {
      logger.error('Error initializing shared session:', error);
      
      // Signal failure but keep shared mode enabled
      if (serverDialogState.resolveFn) {
        serverDialogState.resolveFn(false);
        serverDialogState.resolveFn = null;
      }
    } finally {
      // Close the dialog
      serverDialogState.isOpen = false;
    }
  }
  
  // Handle cancellation of server selection
  function handleServerSelectionCancelled() {
    logger.log('Server selection cancelled by user');
    
    // Revert shared session mode
    sharedSessionMode.value = false;
    
    // Signal cancellation
    if (serverDialogState.resolveFn) {
      serverDialogState.resolveFn(false);
      serverDialogState.resolveFn = null;
    }
    
    // Close the dialog
    serverDialogState.isOpen = false;
  }

  // Toggle shared session mode
  async function toggleSharedSessionMode(notaId: string): Promise<boolean> {
    // If turning off, just disable and return
    if (sharedSessionMode.value) {
      sharedSessionMode.value = false;
      await saveSessions(notaId);
      return false;
    }
    
    // Turn on shared mode
    sharedSessionMode.value = true;
    
    // Check if we already have a valid shared session
    const sessionId = sharedSessionId.value;
    const session = sessionId ? kernelSessions.value.get(sessionId) : undefined;
    
    if (session?.serverConfig && Object.keys(session.serverConfig).length > 0 && session.kernelName) {
      // We already have a configured shared session, just save and return
      logger.log('Using existing shared session configuration');
      await saveSessions(notaId);
      return true;
    }
    
    // We need to configure the shared session - open the server selection dialog
    return new Promise((resolve) => {
      // Store the resolution function and nota ID
      serverDialogState.resolveFn = resolve;
      serverDialogState.notaId = notaId;
      
      // Show the server selection dialog
      serverDialogState.isOpen = true;
    });
  }

  // Get or create a shared session
  async function ensureSharedSession(): Promise<string> {
    if (!sharedSessionId.value || !kernelSessions.value.has(sharedSessionId.value)) {
      // Create a new shared session
      const sessionId = createSession('Shared Session')
      sharedSessionId.value = sessionId
      
      // Look for the first available server and kernel
      const servers = jupyterStore.jupyterServers || []
      if (servers.length > 0) {
        logger.log('Attempting to create shared kernel session with available servers:', servers.length);
        
        // Try each server until we find one that works
        for (const server of servers) {
          try {
            // Test the server connection first
            const testResult = await new Promise<boolean>(async (resolve) => {
              try {
                const jupyterService = new JupyterService();
                const result = await jupyterService.testConnection(server);
                resolve(result.success);
              } catch (error) {
                logger.warn(`Server connection test failed for ${server.ip}:${server.port}:`, error);
                resolve(false);
              }
            });
            
            if (!testResult) {
              logger.warn(`Skipping server ${server.ip}:${server.port} due to connection failure`);
              continue; // Try the next server
            }
            
            // Get kernels for this server
            const kernels = await new Promise<any[]>((resolve) => {
              jupyterStore.getAvailableKernels(server).then(resolve).catch((error) => {
                logger.warn(`Failed to get kernels for ${server.ip}:${server.port}:`, error);
                resolve([]);
              });
            });
            
            if (kernels && kernels.length > 0) {
              // Prefer Python kernel if available, otherwise use first kernel
              const pythonKernel = kernels.find(k => 
                k.spec?.language?.toLowerCase() === 'python' || 
                k.name.toLowerCase().includes('python')
              ) || kernels[0];
              
              logger.log(`Creating shared kernel session with server ${server.ip}:${server.port} and kernel ${pythonKernel.name}`);
              
              try {
                // Create the kernel session
                await createKernelSession(server, pythonKernel.name, sessionId);
                logger.log('Successfully created shared kernel session');
                break; // We found a working server and created a kernel, exit the loop
              } catch (kernelError) {
                logger.error(`Failed to create kernel on server ${server.ip}:${server.port}:`, kernelError);
                // Continue to the next server
              }
            } else {
              logger.warn(`No kernels available on server ${server.ip}:${server.port}`);
            }
          } catch (serverError) {
            logger.warn(`Error when trying server ${server.ip}:${server.port}:`, serverError);
            // Continue to the next server
          }
        }
        
        // Check if we successfully created a kernel
        const session = kernelSessions.value.get(sessionId);
        if (!session?.kernelId) {
          logger.warn('Could not create shared kernel session on any available server');
        }
      } else {
        logger.warn('No Jupyter servers configured for shared session');
      }
    } else {
      logger.log(`Using existing shared session: ${sharedSessionId.value}`);
    }

    return sharedSessionId.value;
  }

  // Apply shared session settings to a cell
  async function applySharedSessionToCell(cellId: string): Promise<void> {
    if (!sharedSessionMode.value) return

    const sessionId = await ensureSharedSession()
    const cell = cells.value.get(cellId)
    const session = kernelSessions.value.get(sessionId)

    if (cell && session) {
      // Add cell to shared session
      if (!cell.sessionId || cell.sessionId !== sessionId) {
        // Remove from previous session if needed
        if (cell.sessionId && cell.sessionId !== sessionId) {
          removeCellFromSession(cellId, cell.sessionId)
        }

        // Add to shared session
        addCellToSession(cellId, sessionId)
        
        // Update cell with session's server config and kernel name if available
        if (session.serverConfig && Object.keys(session.serverConfig).length > 0) {
          cell.serverConfig = session.serverConfig
        }
        
        if (session.kernelName) {
          cell.kernelName = session.kernelName
        }
        
        // Update the cell
        cells.value.set(cellId, { ...cell })
      }
    }
  }

  // Register code cells (keep existing logic)
  const registerCodeCells = (content: any, notaId: string) => {
    const findCodeBlocks = (node: any): any[] => {
      const blocks = []
      if (node.type === 'executableCodeBlock') {
        blocks.push(node)
      }
      if (node.content) {
        node.content.forEach((child: any) => {
          blocks.push(...findCodeBlocks(child))
        })
      }
      return blocks
    }

    const codeBlocks = findCodeBlocks(content)
    const servers = jupyterStore.jupyterServers || []

    codeBlocks.forEach((block) => {
      const { attrs, content } = block
      const code = content ? content.map((c: any) => c.text).join('\n') : ''

      const serverID = attrs.serverID ? getURLWithoutProtocol(attrs.serverID).split(':') : null
      const server = serverID
        ? servers.find((s: any) => getURLWithoutProtocol(s.ip) === serverID[0] && s.port === serverID[1])
        : undefined

      // If block has a session, ensure session has server config and kernel info
      if (attrs.sessionId && kernelSessions.value.has(attrs.sessionId)) {
        const session = kernelSessions.value.get(attrs.sessionId)!
        if (server) {
          session.serverConfig = server
          session.kernelName = attrs.kernelName
          kernelSessions.value.set(attrs.sessionId, { ...session })
        }
      }

      addCell({
        id: attrs.id,
        code,
        serverConfig: server,
        kernelName: attrs.kernelName,
        output: attrs.output,
        sessionId: attrs.sessionId,
      })

      // If in shared session mode, apply shared session to this cell
      if (sharedSessionMode.value && !attrs.sessionId) {
        applySharedSessionToCell(attrs.id)
      }
    })
  }

  function deleteSession(sessionId: string) {
    const session = kernelSessions.value.get(sessionId)
    if (session) {
      // Clean up kernel if it exists
      if (session.kernelId && session.serverConfig) {
        executionService
          .deleteKernel(session.serverConfig, session.kernelId)
          .catch((error) => logger.error('Failed to delete kernel:', error))
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
      cells.value.set(cellId, { ...cell })
    }
  }

  function removeCellFromSession(cellId: string, sessionId: string) {
    const session = kernelSessions.value.get(sessionId)
    const cell = cells.value.get(cellId)
    if (session && cell) {
      session.cells = session.cells.filter((id) => id !== cellId)
      cell.sessionId = ''
      cells.value.set(cellId, { ...cell })
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

    // If in shared session mode and cell doesn't have a session, add it to the shared session
    if (sharedSessionMode.value && !cell.sessionId) {
      applySharedSessionToCell(cell.id)
    }
  }

  async function createKernelSession(
    serverConfig: JupyterServer,
    kernelName: string,
    sessionId: string,
  ) {
    try {
      // Validate kernel name before attempting to create a kernel
      if (!kernelName || kernelName === 'none') {
        logger.error(`Cannot create kernel with invalid name: "${kernelName}"`);
        
        // Try to recover by getting a valid kernel
        try {
          const jupyterService = new JupyterService();
          const availableKernels = await jupyterService.getAvailableKernels(serverConfig);
          
          if (availableKernels && availableKernels.length > 0) {
            // Prefer Python kernel if available, otherwise use first kernel
            const pythonKernel = availableKernels.find(k => 
              k.spec?.language?.toLowerCase() === 'python' || 
              k.name.toLowerCase().includes('python')
            ) || availableKernels[0];
            
            kernelName = pythonKernel.name;
            logger.log(`Recovered by selecting kernel: ${kernelName}`);
          } else {
            throw new Error('No valid kernels available on this server');
          }
        } catch (recoveryError) {
          logger.error('Failed to recover from invalid kernel name:', recoveryError);
          throw new Error(`Cannot create kernel with invalid name: "${kernelName}"`);
        }
      }
      
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
      logger.error('Failed to create kernel session:', error)
      throw error
    }
  }

  async function executeCell(cellId: string) {
    const cell = cells.value.get(cellId)
    if (!cell) {
      logger.error(`Cannot execute cell: Cell ${cellId} not found`)
      return
    }

    // Log the cell state
    logger.log(`Executing cell ${cellId}:`, {
      hasServerConfig: !!cell.serverConfig,
      hasSessionId: !!cell.sessionId,
      sessionId: cell.sessionId,
      kernelName: cell.kernelName
    })

    // Verify or set serverConfig and kernelName for cells in shared mode
    if (sharedSessionMode.value) {
      const sharedSession = kernelSessions.value.get(sharedSessionId.value || '')
      
      // Check if shared session exists but has invalid configuration
      if (sharedSession) {
        // Try to repair the session if it has missing or invalid configuration
        if (!sharedSession.kernelName || sharedSession.kernelName === 'none' || 
            !sharedSession.serverConfig || Object.keys(sharedSession.serverConfig).length === 0) {
          
          logger.warn('Shared session has invalid configuration, attempting to repair');
          
          try {
            // Get the first available server
            const servers = jupyterStore.jupyterServers || [];
            if (servers.length > 0) {
              const server = servers[0];
              logger.log(`Using server ${server.ip}:${server.port} to repair shared session`);
              
              // Test connection first
              const jupyterService = new JupyterService();
              const testResult = await jupyterService.testConnection(server);
              
              if (testResult.success) {
                // Get available kernels
                const availableKernels = await jupyterService.getAvailableKernels(server);
                
                if (availableKernels && availableKernels.length > 0) {
                  // Prefer Python kernel if available, otherwise use first kernel
                  const pythonKernel = availableKernels.find(k => 
                    k.spec?.language?.toLowerCase() === 'python' || 
                    k.name.toLowerCase().includes('python')
                  ) || availableKernels[0];
                  
                  // Update session with server config and kernel
                  sharedSession.serverConfig = server;
                  sharedSession.kernelName = pythonKernel.name;
                  kernelSessions.value.set(sharedSessionId.value!, { ...sharedSession });
                  
                  logger.log(`Repaired shared session with server ${server.ip}:${server.port} and kernel ${pythonKernel.name}`);
                  
                  // Now also create the kernel if it doesn't exist
                  if (!sharedSession.kernelId) {
                    await createKernelSession(server, pythonKernel.name, sharedSessionId.value!);
                    logger.log('Created new kernel for shared session');
                  }
                  
                  // Update the cell if it's part of the shared session
                  if (cell.sessionId === sharedSessionId.value) {
                    cell.serverConfig = server;
                    cell.kernelName = pythonKernel.name;
                    cells.value.set(cellId, { ...cell });
                    logger.log('Updated cell with repaired shared session configuration');
                  }
                } else {
                  throw new Error('No kernels available on the server');
                }
              } else {
                throw new Error(`Server connection failed: ${testResult.message}`);
              }
            } else {
              throw new Error('No servers available to repair shared session');
            }
          } catch (error) {
            logger.error('Failed to repair shared session:', error);
            cell.hasError = true;
            cell.error = error instanceof Error ? error : new Error('Failed to repair shared session');
            cell.output = 'Error: Failed to repair shared session. Try disabling and re-enabling shared mode.';
            cells.value.set(cellId, { ...cell });
            return;
          }
        }

        // Check if cell belongs to shared session and needs to be updated with the session's config
        if (cell.sessionId === sharedSessionId.value) {
          // Ensure cell has the shared session's config
          cell.serverConfig = sharedSession.serverConfig;
          cell.kernelName = sharedSession.kernelName;
          cells.value.set(cellId, { ...cell });
        }
      } else if (sharedSessionId.value) {
        // Shared session doesn't exist but we have a session ID - try to recreate it
        logger.warn('Shared session ID exists but session is missing, recreating');
        try {
          await ensureSharedSession();
          // Try again with the newly created session
          return executeCell(cellId);
        } catch (error) {
          logger.error('Failed to recreate shared session:', error);
          cell.hasError = true;
          cell.error = error instanceof Error ? error : new Error('Shared session missing');
          cell.output = 'Error: Shared session could not be recreated. Try disabling and re-enabling shared mode.';
          cells.value.set(cellId, { ...cell });
          return;
        }
      }
    }
    
    // Verify cell has required configuration
    if (!cell.serverConfig) {
      logger.error(`Cannot execute cell: No server configuration for cell ${cellId}`);
      cell.hasError = true;
      cell.error = new Error('No server configuration');
      cell.output = 'Error: No server configuration. Please select a server.';
      cells.value.set(cellId, { ...cell });
      return;
    }
    
    if (!cell.kernelName || cell.kernelName === 'none') {
      logger.error(`Cannot execute cell: Invalid kernel name "${cell.kernelName}" for cell ${cellId}`);
      cell.hasError = true;
      cell.error = new Error('Invalid kernel name');
      cell.output = 'Error: Invalid kernel name. Please select a valid kernel.';
      cells.value.set(cellId, { ...cell });
      return;
    }

    cell.isExecuting = true;
    cell.hasError = false;
    cell.error = null;
    cell.output = '';
    cells.value.set(cellId, { ...cell });

    try {
      // Get or create kernel session
      let session: KernelSession | undefined;

      if (cell.sessionId) {
        session = kernelSessions.value.get(cell.sessionId);

        if (!session?.kernelId) {
          logger.log(`Creating kernel session for existing session ${cell.sessionId}`);
          await createKernelSession(cell.serverConfig, cell.kernelName, cell.sessionId);
          session = kernelSessions.value.get(cell.sessionId);
        }
      } else {
        // Create a new session for this cell if it doesn't have one
        const sessionId = createSession(`Session ${kernelSessions.value.size + 1}`);
        logger.log(`Creating new session ${sessionId} and kernel for cell ${cellId}`);
        await createKernelSession(cell.serverConfig, cell.kernelName, sessionId);
        session = kernelSessions.value.get(sessionId);
        addCellToSession(cellId, sessionId);
      }

      if (!session) throw new Error('Failed to create or get kernel session');

      // Execute code with streaming updates
      logger.log(`Executing code for cell ${cellId} with session ${session.id}, kernel ${session.kernelId}`);
      const results = await executionService.executeNotebookBlocks(
        cell.serverConfig,
        session.kernelId,
        [{ id: cellId, notebookId: session.id, code: cell.code }],
        (blockId, output) => {
          const updatedCell = cells.value.get(blockId);
          if (updatedCell) {
            updatedCell.output += output;
            cells.value.set(blockId, { ...updatedCell });
          }
        },
      );

      // Final output update
      const result = results[0];
      if (result) {
        cell.output = result.output;
        cell.hasError = result.hasError || false;
      }
    } catch (error) {
      logger.error(`Execution error for cell ${cellId}:`, error);
      cell.hasError = true;
      cell.error = error instanceof Error ? error : new Error('Execution failed');
      cell.output = error instanceof Error ? error.message : 'Execution failed';
      cells.value.set(cellId, { ...cell });
    } finally {
      cell.isExecuting = false;
      cells.value.set(cellId, { ...cell });
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
              cells.value.set(c.id, { ...cell })
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
          logger.error('Failed to delete kernel:', error)
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
    registerCodeCells,
    loadSavedSessions,
    saveSessions,
    // New shared session methods
    sharedSessionMode,
    sharedSessionId,
    toggleSharedSessionMode,
    ensureSharedSession,
    applySharedSessionToCell,
    // Server selection dialog controls
    serverDialogControls,
    handleServerSelected,
    handleServerSelectionCancelled
  }
})
