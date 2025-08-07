export interface IntegrationSettings {
  // Jupyter
  jupyterServerUrl: string
  jupyterToken: string
  autoStartKernel: boolean
  kernelTimeout: number
  
  // External Tools
  gitIntegration: boolean
  terminalIntegration: boolean
  fileWatcherEnabled: boolean
  externalEditorCommand: string
}

export const integrationSettingsDefaults: IntegrationSettings = {
  jupyterServerUrl: 'http://localhost:8888',
  jupyterToken: '',
  autoStartKernel: true,
  kernelTimeout: 30,
  gitIntegration: true,
  terminalIntegration: true,
  fileWatcherEnabled: true,
  externalEditorCommand: ''
}
