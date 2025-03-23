// Jupyter integration composable
import { ref, onMounted } from 'vue'
import { useJupyterStore } from '@/stores/jupyterStore'
import { logger } from '@/services/logger'

interface JupyterServer {
  ip: string
  port: string
  token: string
  [key: string]: any
}

interface KernelSpec {
  name: string
  spec: {
    display_name: string
    [key: string]: any
  }
  [key: string]: any
}

interface JupyterConfig {
  server: JupyterServer | null
  kernel: KernelSpec | null
}

/**
 * Composable for managing Jupyter integration in the Vibe block
 */
export function useJupyter() {
  const jupyterStore = useJupyterStore()
  const showJupyterConfig = ref(false)
  const jupyterConfig = ref<JupyterConfig>({
    server: null,
    kernel: null
  })

  /**
   * Toggle Jupyter configuration panel
   */
  function toggleJupyterConfig() {
    showJupyterConfig.value = !showJupyterConfig.value
  }

  /**
   * Update Jupyter configuration
   */
  function updateJupyterConfig(config: any) {
    logger.log('Updating Jupyter config:', config)
    jupyterConfig.value = config
    
    // Save configuration to localStorage for persistence
    try {
      localStorage.setItem('vibe-jupyter-config', JSON.stringify({
        server: {
          ip: config.server.ip,
          port: config.server.port,
          token: config.server.token
        },
        kernel: {
          name: config.kernel.name,
          displayName: config.kernel.spec.display_name
        }
      }))
    } catch (error) {
      logger.error('Failed to save Jupyter config to localStorage:', error)
    }
    
    // Hide the config panel after update
    showJupyterConfig.value = false
  }

  /**
   * Load saved Jupyter configuration from localStorage
   */
  function loadSavedJupyterConfig() {
    try {
      const savedConfig = localStorage.getItem('vibe-jupyter-config')
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig)
        // Try to find matching server and kernel
        if (parsedConfig.server && parsedConfig.kernel) {
          // Find server
          const server = jupyterStore.jupyterServers.find(
            s => s.ip === parsedConfig.server.ip && s.port === parsedConfig.server.port
          )
          
          if (server) {
            jupyterConfig.value.server = server
            
            // Load kernels for this server if needed
            const serverKey = `${server.ip}:${server.port}`
            if (!jupyterStore.kernels[serverKey] || jupyterStore.kernels[serverKey].length === 0) {
              // We need to refresh kernels before we can select one
              // This will happen asynchronously
              logger.log('Loading kernels for saved server config')
            } else {
              // Find kernel by name
              const kernel = jupyterStore.kernels[serverKey].find(
                k => k.name === parsedConfig.kernel.name
              )
              
              if (kernel) {
                jupyterConfig.value.kernel = kernel
                logger.log('Restored Jupyter config from localStorage')
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load saved Jupyter config:', error)
    }
  }

  /**
   * Get Jupyter config formatted for API
   */
  function getJupyterInfoForAPI() {
    return jupyterConfig.value.server && jupyterConfig.value.kernel 
      ? {
          server: {
            ip: jupyterConfig.value.server.ip,
            port: jupyterConfig.value.server.port,
            token: jupyterConfig.value.server.token
          },
          kernel: {
            name: jupyterConfig.value.kernel.name,
            displayName: jupyterConfig.value.kernel.spec.display_name
          }
        }
      : null
  }

  // Load saved config on component mount
  onMounted(() => {
    loadSavedJupyterConfig()
  })

  return {
    jupyterStore,
    showJupyterConfig,
    jupyterConfig,
    toggleJupyterConfig,
    updateJupyterConfig,
    loadSavedJupyterConfig,
    getJupyterInfoForAPI
  }
} 