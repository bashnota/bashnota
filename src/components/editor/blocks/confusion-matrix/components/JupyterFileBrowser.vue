<template>
  <div class="jupyter-file-browser">
    <!-- Server Selection -->
    <div class="server-section">
      <div class="section-header">
        <h4 class="section-title">Jupyter Servers</h4>
        <button 
          @click="openJupyterSidebar" 
          class="manage-servers-button"
          title="Manage servers in sidebar"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
          </svg>
          Manage
        </button>
      </div>
      
      <!-- No servers state -->
      <div v-if="!hasServers" class="empty-state">
        <div class="empty-icon">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path>
          </svg>
        </div>
        <h5 class="empty-title">No Jupyter Servers Available</h5>
        <p class="empty-description">
          Add a Jupyter server to browse and load CSV files from your Jupyter environment.
        </p>
        <button @click="openJupyterSidebar" class="add-server-cta">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Jupyter Server
        </button>
      </div>

      <!-- Server List -->
      <div v-else class="server-list">
        <div
          v-for="server in availableServers"
          :key="createServerKey(server)"
          :class="[
            'server-item',
            {
              'selected': selectedServer && createServerKey(selectedServer) === createServerKey(server),
              'connected': getConnectionStatus(server) === 'connected',
              'connecting': getConnectionStatus(server) === 'connecting'
            }
          ]"
          @click="selectServer(server)"
        >
          <div class="server-info">
            <div class="server-name">{{ getServerDisplayName(server) }}</div>
            <div class="server-url">{{ getServerDisplayUrl(server) }}</div>
          </div>
          <div class="server-status">
            <div v-if="getConnectionStatus(server) === 'connected'" class="status-indicator connected">
              <div class="status-dot"></div>
              <span>Connected</span>
            </div>
            <div v-else-if="getConnectionStatus(server) === 'connecting'" class="status-indicator connecting">
              <div class="spinner-small"></div>
              <span>Connecting</span>
            </div>
            <div v-else class="status-indicator disconnected">
              <div class="status-dot"></div>
              <span>Disconnected</span>
            </div>
          </div>
          <div class="server-actions">
            <button
              @click.stop="testConnection(server)"
              :disabled="getConnectionStatus(server) === 'connecting'"
              class="test-button"
            >
              Test
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- File Browser -->
    <div v-if="selectedServer && getConnectionStatus(selectedServer) === 'connected'" class="file-browser-section">
      <h4 class="section-title">Browse Files</h4>
      
      <!-- Navigation -->
      <div class="navigation">
        <div class="path-breadcrumb">
          <button
            v-for="(segment, index) in pathSegments"
            :key="index"
            @click="navigateToPath(getPathFromSegments(index + 1))"
            class="breadcrumb-item"
          >
            {{ segment || 'Home' }}
          </button>
        </div>
        <button @click="refreshDirectory" class="refresh-button" :disabled="isLoading">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading files...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="browserError" class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-message">{{ browserError }}</div>
        <button @click="refreshDirectory" class="retry-button">Retry</button>
      </div>

      <!-- File List -->
      <div v-else-if="currentDirectory" class="file-list">
        <div v-if="filteredFiles.length === 0" class="empty-directory">
          <p>No CSV files found in this directory</p>
        </div>

        <div
          v-for="file in filteredFiles"
          :key="file.path"
          :class="[
            'file-item',
            {
              'selected': selectedFile?.path === file.path,
              'directory': file.type === 'directory'
            }
          ]"
          @click="handleFileClick(file)"
          @dblclick="handleFileDoubleClick(file)"
        >
          <div class="file-icon">
            <svg v-if="file.type === 'directory'" class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
            </svg>
            <svg v-else class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div v-if="file.type === 'file'" class="file-details">
              <span v-if="file.size">{{ formatFileSize(file.size) }}</span>
              <span v-if="file.lastModified">{{ formatDate(file.lastModified) }}</span>
            </div>
          </div>
          <div v-if="file.type === 'file'" class="file-actions">
            <button
              @click.stop="selectFile(file)"
              class="select-button"
              :disabled="isLoadingFile"
            >
              {{ selectedFile?.path === file.path ? 'Selected' : 'Select' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected File Preview -->
    <div v-if="selectedFile && fileContent" class="file-preview-section">
      <h4 class="section-title">File Preview</h4>
      <div class="preview-container">
        <div class="preview-info">
          <div class="info-row">
            <span class="info-label">File:</span>
            <span class="info-value">{{ selectedFile.name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Path:</span>
            <span class="info-value">{{ selectedFile.path }}</span>
          </div>
          <div v-if="parsedData" class="info-row">
            <span class="info-label">Matrix Size:</span>
            <span class="info-value">{{ parsedData.matrix.length }}×{{ parsedData.matrix[0]?.length || 0 }}</span>
          </div>
        </div>

        <!-- Content Preview -->
        <div class="content-preview">
          <h5 class="preview-subtitle">Raw Content (first 10 lines)</h5>
          <pre class="content-text">{{ previewText }}</pre>
        </div>

        <!-- Use File Button -->
        <div class="file-actions-final">
          <button
            @click="useFile"
            :disabled="!parsedData || isLoadingFile"
            class="use-file-button"
          >
            Use This File
          </button>
          <button @click="clearSelection" class="clear-button">
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useJupyterStore } from '@/stores/jupyterStore'
import { jupyterService } from '../services/jupyterService'
import type { JupyterServer, JupyterFile, JupyterDirectory } from '@/types/jupyter'
import { parseConfusionMatrixCSV, validateConfusionMatrix, type ConfusionMatrixData } from '../utils/confusionMatrixUtils'

interface Emits {
  (e: 'file-selected', data: ConfusionMatrixData & { filePath: string }): void
  (e: 'error', error: string): void
  (e: 'open-jupyter-sidebar'): void
}

const emit = defineEmits<Emits>()

// Store
const jupyterStore = useJupyterStore()

// Reactive state
const selectedServer = ref<JupyterServer | null>(null)
const currentDirectory = ref<JupyterDirectory | null>(null)
const selectedFile = ref<JupyterFile | null>(null)
const fileContent = ref<string>('')
const parsedData = ref<ConfusionMatrixData | null>(null)
const currentPath = ref<string>('')
const isLoading = ref(false)
const isLoadingFile = ref(false)
const browserError = ref<string>('')
const connectionStatuses = ref<Record<string, 'connected' | 'disconnected' | 'connecting'>>({})

// Computed properties
const availableServers = computed(() => jupyterStore.jupyterServers)
const hasServers = computed(() => availableServers.value.length > 0)

const pathSegments = computed(() => {
  return currentPath.value.split('/').filter(Boolean)
})

const filteredFiles = computed(() => {
  if (!currentDirectory.value) return []
  
  return jupyterService.filterCSVFiles(currentDirectory.value.files)
    .sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
})

const previewText = computed(() => {
  if (!fileContent.value) return ''
  return fileContent.value.split('\n').slice(0, 10).join('\n')
})

// Utility functions
function createServerKey(server: JupyterServer): string {
  return `${server.ip}:${server.port}`
}

function getServerDisplayName(server: JupyterServer): string {
  return server.name || `Jupyter Server (${server.ip}:${server.port})`
}

function getServerDisplayUrl(server: JupyterServer): string {
  const protocol = server.ip.startsWith('http') ? '' : 'http://'
  return `${protocol}${server.ip}:${server.port}`
}

function getConnectionStatus(server: JupyterServer): 'connected' | 'disconnected' | 'connecting' {
  const key = createServerKey(server)
  return connectionStatuses.value[key] || 'disconnected'
}

function setConnectionStatus(server: JupyterServer, status: 'connected' | 'disconnected' | 'connecting') {
  const key = createServerKey(server)
  connectionStatuses.value[key] = status
}

// Server operations
async function testConnection(server: JupyterServer) {
  try {
    setConnectionStatus(server, 'connecting')
    const result = await jupyterService.testConnection(server)
    setConnectionStatus(server, result.success ? 'connected' : 'disconnected')
    
    if (!result.success) {
      emit('error', `Connection failed: ${result.message}`)
    }
  } catch (error) {
    setConnectionStatus(server, 'disconnected')
    emit('error', error instanceof Error ? error.message : 'Connection test failed')
  }
}

async function selectServer(server: JupyterServer) {
  const currentStatus = getConnectionStatus(server)
  
  if (currentStatus !== 'connected') {
    await testConnection(server)
    
    // Check if connection was successful
    if (getConnectionStatus(server) !== 'connected') {
      return
    }
  }
  
  selectedServer.value = server
  await navigateToPath('')
}

function openJupyterSidebar() {
  emit('open-jupyter-sidebar')
}

// File navigation methods
function getPathFromSegments(endIndex: number): string {
  return pathSegments.value.slice(0, endIndex).join('/')
}

async function navigateToPath(path: string) {
  if (!selectedServer.value) return
  
  isLoading.value = true
  browserError.value = ''
  
  try {
    // Direct API call using the JupyterServer object
    const encodedPath = encodeURIComponent(path)
    const baseUrl = selectedServer.value.ip.startsWith('http') 
      ? `${selectedServer.value.ip}:${selectedServer.value.port}`
      : `http://${selectedServer.value.ip}:${selectedServer.value.port}`
    
    const url = selectedServer.value.token 
      ? `${baseUrl}/api/contents/${encodedPath}?token=${selectedServer.value.token}`
      : `${baseUrl}/api/contents/${encodedPath}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors'
    })

    if (!response.ok) {
      throw new Error(`Failed to browse directory: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.type !== 'directory') {
      throw new Error('Path is not a directory')
    }

    const files: JupyterFile[] = data.content.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type,
      size: item.size,
      lastModified: item.last_modified,
    }))

    currentDirectory.value = {
      path: data.path,
      files,
    }
    currentPath.value = path
  } catch (error) {
    browserError.value = error instanceof Error ? error.message : 'Failed to load directory'
  } finally {
    isLoading.value = false
  }
}

