export interface AdvancedSettings {
  // Performance
  enableDebugMode: boolean
  maxMemoryUsage: number[]
  enableLogging: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  
  // Data Management
  autoBackup: boolean
  backupInterval: number[]
  maxBackups: number[]
  clearCacheOnStartup: boolean
  
  // Storage Mode
  storageMode: 'indexeddb' | 'filesystem'
  filesystemAutoWatch: boolean
  
  // System Info (read-only)
  systemInfo?: {
    platform: string
    version: string
    memory: string
    storage: string
  }
}

export const advancedSettingsDefaults: AdvancedSettings = {
  enableDebugMode: false,
  maxMemoryUsage: [512],
  enableLogging: true,
  logLevel: 'info',
  autoBackup: true,
  backupInterval: [30],
  maxBackups: [10],
  clearCacheOnStartup: false,
  storageMode: 'indexeddb',
  filesystemAutoWatch: true
}
