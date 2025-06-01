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
          <Card
            v-for="server in servers"
            :key="createServerKey(server)"
            :class="[
              'cursor-pointer transition-all hover:shadow-md',
              {
                'border-primary ring-2 ring-primary/20': selectedServer && createServerKey(selectedServer) === createServerKey(server),
                'border-green-500 bg-green-50 dark:bg-green-950/20': getConnectionStatus(server) === 'connected',
                'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20': getConnectionStatus(server) === 'connecting'
              }
            ]"
            @click="selectServer(server)"
          >
            <CardContent class="p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="font-medium">{{ getServerDisplayName(server) }}</div>
                  <div class="text-sm text-muted-foreground">{{ getServerDisplayUrl(server) }}</div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-2">
                    <div v-if="getConnectionStatus(server) === 'connected'" class="flex items-center gap-1 text-green-600">
                      <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span class="text-xs font-medium">Connected</span>
                    </div>
                    <div v-else-if="getConnectionStatus(server) === 'connecting'" class="flex items-center gap-1 text-yellow-600">
                      <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span class="text-xs font-medium">Connecting</span>
                    </div>
                    <div v-else class="flex items-center gap-1 text-gray-400">
                      <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span class="text-xs font-medium">Disconnected</span>
                    </div>
                  </div>
                  <Button
                    @click.stop="testConnection(server)"
                    :disabled="getConnectionStatus(server) === 'connecting'"
                    variant="outline"
                    size="sm"
                  >
                    Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
        
        <!-- Navigation -->
        <div class="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
          <Home class="w-4 h-4 text-muted-foreground" />
          <div class="flex items-center gap-1 text-sm">
            <Button
              v-for="(segment, index) in pathSegments"
              :key="index"
              @click="navigateToPath(getPathFromSegments(index + 1))"
              variant="ghost"
              size="sm"
              class="h-auto p-1 text-xs"
            >
              {{ segment || 'Home' }}
            </Button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center p-8 text-muted-foreground">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
          <span>Loading files...</span>
        </div>

        <!-- Error State -->
        <Alert v-else-if="browserError" variant="destructive">
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
        <div v-else-if="currentDirectory" class="space-y-2">
          <div v-if="filteredFiles.length === 0" class="text-center p-8 text-muted-foreground">
            <FileX class="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>No CSV files found in this directory</p>
          </div>

          <Card
            v-for="file in filteredFiles"
            :key="file.path"
            :class="[
              'cursor-pointer transition-all hover:shadow-sm',
              {
                'border-primary ring-2 ring-primary/20': selectedFile?.path === file.path,
                'hover:bg-muted/50': file.type === 'directory'
              }
            ]"
            @click="handleFileClick(file)"
            @dblclick="handleFileDoubleClick(file)"
          >
            <CardContent class="p-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 flex items-center justify-center rounded bg-muted/50">
                    <Folder v-if="file.type === 'directory'" class="w-4 h-4 text-blue-600" />
                    <FileText v-else class="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div class="font-medium text-sm">{{ file.name }}</div>
                    <div v-if="file.type === 'file'" class="text-xs text-muted-foreground flex gap-2">
                      <span v-if="file.size">{{ formatFileSize(file.size) }}</span>
                      <span v-if="file.lastModified">{{ formatDate(file.lastModified) }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="file.type === 'file'">
                  <Button
                    @click.stop="selectFile(file)"
                    :disabled="isLoadingFile"
                    variant="outline"
                    size="sm"
                  >
                    {{ selectedFile?.path === file.path ? 'Selected' : 'Select' }}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Selected File Preview -->
      <div v-if="selectedFile && fileContent" class="space-y-4">
        <h4 class="text-lg font-semibold flex items-center gap-2">
          <Eye class="w-5 h-5 text-primary" />
          File Preview
        </h4>
        
        <Card>
          <CardContent class="p-4 space-y-4">
            <div class="grid gap-3 text-sm">
              <div class="flex justify-between">
                <span class="font-medium">File:</span>
                <span class="text-muted-foreground">{{ selectedFile.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-medium">Path:</span>
                <span class="text-muted-foreground truncate ml-2">{{ selectedFile.path }}</span>
              </div>
              <div v-if="parsedData" class="flex justify-between">
                <span class="font-medium">Matrix Size:</span>
                <Badge variant="outline">{{ parsedData.matrix.length }}×{{ parsedData.matrix[0]?.length || 0 }}</Badge>
              </div>
            </div>

            <!-- Content Preview -->
            <div>
              <h5 class="font-medium mb-2 flex items-center gap-2">
                <Code class="w-4 h-4" />
                Raw Content (first 10 lines)
              </h5>
              <div class="bg-muted/30 rounded p-3 text-xs font-mono overflow-x-auto">
                <pre>{{ previewText }}</pre>
              </div>
            </div>

            <!-- Use File Button -->
            <div class="flex justify-end pt-2">
              <Button
                @click="useFile"
                :disabled="!parsedData || isLoadingFile"
                class="w-full sm:w-auto"
              >
                <CheckCircle class="w-4 h-4 mr-2" />
                Use This File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Button
} from '@/components/ui/button'
import {
  Badge
} from '@/components/ui/badge'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Server,
  Settings,
  Plus,
  FolderOpen,
  RotateCcw,
  Home,
  AlertCircle,
  FileX,
  Folder,
  FileText,
  Eye,
  Code,
  CheckCircle
} from 'lucide-vue-next'
import { parseConfusionMatrixCSV, validateConfusionMatrix, type ConfusionMatrixData } from '../utils/confusionMatrixUtils'
import { useJupyterServers } from '@/composables/useJupyterServers'
import { JupyterService } from '@/services/jupyterService'
import type { JupyterServer, JupyterFile, JupyterDirectory } from '@/types/jupyter'

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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return dateString
  }
}

// Lifecycle
onMounted(() => {
  // Servers are now loaded through the useJupyterServers composable
})
</script> 