async function refreshDirectory() {
  if (selectedServer.value) {
    await navigateToPath(currentPath.value)
  }
}

function handleFileClick(file: JupyterFile) {
  if (file.type === 'file') {
    if (selectedFile.value?.path !== file.path) {
      selectedFile.value = file
      loadFileContent(file)
    }
  }
}

function handleFileDoubleClick(file: JupyterFile) {
  if (file.type === 'directory') {
    navigateToPath(file.path)
  } else {
    selectFile(file)
  }
}

async function loadFileContent(file: JupyterFile) {
  if (!selectedServer.value) return
  
  isLoadingFile.value = true
  
  try {
    // Direct API call using the JupyterServer object
    const encodedPath = encodeURIComponent(file.path)
    const baseUrl = selectedServer.value.ip.startsWith('http') 
      ? `${selectedServer.value.ip}:${selectedServer.value.port}`
      : `http://${selectedServer.value.ip}:${selectedServer.value.port}`
    
    const url = selectedServer.value.token 
      ? `${baseUrl}/api/contents/${encodedPath}?token=${selectedServer.value.token}`
      : `${baseUrl}/api/contents/${encodedPath}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors'
    })

    if (!response.ok) {
      throw new Error(`Failed to get file content: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.type !== 'file') {
      throw new Error('Path is not a file')
    }

    // Jupyter returns base64 encoded content for binary files
    if (data.format === 'base64') {
      fileContent.value = atob(data.content)
    } else {
      fileContent.value = data.content || ''
    }
    
    // Try to parse as confusion matrix
    try {
      const data = parseConfusionMatrixCSV(fileContent.value)
      const validationErrors = validateConfusionMatrix(data.matrix, data.labels)
      
      if (validationErrors.length > 0) {
        throw new Error(`Invalid confusion matrix: ${validationErrors[0]}`)
      }
      
      parsedData.value = data
    } catch (parseError) {
      parsedData.value = null
      console.warn('Failed to parse as confusion matrix:', parseError)
    }
  } catch (error) {
    fileContent.value = ''
    parsedData.value = null
    emit('error', error instanceof Error ? error.message : 'Failed to load file')
  } finally {
    isLoadingFile.value = false
  }
}

