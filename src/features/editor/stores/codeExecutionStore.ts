import { defineStore } from 'pinia'
import { ref, computed, reactive, readonly } from 'vue'
import { CodeExecutionService } from '@/services/codeExecutionService'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import type { CodeCell, KernelSession } from '@/features/editor/types/codeExecution'
import type { JupyterServer, NotaConfig, SavedSession } from '@/features/jupyter/types/jupyter'
import { useNotaStore } from '@/features/nota/stores/nota'
import { useJupyterStore } from '@/features/jupyter/stores/jupyterStore'
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
    nota.config.savedSessions.forEach((savedSession: SavedSession) => {
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

    await notaStore.updateNotaConfig(notaId, (config: NotaConfig) => {
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
      const pythonKernel = availableKernels.find((k: any) => 
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
      sharedSessionId.value = null;
      await saveSessions(notaId);
      return false;
    }
    
    // Turn on shared mode
    sharedSessionMode.value = true;
    
    // Save the mode change
    await saveSessions(notaId);
    return true;
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
              jupyterStore.getAvailableKernels(server).then(resolve).catch((error: any) => {
                logger.warn(`Failed to get kernels for ${server.ip}:${server.port}:`, error);
                resolve([]);
              });
            });
            
            if (kernels && kernels.length > 0) {
              // Prefer Python kernel if available, otherwise use first kernel
              const pythonKernel = kernels.find((k: any) => 
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

  // Apply shared session to a cell
  const applySharedSessionToCell = (cellId: string) => {
    logger.log(`[CodeExecStore] Applying shared session to cell ${cellId}`);
    
    // Get the cell
    const cell = cells.value.get(cellId)
    if (!cell) {
      logger.warn(`[CodeExecStore] Cell ${cellId} not found when applying shared session`);
      return
    }

    // If cell already has the shared session, skip
    if (cell.sessionId === sharedSessionId.value) {
      logger.log(`[CodeExecStore] Cell ${cellId} already has shared session ${sharedSessionId.value}`);
      return;
    }

    // If cell has a different session, don't change it
    if (cell.sessionId && cell.sessionId !== sharedSessionId.value) {
      logger.log(`[CodeExecStore] Cell ${cellId} has different session ${cell.sessionId}, not changing`);
      return;
    }

    // If no shared session exists, create one
    if (!sharedSessionId.value) {
      logger.log(`[CodeExecStore] Creating new shared session for cell ${cellId}`);
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
      sharedSessionId.value = sessionId
      
      // Ensure we have a valid server config
      const serverConfig = cell.serverConfig || {
        ip: 'localhost',
        port: '8888',
        token: ''
      }
      
      kernelSessions.value.set(sessionId, {
        id: sessionId,
        serverConfig,
        kernelName: cell.kernelName,
        kernelId: '',  // Will be set when kernel is created
        cells: [],
        name: `Shared Session ${sessionId}`
      })
    }

    // Update cell with shared session
    logger.log(`[CodeExecStore] Updating cell ${cellId} with shared session ${sharedSessionId.value}`);
    cells.value.set(cellId, {
      ...cell,
      sessionId: sharedSessionId.value
    })
  }

  // Register code cells (keep existing logic)
  const registerCodeCells = (content: any, notaId: string, isPublished = false) => {
    // Add direct console logging for debugging
    logger.log(`[CodeExecStore] Registering code cells for nota ${notaId}, isPublished=${isPublished}`);
    
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
    
    logger.log(`[CodeExecStore] Found ${codeBlocks.length} code blocks in nota ${notaId}`)

    // Track which cells we've processed to avoid duplicates
    const processedCells = new Set<string>();
    // Track which sessions we've created to avoid duplicates
    const createdSessions = new Map<string, string>();

    codeBlocks.forEach((block) => {
      const { attrs, content } = block
      const code = content ? content.map((c: any) => c.text).join('\n') : ''

      // Skip if we've already processed this cell
      if (processedCells.has(attrs.id)) {
        return;
      }
      processedCells.add(attrs.id);

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

      logger.log(`[CodeExecStore] Registering code block ${attrs.id}, isPublished=${isPublished}`);
      
      // Only update cell if it doesn't exist or has changed
      const existingCell = cells.value.get(attrs.id);
      const newCell = {
        id: attrs.id,
        code,
        serverConfig: server,
        kernelName: attrs.kernelName,
        output: attrs.output,
        sessionId: attrs.sessionId,
        isPublished: isPublished
      };

      if (!existingCell || JSON.stringify(existingCell) !== JSON.stringify(newCell)) {
        addCell(newCell);

        // If in shared session mode, apply shared session to this cell
        // but ONLY if not published and not already in a session
        if (sharedSessionMode.value && !attrs.sessionId && !isPublished) {
          logger.log(`[CodeExecStore] Applying shared session to block ${attrs.id}`);
          applySharedSessionToCell(attrs.id);
        }
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
          .catch((error: any) => logger.error('Failed to delete kernel:', error))
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
  function addCell(cell: Omit<CodeCell, 'isExecuting' | 'hasError' | 'error'> & { isPublished?: boolean }) {
    cells.value.set(cell.id, {
      ...cell,
      isExecuting: false,
      hasError: false,
      error: null,
      // Save isPublished flag in the cell data so components can use it to handle display differently
      isPublished: cell.isPublished || false
    })

    // If in shared session mode and cell doesn't have a session, add it to the shared session
    // Don't add published cells to the shared session as they're only for display
    if (sharedSessionMode.value && !cell.sessionId && !cell.isPublished) {
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
            const pythonKernel = availableKernels.find((k: any) => 
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

    // Handle shared session mode at execution time
    if (sharedSessionMode.value) {
      // If no shared session exists yet, create one
      if (!sharedSessionId.value) {
        logger.log(`Creating new shared session for execution`);
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
        sharedSessionId.value = sessionId
        
        // Get available servers
        const servers = jupyterStore.jupyterServers || [];
        if (servers.length === 0) {
          logger.error('No Jupyter servers available for shared session');
          cell.hasError = true;
          cell.error = new Error('No Jupyter servers available');
          cell.output = 'Error: No Jupyter servers available. Please add a server first.';
          cells.value.set(cellId, { ...cell });
          return;
        }

        // Try each server until we find one that works
        let selectedServer = null;
        let selectedKernel = null;

        for (const server of servers) {
          try {
            // Test connection
            const jupyterService = new JupyterService();
            const testResult = await jupyterService.testConnection(server);
            
            if (!testResult.success) {
              logger.warn(`Server ${server.ip}:${server.port} connection test failed`);
              continue;
            }

            // Get available kernels
            const availableKernels = await jupyterStore.getAvailableKernels(server);
            if (availableKernels && availableKernels.length > 0) {
              // Prefer Python kernel if available
              selectedKernel = availableKernels.find((k: any) => 
                k.spec?.language?.toLowerCase() === 'python' || 
                k.name.toLowerCase().includes('python')
              ) || availableKernels[0];
              
              selectedServer = server;
              break;
            }
          } catch (error) {
            logger.warn(`Error testing server ${server.ip}:${server.port}:`, error);
            continue;
          }
        }

        if (!selectedServer || !selectedKernel) {
          logger.error('Could not find a working server with available kernels');
          cell.hasError = true;
          cell.error = new Error('No working servers with kernels available');
          cell.output = 'Error: Could not find a working server with available kernels.';
          cells.value.set(cellId, { ...cell });
          return;
        }

        // Create the shared session
        kernelSessions.value.set(sessionId, {
          id: sessionId,
          serverConfig: selectedServer,
          kernelName: selectedKernel.name,
          kernelId: '',  // Will be set when kernel is created
          cells: [],
          name: `Shared Session ${sessionId}`
        });

        logger.log(`Created shared session with server ${selectedServer.ip}:${selectedServer.port} and kernel ${selectedKernel.name}`);
      }

      // Get the shared session
      const session = kernelSessions.value.get(sharedSessionId.value);
      if (!session) {
        logger.error('Shared session not found after creation');
        return;
      }

      // Update cell with shared session info
      cell.sessionId = sharedSessionId.value;
      cell.serverConfig = session.serverConfig;
      cell.kernelName = session.kernelName;
      cells.value.set(cellId, { ...cell });
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
        (blockId: string, output: string) => {
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
    } catch (error: any) {
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
            (blockId: string, output: string) => {
              const cell = cells.value.get(blockId)
              if (cell) {
                cell.output += output
                cells.value.set(blockId, { ...cell })
              }
            },
          )

          // Final output update
          results.forEach((result: { id: string; output: string; hasError?: boolean }) => {
            const cell = cells.value.get(result.id)
            if (cell) {
              cell.output = result.output
              cell.hasError = result.hasError || false
              cells.value.set(cell.id, { ...cell })
            }
          })
        } catch (error: any) {
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








