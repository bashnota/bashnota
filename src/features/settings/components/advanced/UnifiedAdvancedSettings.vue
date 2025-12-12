<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { 
  AlertCircle, 
  Database, 
  FolderOpen, 
  HardDrive, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Zap,
  Bug,
  FileText,
  Settings as SettingsIcon
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useStorageMode } from '@/composables/useStorageMode'
import { useSettingsStore } from '@/stores/settingsStore'
import { logger } from '@/services/logger'

const settingsStore = useSettingsStore()
const {
  storageMode,
  autoWatch,
  isFilesystemSupported,
  isFilesystemMode,
  isIndexedDBMode,
  isWatchingFiles,
  getModeDescription,
  switchToFilesystem,
  switchToIndexedDB
} = useStorageMode()

// Type aliases for better type safety
type StorageMode = 'indexeddb' | 'filesystem'
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Local state for UI
const isChanging = ref(false)
const showReloadPrompt = ref(false)

// Sync with settings store
watch(
  () => settingsStore.advancedSettings.storageMode,
  (newMode) => {
    if (newMode !== storageMode.value) {
      storageMode.value = newMode
    }
  },
  { immediate: true }
)

watch(
  () => settingsStore.advancedSettings.filesystemAutoWatch,
  (newValue) => {
    if (newValue !== autoWatch.value) {
      autoWatch.value = newValue
    }
  },
  { immediate: true }
)

// Local state for performance settings
const enableDebugMode = ref(settingsStore.advancedSettings.enableDebugMode)
const enableLogging = ref(settingsStore.advancedSettings.enableLogging)
const logLevel = ref(settingsStore.advancedSettings.logLevel)
const clearCacheOnStartup = ref(settingsStore.advancedSettings.clearCacheOnStartup)

// Watch and sync performance settings
watch(enableDebugMode, (value) => {
  settingsStore.updateCategory('advanced', { enableDebugMode: value })
})

watch(enableLogging, (value) => {
  settingsStore.updateCategory('advanced', { enableLogging: value })
})

watch(logLevel, (value) => {
  settingsStore.updateCategory('advanced', { logLevel: value })
})

watch(clearCacheOnStartup, (value) => {
  settingsStore.updateCategory('advanced', { clearCacheOnStartup: value })
})

// Handle storage mode change
const handleStorageModeChange = async (newMode: StorageMode) => {
  if (newMode === storageMode.value) return

  isChanging.value = true
  try {
    if (newMode === 'filesystem') {
      if (!isFilesystemSupported.value) {
        toast.error('File System Access API Not Supported', {
          description: 'Your browser does not support the File System Access API. Please use a modern browser like Chrome, Edge, or Opera.'
        })
        return
      }

      // Request directory access immediately
      try {
        // Prompt user to select a directory
        const directoryHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'documents'
        })
        
        logger.info('[StorageMode] Directory selected:', directoryHandle.name)
        
        await switchToFilesystem()
        
        // Update settings store
        settingsStore.updateCategory('advanced', {
          storageMode: 'filesystem'
        })

        toast.success('Filesystem Mode Enabled', {
          description: `Directory "${directoryHandle.name}" selected. Please reload the page to complete the switch.`
        })
        showReloadPrompt.value = true
      } catch (error: any) {
        logger.error('Failed to enable filesystem mode:', error)
        
        // Handle user cancellation gracefully
        if (error.name === 'AbortError') {
          toast.info('Directory Selection Cancelled', {
            description: 'You need to select a directory to use File System mode.'
          })
        } else {
          toast.error('Failed to Enable Filesystem Mode', {
            description: 'Could not access the file system. Please check your browser permissions.'
          })
        }
      }
    } else {
      switchToIndexedDB()
      
      // Update settings store
      settingsStore.updateCategory('advanced', {
        storageMode: 'indexeddb'
      })

      toast.success('IndexedDB Mode Enabled', {
        description: 'Please reload the page to apply changes.'
      })
      showReloadPrompt.value = true
    }
  } catch (error) {
    logger.error('Failed to change storage mode:', error)
    toast.error('Failed to Change Storage Mode', {
      description: 'An error occurred while changing the storage mode.'
    })
  } finally {
    isChanging.value = false
  }
}

// Handle auto-watch toggle
const handleAutoWatchChange = (value: boolean) => {
  autoWatch.value = value
  settingsStore.updateCategory('advanced', {
    filesystemAutoWatch: value
  })
  
  toast.success(value ? 'Auto-Watch Enabled' : 'Auto-Watch Disabled', {
    description: value 
      ? 'Changes to .nota files will be detected automatically.'
      : 'You will need to manually reload to see file changes.'
  })
}

// Reload page
const handleReload = () => {
  window.location.reload()
}

// Get storage mode icon
const getStorageModeIcon = computed(() => {
  return isFilesystemMode.value ? FolderOpen : Database
})

// Get storage mode display name
const getStorageModeDisplayName = computed(() => {
  return isFilesystemMode.value ? 'File System' : 'IndexedDB'
})

// Reset to defaults
const resetToDefaults = () => {
  if (confirm('Reset all advanced settings to their default values?')) {
    enableDebugMode.value = false
    enableLogging.value = true
    logLevel.value = 'info'
    clearCacheOnStartup.value = false
    
    toast.success('Advanced Settings Reset', {
      description: 'All advanced settings have been reset to defaults'
    })
  }
}

