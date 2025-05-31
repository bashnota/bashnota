// Re-export the main Jupyter service and interfaces for backward compatibility
export {
  JupyterService,
  jupyterService,
  defaultJupyterServers
} from '@/services/jupyterService'

export type {
  JupyterFile,
  JupyterDirectory,
  ManagedJupyterServer as JupyterServer
} from '@/types/jupyter' 