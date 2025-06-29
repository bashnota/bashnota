<template>
  <Card class="w-full">
    <CardContent class="p-6 space-y-6">
      <!-- Server Selection -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-lg font-semibold flex items-center gap-2">
            <Server class="w-5 h-5 text-primary" />
            Jupyter Servers
          </h4>
          <Button
            @click="openJupyterSidebar"
            variant="outline"
            size="sm"
          >
            <Settings class="w-4 h-4 mr-2" />
            Manage
          </Button>
        </div>
        
        <!-- No servers state -->
        <div v-if="!hasServers" class="text-center p-8 bg-muted/30 rounded-lg border border-dashed">
          <div class="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
            <Server class="w-8 h-8 text-muted-foreground" />
          </div>
          <h5 class="text-lg font-semibold mb-2">No Jupyter Servers Available</h5>
          <p class="text-muted-foreground mb-4">
            Add a Jupyter server to browse and load CSV files from your Jupyter environment.
          </p>
          <Button @click="openJupyterSidebar">
            <Plus class="w-4 h-4 mr-2" />
            Add Jupyter Server
          </Button>
        </div>

        <!-- Server List -->
        <div v-else class="space-y-2">
          <ServerCard
            v-for="server in servers"
            :key="createServerKey(server)"
            :server="server"
            :selected="!!selectedServer && createServerKey(selectedServer) === createServerKey(server)"
            :connection-status="getConnectionStatus(server)"
            @select="selectServer"
            @test="testConnection"
          />
        </div>
      </div>

      <!-- File Browser -->
      <div v-if="selectedServer && getConnectionStatus(selectedServer) === 'connected'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-lg font-semibold flex items-center gap-2">
            <FolderOpen class="w-5 h-5 text-primary" />
            Browse Files
          </h4>
          <Button @click="refreshDirectory" :disabled="isLoading" variant="outline" size="sm">
            <RotateCcw class="w-4 h-4" />
          </Button>
        </div>
        
        <!-- Navigation Breadcrumb -->
        <BreadcrumbNavigation
          :path-segments="pathSegments"
          @navigate="navigateToPath"
        />

        <!-- File List Container with Scroll -->
        <div class="border rounded-lg bg-background">
          <!-- Loading State -->
          <div v-if="isLoading" class="flex items-center justify-center p-8 text-muted-foreground">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
            <span>Loading files...</span>
          </div>

          <!-- Error State -->
          <Alert v-else-if="browserError" variant="destructive" class="m-4">
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription class="flex items-center justify-between">
              <span>{{ browserError }}</span>
              <Button @click="refreshDirectory" variant="ghost" size="sm">
                Retry
              </Button>
            </AlertDescription>
          </Alert>

          <!-- File List -->
          <div v-else-if="currentDirectory" class="max-h-96 overflow-y-auto">
            <!-- Empty State -->
            <div v-if="filteredFiles.length === 0" class="text-center p-8 text-muted-foreground">
              <FileX class="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>No CSV files found in this directory</p>
            </div>

            <!-- File List Header -->
            <div v-else class="sticky top-0 bg-muted/50 border-b px-4 py-2 text-sm font-medium text-muted-foreground">
              <div class="grid grid-cols-12 gap-4 items-center">
                <div class="col-span-6">Name</div>
                <div class="col-span-3">Size</div>
                <div class="col-span-2">Modified</div>
                <div class="col-span-1">Action</div>
              </div>
            </div>

            <!-- File Rows -->
            <FileRow
              v-for="file in filteredFiles"
              :key="file.path"
              :file="file"
              :selected="selectedFile?.path === file.path"
              :loading="isLoadingFile"
              @click="handleFileClick"
              @double-click="handleFileDoubleClick"
              @select="selectFile"
            />
          </div>
        </div>
      </div>

      <!-- Selected File Preview -->
      <FilePreview
        v-if="selectedFile && fileContent"
        :file="selectedFile"
        :content="fileContent"
        :parsed-data="parsedData"
        :preview-text="previewText"
        :loading="isLoadingFile"
        @use-file="useFile"
      />
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Card,
  CardContent,
} from '@/ui/card'
import {
  Button
} from '@/ui/button'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/ui/alert'
import {
  Server,
  Settings,
  Plus,
  FolderOpen,
  RotateCcw,
  AlertCircle,
  FileX
} from 'lucide-vue-next'
import { parseConfusionMatrixCSV, validateConfusionMatrix, type ConfusionMatrixData } from '@/features/editor/components/blocks/confusion-matrix/utils/confusionMatrixUtils'
import { useJupyterServers } from '@/features/jupyter/composables/useJupyterServers'
import { JupyterService } from '@/features/jupyter/services/jupyterService'
import type { JupyterServer, JupyterFile, JupyterDirectory } from '@/features/jupyter/types/jupyter'

// Import modular components
import ServerCard from './ServerCard.vue'
import BreadcrumbNavigation from './BreadcrumbNavigation.vue'
import FileRow from './FileRow.vue'
import FilePreview from './FilePreview.vue'

