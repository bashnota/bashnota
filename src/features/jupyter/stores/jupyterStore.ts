import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { JupyterServer, KernelSpec } from '@/features/jupyter/types/jupyter'
import { toast } from '@/lib/utils'
import { logger } from '@/services/logger'
import { JupyterService } from '@/features/jupyter/services/jupyterService'

export const useJupyterStore = defineStore('jupyter', () => {
  const jupyterServers = ref<JupyterServer[]>([])
  const kernels = ref<Record<string, KernelSpec[]>>({})
  const jupyterService = new JupyterService()

  // Load servers from localStorage
  const loadServers = () => {
    const savedServers = localStorage.getItem('jupyter-servers')
    if (savedServers) {
      try {
        jupyterServers.value = JSON.parse(savedServers)
      } catch (error) {
        logger.error('Failed to parse saved Jupyter servers', error)
      }
    }

    const savedKernels = localStorage.getItem('jupyter-kernels')
    if (savedKernels) {
      try {
        kernels.value = JSON.parse(savedKernels)
      } catch (error) {
        logger.error('Failed to parse saved Jupyter kernels', error)
      }
    }
  }

  // Save servers to localStorage
  const saveServers = () => {
    localStorage.setItem('jupyter-servers', JSON.stringify(jupyterServers.value))
    localStorage.setItem('jupyter-kernels', JSON.stringify(kernels.value))
  }

  // Add a new server
  const addServer = (server: JupyterServer) => {
    // Check if server with same IP and port already exists
    const serverExists = jupyterServers.value.some(
      (s) => s.ip.toLowerCase() === server.ip.toLowerCase() && s.port === server.port,
    )

    if (serverExists) {
      toast('A server with this IP and port already exists')
      return false
    }

    jupyterServers.value.push(server)
    saveServers()
    toast('Server added successfully')
    return true
  }

  // Remove a server
  const removeServer = (serverToRemove: JupyterServer) => {
    jupyterServers.value = jupyterServers.value.filter(
      (s) => !(s.ip === serverToRemove.ip && s.port === serverToRemove.port),
    )
    
    // Remove kernels for this server
    const serverKey = `${serverToRemove.ip}:${serverToRemove.port}`
    if (kernels.value[serverKey]) {
      delete kernels.value[serverKey]
    }
    
    saveServers()
    toast('Server removed successfully')
  }

  // Update kernels for a server
  const updateKernels = (server: JupyterServer, serverKernels: KernelSpec[]) => {
    const serverKey = `${server.ip}:${server.port}`
    kernels.value[serverKey] = serverKernels
    saveServers()
  }

  // Get available kernels for a server
  const getAvailableKernels = async (server: JupyterServer) => {
    try {
      const serverKey = `${server.ip}:${server.port}`
      
      // If we already have kernels cached, return them
      if (kernels.value[serverKey]) {
        logger.log(`Using cached kernels for ${serverKey}`);
        return kernels.value[serverKey];
      }
      
      logger.log(`Fetching kernels for server: ${serverKey}`);
      const availableKernels = await jupyterService.getAvailableKernels(server);
      
      if (availableKernels) {
        // Cache the kernels
        updateKernels(server, availableKernels);
        return availableKernels;
      }
      
      return [];
    } catch (error) {
      logger.error('Failed to get available kernels:', error);
      return [];
    }
  }

  // Test server connection
  const testServerConnection = async (server: JupyterServer) => {
    try {
      const result = await jupyterService.testConnection(server);
      if (result.success) {
        // If connection is successful, try to get kernels
        const kernels = await getAvailableKernels(server);
        return {
          success: true,
          hasKernels: kernels.length > 0,
          message: 'Connection successful'
        };
      }
      return {
        success: false,
        hasKernels: false,
        message: result.message || 'Connection failed'
      };
    } catch (error) {
      logger.error('Server connection test failed:', error);
      return {
        success: false,
        hasKernels: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  };

  // Get first available server with Python kernel
  const getFirstAvailableServer = async () => {
    for (const server of jupyterServers.value) {
      try {
        const testResult = await testServerConnection(server);
        if (testResult.success && testResult.hasKernels) {
          const kernels = await getAvailableKernels(server);
          const pythonKernel = kernels.find(k => 
            k.spec?.language?.toLowerCase() === 'python' || 
            k.name.toLowerCase().includes('python')
          );
          if (pythonKernel) {
            return {
              server,
              kernel: pythonKernel
            };
          }
        }
      } catch (error) {
        logger.warn(`Error testing server ${server.ip}:${server.port}:`, error);
        continue;
      }
    }
    return null;
  };

  // Refresh kernels for all servers
  const refreshAllKernels = async () => {
    const results = await Promise.allSettled(
      jupyterServers.value.map(async (server) => {
        try {
          const kernels = await jupyterService.getAvailableKernels(server);
          if (kernels) {
            updateKernels(server, kernels);
          }
        } catch (error) {
          logger.error(`Failed to refresh kernels for ${server.ip}:${server.port}:`, error);
        }
      })
    );

    // Log results
    results.forEach((result, index) => {
      const server = jupyterServers.value[index];
      if (result.status === 'fulfilled') {
        logger.log(`Successfully refreshed kernels for ${server.ip}:${server.port}`);
      } else {
        logger.error(`Failed to refresh kernels for ${server.ip}:${server.port}:`, result.reason);
      }
    });

    return results;
  };

  // Initialize store
  loadServers()

  return {
    jupyterServers,
    kernels,
    addServer,
    removeServer,
    updateKernels,
    loadServers,
    saveServers,
    getAvailableKernels,
    testServerConnection,
    getFirstAvailableServer,
    refreshAllKernels
  }
})







