<script setup lang="ts">
import { ref, computed } from 'vue'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Database, Download, Upload, Trash2, AlertTriangle } from 'lucide-vue-next';
import { toast } from '@/services/toast'
import { useNotaStore } from '@/features/nota/stores/nota'
import {
  deleteAllData,
  prepareDataDeletion,
  type DataDeletionPlan,
  type DataDeletionReport,
} from '@/services/dataDeletionService'

const notaStore = useNotaStore()

// State
const isExporting = ref(false)
const isImporting = ref(false)
const isClearing = ref(false)
const importFile = ref<File | null>(null)
const isPreparingDeletion = ref(false)
const isDeleting = ref(false)
const deleteDialogOpen = ref(false)
const deletionPlan = ref<DataDeletionPlan | null>(null)
const deletionReport = ref<DataDeletionReport | null>(null)
const confirmationText = ref('')
const filesystemAuthorized = ref(false)
const DELETE_CONFIRMATION = 'DELETE ALL DATA'

const deletionConfirmed = computed(() => confirmationText.value === DELETE_CONFIRMATION
  && (!deletionPlan.value?.filesystem || filesystemAuthorized.value))

// Computed storage size
const storageSize = computed(() => {
  try {
    // Get localStorage usage estimate
    let totalSize = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length
      }
    }
    // Convert to MB
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1)
    return `${sizeInMB} MB`
  } catch {
    return 'Unknown'
  }
})