interface Emits {
  (e: 'file-selected', data: ConfusionMatrixData & { filePath: string }): void
  (e: 'error', error: string): void
  (e: 'open-jupyter-sidebar'): void
}

const emit = defineEmits<Emits>()

// Use the same composable as the sidebar
const {
  servers,
  hasServers,
  testConnection: testServerConnection,
  getTestResultForServer,
  createServerKey
} = useJupyterServers({
  autoLoadKernels: false,
  showToasts: false
})

// Create a separate service instance for file operations
const jupyterService = new JupyterService()

// Reactive state
const selectedServer = ref<JupyterServer | null>(null)
const currentDirectory = ref<JupyterDirectory | null>(null)
const currentPath = ref('')
const selectedFile = ref<JupyterFile | null>(null)
const fileContent = ref<string>('')
const parsedData = ref<ConfusionMatrixData | null>(null)
const isLoading = ref(false)
const isLoadingFile = ref(false)
const browserError = ref('')

// Computed properties
const pathSegments = computed(() => {
  if (!currentPath.value) return ['']
  return currentPath.value.split('/').filter(Boolean)
})

const filteredFiles = computed(() => {
  if (!currentDirectory.value) return []
  return currentDirectory.value.files
})

const previewText = computed(() => {
  if (!fileContent.value) return ''
  const lines = fileContent.value.split('\n').slice(0, 10)
  return lines.join('\n')
})

// Methods
function getServerDisplayName(server: JupyterServer): string {
  return server.name || `${server.ip}:${server.port}`
}

function getServerDisplayUrl(server: JupyterServer): string {
  return `${server.ip}:${server.port}`
}

function getConnectionStatus(server: JupyterServer): 'connected' | 'connecting' | 'disconnected' {
  const testResult = getTestResultForServer(server)
  if (!testResult) return 'disconnected'
  return testResult.success ? 'connected' : 'disconnected'
}

async function selectServer(server: JupyterServer) {
  selectedServer.value = server
  currentPath.value = ''
  currentDirectory.value = null
  selectedFile.value = null
  fileContent.value = ''
  parsedData.value = null
  
  if (getConnectionStatus(server) === 'connected') {
    await loadDirectory('')
  } else {
    await testConnection(server)
  }
}

async function testConnection(server: JupyterServer) {
  try {
    const result = await testServerConnection(server)
    if (result.success) {
      await loadDirectory('')
    } else {
      emit('error', `Failed to connect to ${getServerDisplayName(server)}: ${result.message}`)
    }
  } catch (error) {
    emit('error', `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function loadDirectory(path: string) {
  if (!selectedServer.value) return
  
  isLoading.value = true
  browserError.value = ''
  
  try {
    const directory = await jupyterService.browseDirectoryDirect(selectedServer.value, path)
    
    // Filter for CSV files and directories using service method
    const filteredFiles = jupyterService.filterCSVFiles(directory.files)
    
    currentDirectory.value = { 
      path: directory.path, 
      files: filteredFiles 
    }
    currentPath.value = path
  } catch (error) {
    browserError.value = error instanceof Error ? error.message : 'Failed to load directory'
    emit('error', browserError.value)
  } finally {
    isLoading.value = false
  }
}

function getPathFromSegments(endIndex: number): string {
  return pathSegments.value.slice(0, endIndex).join('/')
}

function navigateToPath(path: string) {
  loadDirectory(path)
}

function refreshDirectory() {
  if (selectedServer.value && getConnectionStatus(selectedServer.value) === 'connected') {
    loadDirectory(currentPath.value)
  }
}

function handleFileClick(file: JupyterFile) {
  if (file.type === 'file') {
    selectFile(file)
  }
}

function handleFileDoubleClick(file: JupyterFile) {
  if (file.type === 'directory') {
    loadDirectory(file.path)
  } else {
    selectFile(file)
  }
}

async function selectFile(file: JupyterFile) {
  if (file.type !== 'file' || !selectedServer.value) return
  
  selectedFile.value = file
  isLoadingFile.value = true
  fileContent.value = ''
  parsedData.value = null
  
  try {
    const content = await jupyterService.getFileContentDirect(selectedServer.value, file.path)
    fileContent.value = content
    
    // Try to parse as confusion matrix
    try {
      const parsedMatrix = parseConfusionMatrixCSV(content)
      const errors = validateConfusionMatrix(parsedMatrix.matrix, parsedMatrix.labels)
      
      if (errors.length === 0) {
        parsedData.value = parsedMatrix
      } else {
        emit('error', `Invalid confusion matrix: ${errors[0]}`)
      }
    } catch (parseError) {
      emit('error', `Failed to parse CSV: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }
    
  } catch (error) {
    emit('error', `Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    isLoadingFile.value = false
  }
}

function useFile() {
  if (!selectedFile.value || !parsedData.value) return
  
  emit('file-selected', {
    ...parsedData.value,
    filePath: selectedFile.value.path
  })
}

function openJupyterSidebar() {
  emit('open-jupyter-sidebar')
}

// Lifecycle
onMounted(() => {
  // Servers are now loaded through the useJupyterServers composable
})
</script> 







