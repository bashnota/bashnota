import { computed, nextTick } from 'vue'
import { logger } from '@/services/logger'
import type { KernelConfig, JupyterServer, KernelSpec } from '@/features/jupyter/types/jupyter'

interface PreferencesConfig {
  blockId: string
  notaId: string
  language: string
  availableServers: JupyterServer[]
  isSharedSessionMode: boolean
  sharedSessionId: string | null
  store: any
  codeExecutionStore: any
  jupyterService: any
  handleServerSelect: (serverId: string) => void
  handleKernelSelect: (kernelName: string) => void
  showConsoleMessage: (title: string, message: string, type: 'success' | 'error' | 'warning') => void
  emit: any
}

export function usePreferencesManagement(config: PreferencesConfig) {
  const loadSavedPreferences = async (availableKernels: any) => {
    // If in shared session mode, check if we should use the shared session
    if (config.isSharedSessionMode && config.sharedSessionId) {
      const session = config.codeExecutionStore.kernelSessions.get(config.sharedSessionId)
      if (session) {
        config.emit('update:session-id', config.sharedSessionId)
        
        // Get the session's server configuration
        if (session.serverConfig) {
          const serverId = `${session.serverConfig.ip}:${session.serverConfig.port}`
          config.handleServerSelect(serverId)
        }
        
        // Get the session's kernel name
        if (session.kernelName) {
          config.handleKernelSelect(session.kernelName)
        }
        
        config.showConsoleMessage('Info', `Using shared session for code block`, 'success')
        return
      }
    }

    // Otherwise, use individual preferences
    const currentNota = config.store.getCurrentNota(config.notaId)
    const preferences = currentNota?.config?.kernelPreferences?.[config.blockId]
    
    if (preferences?.serverId) {
      config.handleServerSelect(preferences.serverId)
    } else if (config.availableServers.length > 0) {
      // Auto-select first available server if no preference exists
      const firstServer = config.availableServers[0]
      const serverId = `${firstServer.ip}:${firstServer.port}`
      config.handleServerSelect(serverId)
      
      // Get kernels for this server
      try {
        const kernels = await config.jupyterService.getAvailableKernels(firstServer)
        availableKernels.value = kernels
        
        // Auto-select a kernel that matches the code block language if available
        let matchingKernel = kernels.find((k: KernelSpec) => 
          k.spec.language?.toLowerCase() === config.language.toLowerCase()
        )
        
        // If no exact language match, try to find a kernel that includes the language name
        if (!matchingKernel) {
          matchingKernel = kernels.find((k: KernelSpec) => 
            k.name.toLowerCase().includes(config.language.toLowerCase()) ||
            (k.spec.display_name && k.spec.display_name.toLowerCase().includes(config.language.toLowerCase()))
          )
        }
        
        // If still no match, select the first Python kernel or just the first kernel
        if (!matchingKernel) {
          matchingKernel = kernels.find((k: KernelSpec) => 
            k.spec.language?.toLowerCase() === 'python'
          ) || kernels[0]
        }
        
        if (matchingKernel) {
          config.handleKernelSelect(matchingKernel.name)
        }
      } catch (error) {
        logger.error('Failed to auto-select kernel:', error)
      }
    }
  }

  const saveKernelPreference = (serverId: string, kernelName: string) => {
    if (!config.isSharedSessionMode) {
      config.store.updateNotaConfig(config.notaId, (notaConfig: any) => {
        if (!notaConfig.kernelPreferences) notaConfig.kernelPreferences = {}
        notaConfig.kernelPreferences[config.blockId] = {
          serverId,
          kernelName,
          blockId: config.blockId,
          lastUsed: new Date().toISOString()
        }
      })
    }
  }

  const handleServerChange = async (value: string, selectedKernel: any) => {
    config.handleServerSelect(value)
    
    // Only store minimal server reference in kernel preferences if not in shared mode
    if (!config.isSharedSessionMode) {
      saveKernelPreference(value, selectedKernel.value)
    }
  }

  const handleKernelChange = (value: string, selectedServer: any) => {
    config.handleKernelSelect(value)
    
    // Save kernel preference
    if (!config.isSharedSessionMode && selectedServer.value) {
      saveKernelPreference(selectedServer.value, value)
    }
  }

  const refreshJupyterServers = async () => {
    // Make sure the jupyterStore has loaded its servers from local storage
    config.store.loadServers?.()
    
    // Force reactivity update in case servers were modified externally
    await nextTick()
  }

  return {
    loadSavedPreferences,
    saveKernelPreference,
    handleServerChange,
    handleKernelChange,
    refreshJupyterServers
  }
}