// Export all data
const exportAllData = async () => {
  isExporting.value = true
  try {
    const archive = await notaStore.exportAllNotas()
    toast.success('Export successful', {
      description: `Backed up ${archive.notas.length} notas and their canonical blocks.`,
    })
  } catch (error) {
    toast.error('Export failed', {
      description: error instanceof Error ? error.message : 'The backup could not be created.',
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
    toast.error('No file selected', {
      description: 'Select a BashNota JSON backup to restore.',
    })
    return
  }

  isImporting.value = true
  try {
    const text = await importFile.value.text()
    const data = JSON.parse(text)
    const result = await notaStore.importAllNotas(data)

    toast.success('Import successful', {
      description: `Restored ${result.notaCount} notas and their canonical blocks.`,
    })
    
    // Clear the file input
    importFile.value = null
    const fileInput = document.getElementById('import-file') as HTMLInputElement
    if (fileInput) fileInput.value = ''
    
  } catch (error) {
    toast.error('Import failed', {
      description: error instanceof Error
        ? error.message
        : 'The selected file could not be restored. No data was imported.',
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
    } catch {
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

const openDeleteDialog = async () => {
  isPreparingDeletion.value = true
  try {
    deletionPlan.value = await prepareDataDeletion()
    deletionReport.value = null
    confirmationText.value = ''
    filesystemAuthorized.value = false
    deleteDialogOpen.value = true
  } catch (error) {
    toast.error('Could not inspect all storage', {
      description: error instanceof Error ? error.message : 'Review storage permissions and try again.',
    })
  } finally {
    isPreparingDeletion.value = false
  }
}

const clearAllData = async () => {
  if (!deletionPlan.value || !deletionConfirmed.value || isDeleting.value) return
  isDeleting.value = true
  try {
    deletionReport.value = await deleteAllData(deletionPlan.value)
    if (deletionReport.value.complete) {
      notaStore.$reset()
      toast.success('All configured data cleared', {
        description: 'Every storage authority was cleared and verified. Reload BashNota to start fresh.',
      })
    } else {
      const failures = deletionReport.value.results.filter((result) => result.status === 'failed')
      toast.error('Some data could not be cleared', {
        description: failures.map((result) => `${result.label}: ${result.detail}`).join(' '),
      })
    }
  } finally {
    isDeleting.value = false
  }
}

const retryFailedDeletion = async () => {
  if (isDeleting.value) return
  isDeleting.value = true
  try {
    const refreshedPlan = await prepareDataDeletion()
    deletionPlan.value = refreshedPlan
    deletionReport.value = await deleteAllData(refreshedPlan)
    if (deletionReport.value.complete) {
      notaStore.$reset()
      toast.success('All configured data cleared', {
        description: 'Every storage authority was cleared and verified. Reload BashNota to start fresh.',
      })
    } else {
      toast.error('Some data still could not be cleared', {
        description: deletionReport.value.results
          .filter((result) => result.status === 'failed')
          .map((result) => `${result.label}: ${result.detail}`)
          .join(' '),
      })
    }
  } catch (error) {
    toast.error('Retry failed', {
      description: error instanceof Error ? error.message : 'Storage could not be inspected again.',
    })
  } finally {
    isDeleting.value = false
  }
}

const reloadApplication = () => window.location.reload()

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
        <CardDescription>Create a complete backup of your notas</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm text-muted-foreground">
            Export nota metadata, hierarchy, version history, canonical block order, and every typed block payload as one JSON file.
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
                The complete file is validated before anything changes. If restore fails, existing nota metadata and canonical blocks are recovered.
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
            @click="openDeleteDialog"
            :disabled="isPreparingDeletion"
            variant="destructive" 
            class="w-full flex items-center justify-center gap-2"
          >
            <Trash2 class="h-4 w-4" />
            {{ isPreparingDeletion ? 'Inspecting Storage...' : 'Delete All Data' }}
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

    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent class="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto p-4 sm:p-6">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete all configured BashNota data?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently clears every storage authority listed below. Export a nota backup first if you may need to recover notas; settings and caches are not included in that backup.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div v-if="deletionPlan" class="min-w-0 space-y-4">
          <ul class="space-y-2" aria-label="Storage authorities affected">
            <li
              v-for="authority in deletionPlan.authorities"
              :key="authority.id"
              class="rounded-md border bg-muted/30 p-3 text-sm"
            >
              <p class="font-medium">{{ authority.label }}</p>
              <p class="break-words text-muted-foreground">{{ authority.detail }}</p>
            </li>
          </ul>

          <div v-if="deletionPlan.filesystem" class="space-y-3 rounded-md border border-destructive/40 p-3">
            <p class="text-sm font-medium">
              Files in “{{ deletionPlan.filesystem.directoryName }}”
            </p>
            <p v-if="deletionPlan.filesystem.fileNames.length === 0" class="text-sm text-muted-foreground">
              No managed nota files were found. Unrelated files will remain untouched.
            </p>
            <ul v-else class="max-h-28 overflow-y-auto rounded bg-muted p-2 font-mono text-xs" aria-label="Filesystem files affected">
              <li v-for="fileName in deletionPlan.filesystem.fileNames" :key="fileName" class="break-all py-0.5">
                {{ fileName }}
              </li>
            </ul>
            <div class="flex items-start gap-3">
              <input
                id="authorize-filesystem-delete"
                v-model="filesystemAuthorized"
                type="checkbox"
                class="mt-0.5 h-4 w-4 shrink-0 rounded border-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
              <Label for="authorize-filesystem-delete" class="text-sm font-normal leading-5">
                I authorize BashNota to delete exactly these {{ deletionPlan.filesystem.fileNames.length }} managed files from “{{ deletionPlan.filesystem.directoryName }}”.
              </Label>
            </div>
          </div>

          <div v-if="!deletionReport" class="space-y-2">
            <Label for="delete-all-confirmation">Type <span class="font-mono font-semibold">{{ DELETE_CONFIRMATION }}</span> to continue</Label>
            <Input
              id="delete-all-confirmation"
              v-model="confirmationText"
              autocomplete="off"
              :disabled="isDeleting"
            />
          </div>

          <div v-else class="space-y-2" role="status" aria-live="polite">
            <p class="font-medium">
              {{ deletionReport.complete ? 'Every authority was cleared and verified.' : 'Deletion was only partially completed.' }}
            </p>
            <ul class="space-y-2 text-sm">
              <li v-for="result in deletionReport.results" :key="result.id" class="rounded border p-2">
                <span :class="result.status === 'cleared' ? 'text-green-700 dark:text-green-400' : 'text-destructive'" class="font-medium">
                  {{ result.status === 'cleared' ? 'Cleared' : 'Failed' }} — {{ result.label }}
                </span>
                <p class="break-words text-muted-foreground">{{ result.detail }}</p>
              </li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter class="gap-2 sm:gap-0">
          <Button v-if="!deletionReport" type="button" variant="outline" :disabled="isDeleting" @click="exportAllData">
            Export Nota Backup First
          </Button>
          <AlertDialogCancel :disabled="isDeleting">
            {{ deletionReport ? 'Close' : 'Cancel' }}
          </AlertDialogCancel>
          <Button
            v-if="!deletionReport"
            type="button"
            variant="destructive"
            :disabled="!deletionConfirmed || isDeleting"
            @click="clearAllData"
          >
            {{ isDeleting ? 'Deleting...' : 'Permanently Delete All Data' }}
          </Button>
          <Button v-else-if="deletionReport.complete" type="button" @click="reloadApplication">
            Reload BashNota
          </Button>
          <Button v-else type="button" variant="destructive" :disabled="isDeleting" @click="retryFailedDeletion">
            {{ isDeleting ? 'Retrying...' : 'Retry Failed Authorities' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
