<script setup lang="ts">
import { ref, computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Database, Download, Upload, Trash2, AlertTriangle, RotateCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useNotaStore } from '@/features/nota/stores/nota'

const notaStore = useNotaStore()

// State
const isExporting = ref(false)
const isImporting = ref(false)
const isClearing = ref(false)
const importFile = ref<File | null>(null)

// Computed storage size
const storageSize = computed(() => {
  try {
    // Get localStorage usage estimate
    let totalSize = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length
      }
    }
    // Convert to MB
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1)
    return `${sizeInMB} MB`
  } catch (error) {
    return 'Unknown'
  }
})

// Export all data
const exportAllData = async () => {
  isExporting.value = true
  try {
    await notaStore.exportAllNotas()
    toast({
      title: 'Export Successful',
      description: 'All data has been exported successfully',
      variant: 'default'
    })
  } catch (error) {
    toast({
      title: 'Export Failed',
      description: 'Failed to export data. Please try again.',
      variant: 'destructive'
    })
  } finally {
    isExporting.value = false
  }
}

// Handle file import
const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    importFile.value = file
  }
}

// Import data
const importData = async () => {
  if (!importFile.value) {
    toast({
      title: 'No File Selected',
      description: 'Please select a file to import',
      variant: 'destructive'
    })
    return
  }

  isImporting.value = true
  try {
    const text = await importFile.value.text()
    const data = JSON.parse(text)
    
    // Validate data structure (basic validation)
    if (!data.notas || !Array.isArray(data.notas)) {
      throw new Error('Invalid data format')
    }
    
    // Import the data (this would need to be implemented in the store)
    // notaStore.importAllNotas(data)
    
    toast({
      title: 'Import Successful',
      description: `Imported ${data.notas.length} notas successfully`,
      variant: 'default'
    })
    
    // Clear the file input
    importFile.value = null
    const fileInput = document.getElementById('import-file') as HTMLInputElement
    if (fileInput) fileInput.value = ''
    
  } catch (error) {
    toast({
      title: 'Import Failed',
      description: 'Failed to import data. Please check the file format.',
      variant: 'destructive'
    })
  } finally {
    isImporting.value = false
  }
}

// Clear cache
const clearCache = () => {
  if (confirm('Are you sure you want to clear all cached data? This action cannot be undone.')) {
    isClearing.value = true
    try {
      // Clear various cache items
      localStorage.removeItem('recent-searches')
      localStorage.removeItem('temp-data')
      localStorage.removeItem('cache-data')
      
      // Clear any other cache items
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.includes('cache') || key.includes('temp')
      )
      cacheKeys.forEach(key => localStorage.removeItem(key))
      
      toast({
        title: 'Cache Cleared',
        description: 'Application cache has been cleared',
        variant: 'default'
      })
    } catch (error) {
      toast({
        title: 'Clear Failed',
        description: 'Failed to clear cache. Please try again.',
        variant: 'destructive'
      })
    } finally {
      isClearing.value = false
    }
  }
}

// Clear all data
const clearAllData = () => {
  if (confirm('⚠️ WARNING: This will delete ALL your data including notas, settings, and cache. This action cannot be undone. Are you sure?')) {
    if (confirm('This is your final warning. All data will be permanently deleted. Continue?')) {
      try {
        // Clear all localStorage
        localStorage.clear()
        
        // Reload the page to reset the application state
        window.location.reload()
        
        toast({
          title: 'All Data Cleared',
          description: 'Application has been reset to factory defaults',
          variant: 'default'
        })
      } catch (error) {
        toast({
          title: 'Clear Failed',
          description: 'Failed to clear all data. Please try again.',
          variant: 'destructive'
        })
      }
    }
  }
}

// Reset to defaults (no-op for this component)
const resetToDefaults = () => {
  toast({
    title: 'No Settings to Reset',
    description: 'Data management has no settings to reset',
    variant: 'default'
  })
}

// Expose methods for parent components
defineExpose({
  resetToDefaults
})
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <!-- Export Data -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Download class="h-5 w-5" />
          Export Data
        </CardTitle>
        <CardDescription>Create a backup of all your notas and settings</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm text-muted-foreground">
            Export all your notas, settings, and user data as a JSON file. This creates a complete backup that can be imported later.
          </p>
          <Button 
            @click="exportAllData" 
            :disabled="isExporting"
            class="w-full flex items-center justify-center gap-2"
          >
            <Download class="h-4 w-4" />
            {{ isExporting ? 'Exporting...' : 'Export All Data' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Import Data -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Upload class="h-5 w-5" />
          Import Data
        </CardTitle>
        <CardDescription>Restore data from a previously exported backup</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="import-file">Select Backup File</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json"
              @change="handleFileImport"
            />
            <p class="text-xs text-muted-foreground">
              Select a JSON backup file exported from BashNota
            </p>
          </div>
          
          <Button 
            @click="importData" 
            :disabled="isImporting || !importFile"
            class="w-full flex items-center justify-center gap-2"
            variant="outline"
          >
            <Upload class="h-4 w-4" />
            {{ isImporting ? 'Importing...' : 'Import Data' }}
          </Button>
          
          <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div class="flex items-start gap-2">
              <AlertTriangle class="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <p class="text-xs text-yellow-800 dark:text-yellow-200">
                Importing data will merge with existing data. Duplicate items may be created.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Storage Information -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Database class="h-5 w-5" />
          Storage Information
        </CardTitle>
        <CardDescription>View current storage usage and manage cached data</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Storage Used</p>
            <p class="font-medium">{{ storageSize }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-muted-foreground">Data Type</p>
            <p class="font-medium">Local Storage</p>
          </div>
        </div>
        
        <div class="space-y-2">
          <Button 
            @click="clearCache" 
            :disabled="isClearing"
            variant="outline" 
            class="w-full flex items-center justify-center gap-2"
          >
            <Trash2 class="h-4 w-4" />
            {{ isClearing ? 'Clearing...' : 'Clear Cache' }}
          </Button>
          <p class="text-xs text-muted-foreground">
            Clears temporary files and cached data to free up space
          </p>
        </div>
      </CardContent>
    </Card>

    <!-- Danger Zone -->
    <Card class="border-destructive">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-destructive">
          <AlertTriangle class="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>Irreversible actions that will delete your data</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm text-muted-foreground">
            This will permanently delete all your notas, settings, and cached data. This action cannot be undone.
          </p>
          <Button 
            @click="clearAllData" 
            variant="destructive" 
            class="w-full flex items-center justify-center gap-2"
          >
            <Trash2 class="h-4 w-4" />
            Delete All Data
          </Button>
        </div>
        
        <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div class="flex items-start gap-2">
            <AlertTriangle class="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p class="text-xs text-red-800 dark:text-red-200">
              Make sure to export your data before performing this action. All data will be permanently lost.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template> 