defineExpose({ resetToDefaults })
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <!-- Storage Mode Settings -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <HardDrive class="w-5 h-5" />
          Storage Mode
        </CardTitle>
        <CardDescription>
          Choose how BashNota stores your notes
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- Storage Mode Selection -->
        <div class="space-y-3">
          <Label>Storage Backend</Label>
          <Select 
            :model-value="storageMode" 
            @update:model-value="(value: StorageMode) => handleStorageModeChange(value)"
            :disabled="isChanging"
          >
            <SelectTrigger class="w-full">
              <SelectValue>
                <div class="flex items-center gap-2">
                  <component :is="getStorageModeIcon" class="w-4 h-4" />
                  {{ getStorageModeDisplayName }}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="indexeddb">
                <div class="flex items-center gap-2">
                  <Database class="w-4 h-4" />
                  IndexedDB (Browser Storage)
                </div>
              </SelectItem>
              <SelectItem 
                value="filesystem" 
                :disabled="!isFilesystemSupported"
              >
                <div class="flex items-center gap-2">
                  <FolderOpen class="w-4 h-4" />
                  File System (.nota files)
                  <span v-if="!isFilesystemSupported" class="text-xs text-muted-foreground">
                    (Not Supported)
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-sm text-muted-foreground">
            {{ getModeDescription }}
          </p>
        </div>

        <!-- Filesystem Mode Options -->
        <div v-if="isFilesystemMode" class="space-y-3 pt-2 border-t">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Auto-Watch Files</Label>
              <p class="text-sm text-muted-foreground">
                Automatically detect changes to .nota files in the selected directory
              </p>
            </div>
            <Switch 
              :checked="autoWatch" 
              @update:checked="handleAutoWatchChange"
            />
          </div>

          <!-- File Watcher Status -->
          <div v-if="autoWatch" class="flex items-center gap-2 p-2 bg-muted rounded-md">
            <component :is="isWatchingFiles ? Eye : EyeOff" class="w-4 h-4" :class="isWatchingFiles ? 'text-green-600 dark:text-green-400' : 'text-gray-400'" />
            <span class="text-sm" :class="isWatchingFiles ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground'">
              File watcher is {{ isWatchingFiles ? 'active' : 'inactive' }}
            </span>
          </div>

          <div class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <AlertCircle class="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div class="text-sm text-blue-700 dark:text-blue-300">
              <p class="font-medium mb-1">File System Mode Benefits:</p>
              <ul class="list-disc list-inside space-y-1 text-xs">
                <li>Edit .nota files directly with any text editor</li>
                <li>Real-time synchronization with file system</li>
                <li>Easy backup and version control with git</li>
                <li>Works across multiple instances of BashNota</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Browser Compatibility Warning -->
        <div v-if="!isFilesystemSupported" class="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
          <AlertCircle class="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div class="text-sm text-amber-700 dark:text-amber-300">
            <p class="font-medium mb-1">File System Mode Not Available</p>
            <p class="text-xs">
              Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera to enable this feature.
            </p>
          </div>
        </div>

        <!-- Reload Prompt -->
        <div v-if="showReloadPrompt" class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <div class="flex items-start gap-2">
            <RefreshCw class="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
            <div class="text-sm text-green-700 dark:text-green-300">
              <p class="font-medium">Reload Required</p>
              <p class="text-xs">Please reload the page to apply storage mode changes</p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="default"
            @click="handleReload"
          >
            Reload Now
          </Button>
        </div>
      </CardContent>
    </Card>

    <Separator />

    <!-- Performance & Debug Settings -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Zap class="w-5 h-5" />
          Performance & Debugging
        </CardTitle>
        <CardDescription>
          Configure performance options and debugging tools
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Debug Mode -->
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>Debug Mode</Label>
            <p class="text-sm text-muted-foreground">
              Enable detailed debugging information and console logs
            </p>
          </div>
          <Switch 
            :checked="enableDebugMode" 
            @update:checked="(value: boolean) => enableDebugMode = value"
          />
        </div>

        <Separator />

        <!-- Logging -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Enable Logging</Label>
              <p class="text-sm text-muted-foreground">
                Record application events and errors
              </p>
            </div>
            <Switch 
              :checked="enableLogging" 
              @update:checked="(value: boolean) => enableLogging = value"
            />
          </div>

          <!-- Log Level -->
          <div v-if="enableLogging" class="space-y-2 pl-4 border-l-2">
            <Label>Log Level</Label>
            <Select 
              :model-value="logLevel" 
              @update:model-value="(value: LogLevel) => logLevel = value"
            >
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debug">Debug (Most Verbose)</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error Only</SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Higher levels log more detailed information
            </p>
          </div>
        </div>

        <Separator />

        <!-- Cache Management -->
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <Label>Clear Cache on Startup</Label>
            <p class="text-sm text-muted-foreground">
              Automatically clear cached data when the application starts
            </p>
          </div>
          <Switch 
            :checked="clearCacheOnStartup" 
            @update:checked="(value: boolean) => clearCacheOnStartup = value"
          />
        </div>
      </CardContent>
    </Card>

    <!-- Info Box -->
    <Card class="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardContent class="pt-6">
        <div class="flex items-start gap-3">
          <AlertCircle class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div class="space-y-2 text-sm text-blue-900 dark:text-blue-100">
            <p class="font-medium">About Advanced Settings</p>
            <p class="text-blue-700 dark:text-blue-300">
              These settings control core application behavior including storage, performance, and debugging. 
              Changes to storage mode require a page reload. For data management and system information, 
              see the respective sections in the Advanced settings menu.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Reset Button -->
    <Card>
      <CardHeader>
        <CardTitle>Reset Settings</CardTitle>
        <CardDescription>Restore default advanced settings</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" @click="resetToDefaults" class="flex items-center gap-2">
          <RefreshCw class="h-4 w-4" />
          Reset to Defaults
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