function selectFile(file: JupyterFile) {
  selectedFile.value = file
  loadFileContent(file)
}

function useFile() {
  if (!selectedFile.value || !parsedData.value) return
  
  emit('file-selected', {
    ...parsedData.value,
    filePath: selectedFile.value.path
  })
}

function clearSelection() {
  selectedFile.value = null
  fileContent.value = ''
  parsedData.value = null
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
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
onMounted(async () => {
  // Servers are automatically loaded from the store
  // Test connections for existing servers
  for (const server of availableServers.value) {
    try {
      const result = await jupyterService.testConnection(server)
      setConnectionStatus(server, result.success ? 'connected' : 'disconnected')
    } catch (error) {
      setConnectionStatus(server, 'disconnected')
    }
  }
})
</script>

<style scoped>
.jupyter-file-browser {
  @apply space-y-6;
}

.section-title {
  @apply text-lg font-semibold text-gray-900 mb-3;
}

.server-section {
  @apply space-y-4;
}

.section-header {
  @apply flex items-center justify-between;
}

.manage-servers-button {
  @apply p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.server-list {
  @apply space-y-2;
}

.empty-state {
  @apply text-center py-8;
}

.empty-icon {
  @apply text-4xl mb-4;
}

.empty-title {
  @apply text-lg font-semibold text-gray-900 mb-2;
}

.empty-description {
  @apply text-gray-500;
}

.add-server-cta {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors;
}

.server-item {
  @apply flex items-center gap-4 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors;
}

.server-item.selected {
  @apply border-blue-500 bg-blue-50;
}

.server-item.connected {
  @apply border-green-200 bg-green-50;
}

.server-info {
  @apply flex-1;
}

.server-name {
  @apply font-medium text-gray-900;
}

.server-url {
  @apply text-sm text-gray-500;
}

.server-status {
  @apply flex-shrink-0;
}

.status-indicator {
  @apply flex items-center gap-2 text-sm;
}

.status-indicator.connected {
  @apply text-green-600;
}

.status-indicator.connecting {
  @apply text-blue-600;
}

.status-indicator.disconnected {
  @apply text-gray-500;
}

.status-dot {
  @apply w-2 h-2 rounded-full;
}

.status-indicator.connected .status-dot {
  @apply bg-green-500;
}

.status-indicator.disconnected .status-dot {
  @apply bg-gray-400;
}

.spinner-small {
  @apply w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin;
}

.server-actions {
  @apply flex gap-2;
}

.test-button {
  @apply px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors;
}

.file-browser-section {
  @apply space-y-4;
}

.navigation {
  @apply flex items-center justify-between;
}

.path-breadcrumb {
  @apply flex items-center gap-1;
}

.breadcrumb-item {
  @apply px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors;
}

.breadcrumb-item:not(:last-child)::after {
  content: '/';
  @apply ml-1 text-gray-400;
}

.refresh-button {
  @apply p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.loading-state {
  @apply flex items-center justify-center gap-3 py-8 text-gray-600;
}

.spinner {
  @apply w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin;
}

.error-state {
  @apply text-center py-8 space-y-4;
}

.error-icon {
  @apply text-4xl;
}

.error-message {
  @apply text-red-600;
}

.retry-button {
  @apply px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors;
}

.file-list {
  @apply space-y-1;
}

.empty-directory {
  @apply text-center py-8 text-gray-500;
}

.file-item {
  @apply flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors;
}

.file-item.selected {
  @apply bg-blue-50 border border-blue-200;
}

.file-item.directory:hover {
  @apply bg-blue-50;
}

.file-icon {
  @apply flex-shrink-0;
}

.file-info {
  @apply flex-1 min-w-0;
}

.file-name {
  @apply font-medium text-gray-900 truncate;
}

.file-details {
  @apply text-sm text-gray-500 space-x-2;
}

.file-actions {
  @apply flex-shrink-0;
}

.select-button {
  @apply px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors;
}

.file-preview-section {
  @apply space-y-4;
}

.preview-container {
  @apply bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4;
}

.preview-info {
  @apply space-y-2;
}

.info-row {
  @apply flex;
}

.info-label {
  @apply text-sm font-medium text-gray-500 w-20;
}

.info-value {
  @apply text-sm text-gray-900 flex-1 truncate;
}

.content-preview {
  @apply space-y-2;
}

.preview-subtitle {
  @apply text-sm font-medium text-gray-700;
}

.content-text {
  @apply text-xs font-mono bg-white border border-gray-200 rounded p-3 max-h-40 overflow-auto;
}

.file-actions-final {
  @apply flex gap-3;
}

.use-file-button {
  @apply px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors;
}

.clear-button {
  @apply px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors;
}
</style> 